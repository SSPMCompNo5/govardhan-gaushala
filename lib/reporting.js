import clientPromise from './mongo.js';
import { z } from 'zod';

// Report schemas
export const ReportFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  module: z.enum(['all', 'gate', 'food', 'goshala', 'doctor', 'admin']).optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().min(1).max(1000).default(100)
});

export const ReportConfigSchema = z.object({
  type: z.enum(['summary', 'detailed', 'analytics', 'export']),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
  includeCharts: z.boolean().default(true),
  groupBy: z.string().optional(),
  sortBy: z.string().default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Core reporting functions
export class ReportingService {
  constructor() {
    this.db = null;
  }

  async connect() {
    if (!this.db) {
      const client = await clientPromise;
      this.db = client.db(process.env.MONGODB_DB);
    }
    return this.db;
  }

  // Gate Logs Analytics
  async getGateAnalytics(filters = {}) {
    const db = await this.connect();
    const collection = db.collection('gateLogs');
    
    const pipeline = [
      {
        $match: {
          ...(filters.startDate && { createdAt: { $gte: new Date(filters.startDate) } }),
          ...(filters.endDate && { createdAt: { $lte: new Date(filters.endDate) } }),
          ...(filters.status && { status: filters.status })
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            type: "$type"
          },
          count: { $sum: 1 },
          totalVisitors: { $sum: { $cond: [{ $eq: ["$type", "entry"] }, "$visitorCount", 0] } }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          entries: { $sum: { $cond: [{ $eq: ["$_id.type", "entry"] }, "$count", 0] } },
          exits: { $sum: { $cond: [{ $eq: ["$_id.type", "exit"] }, "$count", 0] } },
          totalVisitors: { $sum: "$totalVisitors" }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const dailyStats = await collection.aggregate(pipeline).toArray();
    
    // Calculate totals
    const totals = await collection.aggregate([
      {
        $match: {
          ...(filters.startDate && { createdAt: { $gte: new Date(filters.startDate) } }),
          ...(filters.endDate && { createdAt: { $lte: new Date(filters.endDate) } })
        }
      },
      {
        $group: {
          _id: null,
          totalEntries: { $sum: { $cond: [{ $eq: ["$type", "entry"] }, 1, 0] } },
          totalExits: { $sum: { $cond: [{ $eq: ["$type", "exit"] }, 1, 0] } },
          totalVisitors: { $sum: { $cond: [{ $eq: ["$type", "entry"] }, "$visitorCount", 0] } },
          avgVisitorCount: { $avg: { $cond: [{ $eq: ["$type", "entry"] }, "$visitorCount", null] } }
        }
      }
    ]).toArray();

    return {
      dailyStats,
      totals: totals[0] || { totalEntries: 0, totalExits: 0, totalVisitors: 0, avgVisitorCount: 0 },
      period: { startDate: filters.startDate, endDate: filters.endDate }
    };
  }

  // Food Management Analytics
  async getFoodAnalytics(filters = {}) {
    const db = await this.connect();
    
    const [inventoryStats, feedingStats, scheduleStats] = await Promise.all([
      // Inventory analytics
      db.collection('foodInventory').aggregate([
        {
          $group: {
            _id: "$type",
            totalItems: { $sum: 1 },
            totalQuantity: { $sum: "$quantity" },
            totalValue: { $sum: { $multiply: ["$quantity", "$unitPrice"] } },
            lowStockItems: { $sum: { $cond: [{ $lte: ["$quantity", "$minThreshold"] }, 1, 0] } }
          }
        }
      ]).toArray(),
      
      // Feeding logs analytics
      db.collection('feedingLogs').aggregate([
        {
          $match: {
            ...(filters.startDate && { createdAt: { $gte: new Date(filters.startDate) } }),
            ...(filters.endDate && { createdAt: { $lte: new Date(filters.endDate) } })
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              type: "$type"
            },
            count: { $sum: 1 },
            totalQuantity: { $sum: "$quantity" }
          }
        },
        { $sort: { "_id.date": 1 } }
      ]).toArray(),
      
      // Schedule analytics
      db.collection('feedingSchedules').aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]).toArray()
    ]);

    return {
      inventory: inventoryStats,
      feeding: feedingStats,
      schedules: scheduleStats,
      period: { startDate: filters.startDate, endDate: filters.endDate }
    };
  }

  // Goshala Manager Analytics
  async getGoshalaAnalytics(filters = {}) {
    const db = await this.connect();
    
    const [cowStats, healthStats, staffStats] = await Promise.all([
      // Cow analytics
      db.collection('cows').aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            avgAge: { $avg: "$age" }
          }
        }
      ]).toArray(),
      
      // Health analytics
      db.collection('healthRecords').aggregate([
        {
          $match: {
            ...(filters.startDate && { createdAt: { $gte: new Date(filters.startDate) } }),
            ...(filters.endDate && { createdAt: { $lte: new Date(filters.endDate) } })
          }
        },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
            avgCost: { $avg: "$cost" }
          }
        }
      ]).toArray(),
      
      // Staff analytics
      db.collection('staff').aggregate([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
            avgSalary: { $avg: "$salary" }
          }
        }
      ]).toArray()
    ]);

    return {
      cows: cowStats,
      health: healthStats,
      staff: staffStats,
      period: { startDate: filters.startDate, endDate: filters.endDate }
    };
  }

  // Doctor Analytics
  async getDoctorAnalytics(filters = {}) {
    const db = await this.connect();
    
    const [treatmentStats, medicineStats, appointmentStats] = await Promise.all([
      // Treatment analytics
      db.collection('treatments').aggregate([
        {
          $match: {
            ...(filters.startDate && { createdAt: { $gte: new Date(filters.startDate) } }),
            ...(filters.endDate && { createdAt: { $lte: new Date(filters.endDate) } })
          }
        },
        {
          $group: {
            _id: "$outcome",
            count: { $sum: 1 },
            avgCost: { $avg: "$cost" }
          }
        }
      ]).toArray(),
      
      // Medicine analytics
      db.collection('medicines').aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            totalStock: { $sum: "$stock" },
            totalValue: { $sum: { $multiply: ["$stock", "$unitPrice"] } },
            expiringSoon: { $sum: { $cond: [{ $lte: ["$expiryDate", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)] }, 1, 0] } }
          }
        }
      ]).toArray(),
      
      // Appointment analytics
      db.collection('appointments').aggregate([
        {
          $match: {
            ...(filters.startDate && { scheduledDate: { $gte: new Date(filters.startDate) } }),
            ...(filters.endDate && { scheduledDate: { $lte: new Date(filters.endDate) } })
          }
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]).toArray()
    ]);

    return {
      treatments: treatmentStats,
      medicines: medicineStats,
      appointments: appointmentStats,
      period: { startDate: filters.startDate, endDate: filters.endDate }
    };
  }

  // System-wide Analytics
  async getSystemAnalytics(filters = {}) {
    const db = await this.connect();
    
    const [userStats, activityStats, performanceStats] = await Promise.all([
      // User analytics
      db.collection('users').aggregate([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
            activeUsers: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } }
          }
        }
      ]).toArray(),
      
      // Activity analytics
      db.collection('auditLogs').aggregate([
        {
          $match: {
            ...(filters.startDate && { createdAt: { $gte: new Date(filters.startDate) } }),
            ...(filters.endDate && { createdAt: { $lte: new Date(filters.endDate) } })
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              action: "$action"
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.date": 1 } }
      ]).toArray(),
      
      // Performance analytics
      db.collection('systemMetrics').aggregate([
        {
          $match: {
            ...(filters.startDate && { timestamp: { $gte: new Date(filters.startDate) } }),
            ...(filters.endDate && { timestamp: { $lte: new Date(filters.endDate) } })
          }
        },
        {
          $group: {
            _id: null,
            avgResponseTime: { $avg: "$responseTime" },
            avgMemoryUsage: { $avg: "$memoryUsage" },
            avgCpuUsage: { $avg: "$cpuUsage" },
            totalRequests: { $sum: "$requestCount" }
          }
        }
      ]).toArray()
    ]);

    return {
      users: userStats,
      activity: activityStats,
      performance: performanceStats[0] || { avgResponseTime: 0, avgMemoryUsage: 0, avgCpuUsage: 0, totalRequests: 0 },
      period: { startDate: filters.startDate, endDate: filters.endDate }
    };
  }

  // Generate comprehensive report
  async generateReport(filters = {}, config = {}) {
    const validatedFilters = ReportFiltersSchema.parse(filters);
    const validatedConfig = ReportConfigSchema.parse(config);

    const results = {};

    if (validatedFilters.module === 'all' || validatedFilters.module === 'gate') {
      results.gate = await this.getGateAnalytics(validatedFilters);
    }

    if (validatedFilters.module === 'all' || validatedFilters.module === 'food') {
      results.food = await this.getFoodAnalytics(validatedFilters);
    }

    if (validatedFilters.module === 'all' || validatedFilters.module === 'goshala') {
      results.goshala = await this.getGoshalaAnalytics(validatedFilters);
    }

    if (validatedFilters.module === 'all' || validatedFilters.module === 'doctor') {
      results.doctor = await this.getDoctorAnalytics(validatedFilters);
    }

    if (validatedFilters.module === 'all' || validatedFilters.module === 'admin') {
      results.system = await this.getSystemAnalytics(validatedFilters);
    }

    return {
      ...results,
      metadata: {
        generatedAt: new Date().toISOString(),
        filters: validatedFilters,
        config: validatedConfig,
        version: '1.0.0'
      }
    };
  }

  // Export report to different formats
  async exportReport(reportData, format = 'json') {
    switch (format) {
      case 'csv':
        return this.exportToCSV(reportData);
      case 'pdf':
        return this.exportToPDF(reportData);
      default:
        return reportData;
    }
  }

  async exportToCSV(reportData) {
    // Implementation for CSV export
    const csvData = [];
    
    // Flatten the report data for CSV
    Object.entries(reportData).forEach(([module, data]) => {
      if (module === 'metadata') return;
      
      Object.entries(data).forEach(([category, items]) => {
        if (Array.isArray(items)) {
          items.forEach(item => {
            csvData.push({
              module,
              category,
              ...item
            });
          });
        }
      });
    });

    return csvData;
  }

  async exportToPDF(reportData) {
    // Implementation for PDF export
    // This would use a PDF generation library like pdf-lib
    return {
      message: 'PDF export not yet implemented',
      data: reportData
    };
  }
}

export const reportingService = new ReportingService();
