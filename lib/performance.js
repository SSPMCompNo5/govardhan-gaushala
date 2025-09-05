/**
 * Performance monitoring and optimization utilities
 */
import { cache } from './redisCache.js';

export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.slowQueries = [];
  }

  /**
   * Start timing an operation
   * @param {string} operation - Operation name
   * @returns {Function} Stop function
   */
  startTimer(operation) {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.recordMetric(operation, duration);
      
      // Log slow operations
      if (duration > 1000) {
        this.slowQueries.push({
          operation,
          duration: Math.round(duration),
          timestamp: new Date().toISOString()
        });
        
        console.warn(`🐌 Slow operation: ${operation} took ${Math.round(duration)}ms`);
      }
      
      return duration;
    };
  }

  /**
   * Record a performance metric
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   */
  recordMetric(operation, duration) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        avgDuration: 0
      });
    }

    const metric = this.metrics.get(operation);
    metric.count++;
    metric.totalDuration += duration;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.avgDuration = metric.totalDuration / metric.count;
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance stats
   */
  getStats() {
    const stats = {};
    
    for (const [operation, metric] of this.metrics) {
      stats[operation] = {
        count: metric.count,
        avgDuration: Math.round(metric.avgDuration),
        minDuration: Math.round(metric.minDuration),
        maxDuration: Math.round(metric.maxDuration),
        totalDuration: Math.round(metric.totalDuration)
      };
    }

    return {
      operations: stats,
      slowQueries: this.slowQueries.slice(-10), // Last 10 slow queries
      summary: this.getSummary()
    };
  }

  /**
   * Get performance summary
   * @returns {Object} Summary stats
   */
  getSummary() {
    const allDurations = Array.from(this.metrics.values())
      .flatMap(metric => Array(metric.count).fill(metric.avgDuration));
    
    if (allDurations.length === 0) {
      return { totalOperations: 0, avgResponseTime: 0 };
    }

    const totalOperations = allDurations.length;
    const avgResponseTime = allDurations.reduce((sum, duration) => sum + duration, 0) / totalOperations;
    const slowOperations = this.slowQueries.length;

    return {
      totalOperations,
      avgResponseTime: Math.round(avgResponseTime),
      slowOperations,
      slowOperationRate: Math.round((slowOperations / totalOperations) * 100)
    };
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics.clear();
    this.slowQueries = [];
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Performance decorator for API routes
 * @param {string} operationName - Name of the operation
 * @param {Function} handler - API handler function
 * @returns {Function} Wrapped handler with performance monitoring
 */
export function withPerformanceMonitoring(operationName, handler) {
  return async (...args) => {
    const stopTimer = performanceMonitor.startTimer(operationName);
    
    try {
      const result = await handler(...args);
      stopTimer();
      return result;
    } catch (error) {
      stopTimer();
      throw error;
    }
  };
}

/**
 * Cache performance analyzer
 */
export class CacheAnalyzer {
  constructor() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.cacheErrors = 0;
  }

  /**
   * Record cache hit
   */
  recordHit() {
    this.cacheHits++;
  }

  /**
   * Record cache miss
   */
  recordMiss() {
    this.cacheMisses++;
  }

  /**
   * Record cache error
   */
  recordError() {
    this.cacheErrors++;
  }

  /**
   * Get cache hit rate
   * @returns {number} Hit rate percentage
   */
  getHitRate() {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? Math.round((this.cacheHits / total) * 100) : 0;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const total = this.cacheHits + this.cacheMisses;
    
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      errors: this.cacheErrors,
      total,
      hitRate: this.getHitRate(),
      missRate: total > 0 ? Math.round((this.cacheMisses / total) * 100) : 0
    };
  }

  /**
   * Reset cache statistics
   */
  reset() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.cacheErrors = 0;
  }
}

// Global cache analyzer instance
export const cacheAnalyzer = new CacheAnalyzer();

/**
 * Get comprehensive performance report
 * @returns {Promise<Object>} Complete performance report
 */
export async function getPerformanceReport() {
  const [performanceStats, cacheStats, redisStats] = await Promise.all([
    Promise.resolve(performanceMonitor.getStats()),
    Promise.resolve(cacheAnalyzer.getStats()),
    cache.getStats().catch(() => null)
  ]);

  return {
    performance: performanceStats,
    cache: cacheStats,
    redis: redisStats,
    timestamp: new Date().toISOString(),
    recommendations: getPerformanceRecommendations(performanceStats, cacheStats)
  };
}

/**
 * Get performance recommendations
 * @param {Object} performanceStats - Performance statistics
 * @param {Object} cacheStats - Cache statistics
 * @returns {Array} List of recommendations
 */
function getPerformanceRecommendations(performanceStats, cacheStats) {
  const recommendations = [];

  // Check average response time
  if (performanceStats.summary.avgResponseTime > 500) {
    recommendations.push({
      type: 'warning',
      message: 'Average response time is high. Consider adding more caching or optimizing database queries.',
      action: 'Add Redis caching to slow endpoints'
    });
  }

  // Check cache hit rate
  if (cacheStats.hitRate < 50) {
    recommendations.push({
      type: 'info',
      message: 'Cache hit rate is low. Consider increasing cache TTL or adding more cacheable endpoints.',
      action: 'Review cache strategy and TTL settings'
    });
  }

  // Check slow operations
  if (performanceStats.summary.slowOperations > 0) {
    recommendations.push({
      type: 'error',
      message: `${performanceStats.summary.slowOperations} slow operations detected.`,
      action: 'Optimize slow queries and add database indexes'
    });
  }

  // Check Redis connection
  if (!redisStats) {
    recommendations.push({
      type: 'warning',
      message: 'Redis is not available. Performance will be degraded.',
      action: 'Set up Redis for better performance'
    });
  }

  return recommendations;
}

export default performanceMonitor;
