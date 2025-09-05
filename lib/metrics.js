import clientPromise from './mongo.js';
import { z } from 'zod';

// Metrics schemas
export const SystemMetricsSchema = z.object({
  timestamp: z.date(),
  responseTime: z.number().min(0),
  memoryUsage: z.number().min(0),
  cpuUsage: z.number().min(0).max(100),
  requestCount: z.number().min(0),
  errorCount: z.number().min(0),
  activeConnections: z.number().min(0),
  databaseConnections: z.number().min(0),
  cacheHitRate: z.number().min(0).max(100),
  uptime: z.number().min(0)
});

export const PerformanceMetricsSchema = z.object({
  endpoint: z.string(),
  method: z.string(),
  responseTime: z.number().min(0),
  statusCode: z.number(),
  timestamp: z.date(),
  userId: z.string().optional(),
  userRole: z.string().optional(),
  requestSize: z.number().min(0).optional(),
  responseSize: z.number().min(0).optional()
});

// Metrics collection service
export class MetricsService {
  constructor() {
    this.db = null;
    this.metricsBuffer = [];
    this.bufferSize = 100;
    this.flushInterval = 30000; // 30 seconds
    this.startTime = Date.now();
  }

  async connect() {
    if (!this.db) {
      const client = await clientPromise;
      this.db = client.db(process.env.MONGODB_DB);
    }
    return this.db;
  }

  // Collect system metrics
  async collectSystemMetrics() {
    const db = await this.connect();
    
    try {
      // Get memory usage
      const memoryUsage = process.memoryUsage();
      const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
      
      // Get CPU usage (simplified)
      const cpuUsage = process.cpuUsage();
      const cpuUsagePercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
      
      // Get uptime
      const uptime = process.uptime();
      
      // Get database connection info
      const dbStats = await this.getDatabaseStats();
      
      const metrics = {
        timestamp: new Date(),
        responseTime: 0, // Will be set by individual requests
        memoryUsage: memoryUsageMB,
        cpuUsage: cpuUsagePercent,
        requestCount: 0, // Will be incremented by requests
        errorCount: 0, // Will be incremented by errors
        activeConnections: 0, // Will be tracked
        databaseConnections: dbStats.connections || 0,
        cacheHitRate: 0, // Will be calculated
        uptime: uptime
      };

      // Validate metrics
      const validatedMetrics = SystemMetricsSchema.parse(metrics);
      
      // Store in buffer
      this.metricsBuffer.push(validatedMetrics);
      
      // Flush if buffer is full
      if (this.metricsBuffer.length >= this.bufferSize) {
        await this.flushMetrics();
      }
      
      return validatedMetrics;
    } catch (error) {
      console.error('Error collecting system metrics:', error);
      throw error;
    }
  }

  // Collect performance metrics for a request
  async collectPerformanceMetrics(endpoint, method, responseTime, statusCode, userId, userRole, requestSize, responseSize) {
    const db = await this.connect();
    
    try {
      const metrics = {
        endpoint,
        method,
        responseTime,
        statusCode,
        timestamp: new Date(),
        userId,
        userRole,
        requestSize,
        responseSize
      };

      // Validate metrics
      const validatedMetrics = PerformanceMetricsSchema.parse(metrics);
      
      // Store in buffer
      this.metricsBuffer.push(validatedMetrics);
      
      // Flush if buffer is full
      if (this.metricsBuffer.length >= this.bufferSize) {
        await this.flushMetrics();
      }
      
      return validatedMetrics;
    } catch (error) {
      console.error('Error collecting performance metrics:', error);
      throw error;
    }
  }

  // Flush metrics buffer to database
  async flushMetrics() {
    if (this.metricsBuffer.length === 0) return;
    
    const db = await this.connect();
    
    try {
      // Insert system metrics
      const systemMetrics = this.metricsBuffer.filter(m => 'memoryUsage' in m);
      if (systemMetrics.length > 0) {
        await db.collection('systemMetrics').insertMany(systemMetrics);
      }
      
      // Insert performance metrics
      const performanceMetrics = this.metricsBuffer.filter(m => 'endpoint' in m);
      if (performanceMetrics.length > 0) {
        await db.collection('performanceMetrics').insertMany(performanceMetrics);
      }
      
      // Clear buffer
      this.metricsBuffer = [];
      
      console.log(`Flushed ${systemMetrics.length + performanceMetrics.length} metrics to database`);
    } catch (error) {
      console.error('Error flushing metrics:', error);
      throw error;
    }
  }

  // Get database statistics
  async getDatabaseStats() {
    const db = await this.connect();
    
    try {
      const stats = await db.stats();
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        connections: stats.connections || 0
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return {
        collections: 0,
        dataSize: 0,
        storageSize: 0,
        indexes: 0,
        connections: 0
      };
    }
  }

  // Get performance analytics
  async getPerformanceAnalytics(filters = {}) {
    const db = await this.connect();
    
    const pipeline = [
      {
        $match: {
          ...(filters.startDate && { timestamp: { $gte: new Date(filters.startDate) } }),
          ...(filters.endDate && { timestamp: { $lte: new Date(filters.endDate) } }),
          ...(filters.endpoint && { endpoint: { $regex: filters.endpoint, $options: 'i' } }),
          ...(filters.method && { method: filters.method }),
          ...(filters.statusCode && { statusCode: filters.statusCode })
        }
      },
      {
        $group: {
          _id: {
            endpoint: "$endpoint",
            method: "$method"
          },
          count: { $sum: 1 },
          avgResponseTime: { $avg: "$responseTime" },
          minResponseTime: { $min: "$responseTime" },
          maxResponseTime: { $max: "$responseTime" },
          totalResponseTime: { $sum: "$responseTime" },
          errorCount: { $sum: { $cond: [{ $gte: ["$statusCode", 400] }, 1, 0] } },
          avgRequestSize: { $avg: "$requestSize" },
          avgResponseSize: { $avg: "$responseSize" }
        }
      },
      {
        $addFields: {
          errorRate: { $multiply: [{ $divide: ["$errorCount", "$count"] }, 100] },
          throughput: { $divide: ["$count", 1] } // Requests per time period
        }
      },
      { $sort: { avgResponseTime: -1 } }
    ];

    return await db.collection('performanceMetrics').aggregate(pipeline).toArray();
  }

  // Get system health metrics
  async getSystemHealthMetrics(filters = {}) {
    const db = await this.connect();
    
    const pipeline = [
      {
        $match: {
          ...(filters.startDate && { timestamp: { $gte: new Date(filters.startDate) } }),
          ...(filters.endDate && { timestamp: { $lte: new Date(filters.endDate) } })
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            hour: { $hour: "$timestamp" }
          },
          avgMemoryUsage: { $avg: "$memoryUsage" },
          avgCpuUsage: { $avg: "$cpuUsage" },
          avgResponseTime: { $avg: "$responseTime" },
          totalRequests: { $sum: "$requestCount" },
          totalErrors: { $sum: "$errorCount" },
          avgUptime: { $avg: "$uptime" },
          avgDatabaseConnections: { $avg: "$databaseConnections" },
          avgCacheHitRate: { $avg: "$cacheHitRate" }
        }
      },
      { $sort: { "_id.date": 1, "_id.hour": 1 } }
    ];

    return await db.collection('systemMetrics').aggregate(pipeline).toArray();
  }

  // Get error analytics
  async getErrorAnalytics(filters = {}) {
    const db = await this.connect();
    
    const pipeline = [
      {
        $match: {
          ...(filters.startDate && { timestamp: { $gte: new Date(filters.startDate) } }),
          ...(filters.endDate && { timestamp: { $lte: new Date(filters.endDate) } }),
          statusCode: { $gte: 400 }
        }
      },
      {
        $group: {
          _id: {
            statusCode: "$statusCode",
            endpoint: "$endpoint"
          },
          count: { $sum: 1 },
          avgResponseTime: { $avg: "$responseTime" },
          lastOccurrence: { $max: "$timestamp" }
        }
      },
      { $sort: { count: -1 } }
    ];

    return await db.collection('performanceMetrics').aggregate(pipeline).toArray();
  }

  // Start automatic metrics collection
  startAutoCollection() {
    // Collect system metrics every 30 seconds
    setInterval(async () => {
      try {
        await this.collectSystemMetrics();
      } catch (error) {
        console.error('Error in auto metrics collection:', error);
      }
    }, this.flushInterval);

    // Flush metrics buffer every 5 minutes
    setInterval(async () => {
      try {
        await this.flushMetrics();
      } catch (error) {
        console.error('Error flushing metrics buffer:', error);
      }
    }, 5 * 60 * 1000);

    console.log('Auto metrics collection started');
  }

  // Stop automatic metrics collection
  stopAutoCollection() {
    // Clear all intervals
    if (this.autoCollectionInterval) {
      clearInterval(this.autoCollectionInterval);
    }
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    console.log('Auto metrics collection stopped');
  }
}

export const metricsService = new MetricsService();
