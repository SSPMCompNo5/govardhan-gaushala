import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';

const limitHealth = rateLimit({ windowMs: 60 * 1000, max: 60 }); // 60 requests per minute

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Owner/Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitHealth(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const startTime = Date.now();
    const healthData = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      services: {},
      performance: {},
      system: {}
    };

    // Test database connection
    try {
      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB);
      
      const dbStartTime = Date.now();
      await db.admin().ping();
      const dbResponseTime = Date.now() - dbStartTime;
      
      healthData.services.database = {
        status: 'healthy',
        responseTime: dbResponseTime,
        connection: 'active'
      };

      // Get database stats
      const stats = await db.stats();
      healthData.services.database.stats = {
        collections: stats.collections,
        dataSize: stats.dataSize,
        indexSize: stats.indexSize,
        storageSize: stats.storageSize
      };

    } catch (error) {
      healthData.services.database = {
        status: 'unhealthy',
        error: error.message
      };
      healthData.status = 'degraded';
    }

    // Test authentication service
    try {
      const authStartTime = Date.now();
      // Simple auth test - check if session is valid
      const authResponseTime = Date.now() - authStartTime;
      
      healthData.services.authentication = {
        status: 'healthy',
        responseTime: authResponseTime,
        sessionValid: !!session
      };
    } catch (error) {
      healthData.services.authentication = {
        status: 'unhealthy',
        error: error.message
      };
      healthData.status = 'degraded';
    }

    // Test database collections directly (faster than API calls)
    healthData.services.collections = {};
    try {
      const collections = ['gate_logs', 'foodInventory', 'cows'];
      for (const collectionName of collections) {
        const collStartTime = Date.now();
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments({}, { limit: 1 });
        const collResponseTime = Date.now() - collStartTime;
        
        healthData.services.collections[collectionName] = {
          status: 'healthy',
          responseTime: collResponseTime,
          accessible: true
        };
      }
    } catch (error) {
      healthData.services.collections = {
        status: 'unhealthy',
        error: error.message
      };
    }

    // Test Redis connection
    try {
      const redisStartTime = Date.now();
      const { redis } = await import('@/lib/redis');
      await redis.ping();
      const redisResponseTime = Date.now() - redisStartTime;
      
      healthData.services.redis = {
        status: 'healthy',
        responseTime: redisResponseTime,
        connection: 'active'
      };
    } catch (error) {
      healthData.services.redis = {
        status: 'unhealthy',
        error: error.message
      };
      healthData.status = 'degraded';
    }

    // System performance metrics
    const totalResponseTime = Date.now() - startTime;
    healthData.performance = {
      totalResponseTime,
      timestamp: new Date().toISOString()
    };

    // System information
    healthData.system = {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      environment: process.env.NODE_ENV
    };

    // Determine overall status
    const allServices = Object.values(healthData.services);
    const unhealthyServices = allServices.filter(service => 
      service.status === 'unhealthy'
    );
    
    if (unhealthyServices.length > 0) {
      healthData.status = 'unhealthy';
    } else if (allServices.some(service => service.status === 'degraded')) {
      healthData.status = 'degraded';
    }

    return NextResponse.json(healthData);

  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: error.message
    }, { status: 500 });
  }
}
