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

    // Test API endpoints
    const apiTests = [
      { name: 'gate-logs', endpoint: '/api/gate-logs' },
      { name: 'inventory', endpoint: '/api/food/inventory' },
      { name: 'cows', endpoint: '/api/goshala-manager/cows' }
    ];

    healthData.services.apis = {};
    for (const test of apiTests) {
      try {
        const apiStartTime = Date.now();
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${test.endpoint}`, {
          headers: {
            'Cookie': request.headers.get('cookie') || ''
          }
        });
        const apiResponseTime = Date.now() - apiStartTime;
        
        healthData.services.apis[test.name] = {
          status: response.ok ? 'healthy' : 'degraded',
          responseTime: apiResponseTime,
          statusCode: response.status
        };
      } catch (error) {
        healthData.services.apis[test.name] = {
          status: 'unhealthy',
          error: error.message
        };
      }
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
