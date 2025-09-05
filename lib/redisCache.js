/**
 * Redis-based caching system for high-performance API responses
 */
import { redis } from './redis.js';

export class RedisCache {
  constructor(defaultTTL = 300) {
    this.defaultTTL = defaultTTL;
    this.redis = redis;
  }

  /**
   * Get cached data from Redis
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached data or null
   */
  async get(key) {
    try {
      const cached = await this.redis.get(key);
      if (!cached) return null;
      
      return JSON.parse(cached);
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * Set data in Redis cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in seconds
   */
  async set(key, data, ttl = this.defaultTTL) {
    try {
      const serialized = JSON.stringify(data);
      await this.redis.setex(key, ttl, serialized);
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  /**
   * Delete a specific cache key
   * @param {string} key - Cache key to delete
   */
  async del(key) {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
    }
  }

  /**
   * Delete multiple cache keys by pattern
   * @param {string} pattern - Pattern to match keys (e.g., 'food:*')
   */
  async delPattern(pattern) {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Redis delPattern error:', error);
    }
  }

  /**
   * Check if Redis is connected
   * @returns {Promise<boolean>} Connection status
   */
  async isConnected() {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache stats
   */
  async getStats() {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      return { info, keyspace };
    } catch (error) {
      console.error('Redis stats error:', error);
      return null;
    }
  }
}

// Create cache instance
export const cache = new RedisCache();

// Cache key generators for different API endpoints
export const CacheKeys = {
  // Food management
  FOOD_INVENTORY: (params = {}) => `food:inventory:${JSON.stringify(params)}`,
  FOOD_SCHEDULE: (params = {}) => `food:schedule:${JSON.stringify(params)}`,
  FOOD_SUPPLIERS: (params = {}) => `food:suppliers:${JSON.stringify(params)}`,
  FOOD_LOGS: (params = {}) => `food:logs:${JSON.stringify(params)}`,
  
  // Goshala management
  COWS: (params = {}) => `cows:${JSON.stringify(params)}`,
  TREATMENTS: (params = {}) => `treatments:${JSON.stringify(params)}`,
  VACCINATIONS: (params = {}) => `vaccinations:${JSON.stringify(params)}`,
  
  // Staff management
  STAFF_SHIFTS: (params = {}) => `staff:shifts:${JSON.stringify(params)}`,
  STAFF_ATTENDANCE: (params = {}) => `staff:attendance:${JSON.stringify(params)}`,
  STAFF_TASKS: (params = {}) => `staff:tasks:${JSON.stringify(params)}`,
  
  // Gate logs
  GATE_LOGS: (params = {}) => `gate:logs:${JSON.stringify(params)}`,
  
  // Admin
  USERS: (params = {}) => `admin:users:${JSON.stringify(params)}`,
  REPORTS: (params = {}) => `admin:reports:${JSON.stringify(params)}`,
  PERFORMANCE: (params = {}) => `admin:performance:${JSON.stringify(params)}`,
};

// Cache invalidation patterns
export const CachePatterns = {
  FOOD_ALL: 'food:*',
  COWS_ALL: 'cows:*',
  STAFF_ALL: 'staff:*',
  GATE_ALL: 'gate:*',
  ADMIN_ALL: 'admin:*',
};

/**
 * Enhanced cache wrapper for API routes
 * @param {Object} request - Next.js request object
 * @param {Function} handler - API handler function
 * @param {string} cacheKey - Cache key generator
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise} Cached or fresh response
 */
export async function withRedisCache(request, handler, cacheKey, ttl = 300) {
  // Only cache GET requests
  if (request.method !== 'GET') {
    return await handler();
  }

  // Check if Redis is available
  const isConnected = await cache.isConnected();
  if (!isConnected) {
    console.warn('Redis not available, falling back to direct handler');
    return await handler();
  }

  try {
    // Generate cache key from request parameters
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const key = cacheKey(params);

    // Try to get from cache
    const cached = await cache.get(key);
    if (cached) {
      console.log(`Cache hit for key: ${key}`);
      // Ensure we return a proper NextResponse
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Cache miss - execute handler
    console.log(`Cache miss for key: ${key}`);
    const result = await handler();

    // Cache successful JSON responses by serializing the body only
    if (result && typeof result?.status === 'number' && result.status === 200) {
      try {
        // Clone and parse body as JSON; if it fails, skip caching
        const cloned = result.clone?.() || result;
        const body = await cloned.json?.();
        if (body !== undefined) {
          await cache.set(key, body, ttl);
        }
      } catch (e) {
        // Non-JSON response; skip caching
        console.warn('Skip caching non-JSON response for key:', key);
      }
    }

    return result;
  } catch (error) {
    console.error('Redis cache error:', error);
    // Fallback to direct handler on cache error
    return await handler();
  }
}

/**
 * Invalidate cache by pattern
 * @param {string|string[]} patterns - Pattern(s) to invalidate
 */
export async function invalidateCache(patterns) {
  const patternArray = Array.isArray(patterns) ? patterns : [patterns];
  
  try {
    const isConnected = await cache.isConnected();
    if (!isConnected) {
      console.warn('Redis not available for cache invalidation');
      return;
    }

    await Promise.all(
      patternArray.map(pattern => cache.delPattern(pattern))
    );
    
    console.log(`Cache invalidated for patterns: ${patternArray.join(', ')}`);
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}

/**
 * Warm up cache with frequently accessed data
 */
export async function warmupCache() {
  try {
    const isConnected = await cache.isConnected();
    if (!isConnected) {
      console.warn('Redis not available for cache warmup');
      return;
    }

    // Add your warmup logic here
    console.log('Cache warmup completed');
  } catch (error) {
    console.error('Cache warmup error:', error);
  }
}

export default cache;
