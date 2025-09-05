# Redis Caching System and API Performance Optimization

## Overview

This document details the Redis caching implementation in the Govardhan Goshala application, focusing on how it optimizes API performance. The caching system is designed to significantly reduce response times and database load.

## Table of Contents

1. [Caching Architecture](#caching-architecture)
2. [RedisCache Class](#rediscache-class)
3. [Cache Key Structure](#cache-key-structure)
4. [Cache Invalidation Patterns](#cache-invalidation-patterns)
5. [API Response Caching](#api-response-caching)
6. [Cache Warmup](#cache-warmup)
7. [Performance Metrics](#performance-metrics)
8. [Best Practices](#best-practices)

## Caching Architecture

The caching architecture is built on Redis, a high-performance in-memory data store. The implementation consists of:

1. **Redis Connection Layer**: Managed in `lib/redis.js`
2. **Caching Interface**: Implemented in `lib/redisCache.js`
3. **API Integration**: Through the `withRedisCache` function
4. **Cache Key Management**: Via the `CacheKeys` object
5. **Cache Invalidation**: Through the `invalidateCache` function

This layered approach provides flexibility and maintainability while ensuring optimal performance.

## RedisCache Class

The core of the caching system is the `RedisCache` class in `lib/redisCache.js`:

```javascript
export class RedisCache {
  constructor(defaultTTL = 300) {
    this.defaultTTL = defaultTTL;
    this.redis = redis;
  }

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

  async set(key, data, ttl = this.defaultTTL) {
    try {
      const serialized = JSON.stringify(data);
      await this.redis.setex(key, ttl, serialized);
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async del(key) {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
    }
  }

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

  async isConnected() {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

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
```

This class provides a clean interface for interacting with Redis, handling serialization, error handling, and connection management.

## Cache Key Structure

Cache keys are structured to ensure uniqueness and readability. The `CacheKeys` object provides functions for generating consistent cache keys:

```javascript
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
```

The key structure follows the pattern:

```
<domain>:<entity>:<serialized-params>
```

For example:

```
food:inventory:{"page":1,"limit":20,"search":"hay"}
```

This structure allows for:

1. **Domain Separation**: Different domains (food, cows, staff) have separate key spaces
2. **Entity Specificity**: Keys are specific to entities within domains
3. **Parameter Inclusion**: Query parameters are included in the key to ensure uniqueness

## Cache Invalidation Patterns

Cache invalidation is managed through patterns that match groups of related keys:

```javascript
export const CachePatterns = {
  FOOD_ALL: 'food:*',
  COWS_ALL: 'cows:*',
  STAFF_ALL: 'staff:*',
  GATE_ALL: 'gate:*',
  ADMIN_ALL: 'admin:*',
};
```

These patterns can be used with the `invalidateCache` function to clear specific sections of the cache:

```javascript
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
```

This approach allows for targeted invalidation of cache entries when data changes, ensuring that the cache remains consistent with the underlying data.

## API Response Caching

API response caching is implemented through the `withRedisCache` function:

```javascript
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
```

This function:

1. **Checks Request Method**: Only caches GET requests
2. **Verifies Redis Availability**: Falls back to direct handler if Redis is not available
3. **Generates Cache Key**: Uses the provided key generator function with request parameters
4. **Attempts Cache Retrieval**: Returns cached response if available
5. **Executes Handler on Cache Miss**: Calls the original handler function
6. **Caches Successful Responses**: Stores successful JSON responses in the cache
7. **Handles Errors Gracefully**: Falls back to direct handler on cache errors

## Cache Warmup

The application includes a cache warmup function to preload frequently accessed data:

```javascript
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
```

This function can be customized to preload specific data into the cache during application startup or at scheduled intervals.

## Performance Metrics

According to the documentation, Redis caching provides significant performance improvements:

### Before Redis (Database Queries)
- **Food Inventory API**: 200-500ms
- **Gate Logs API**: 300-800ms
- **Staff Management**: 150-400ms

### After Redis (Cached Responses)
- **Food Inventory API**: 10-50ms (90% faster)
- **Gate Logs API**: 15-80ms (85% faster)
- **Staff Management**: 5-30ms (95% faster)

These metrics demonstrate the substantial performance benefits of Redis caching.

## Best Practices

### Cache TTL (Time To Live) Strategy

The application uses a tiered TTL strategy based on data volatility:

- **Static Data**: 30 minutes (suppliers, settings)
- **Semi-Dynamic**: 10 minutes (inventory, schedules)
- **Dynamic Data**: 5 minutes (logs, attendance)
- **Real-time**: 1 minute (alerts, notifications)

### Cache Key Management

1. **Use Consistent Key Generation**: Always use the `CacheKeys` functions for key generation
2. **Include Relevant Parameters**: Ensure cache keys include all parameters that affect the response
3. **Avoid Overly Specific Keys**: Don't include parameters that don't affect the response

### Cache Invalidation

1. **Targeted Invalidation**: Use specific patterns to invalidate only relevant cache entries
2. **Invalidate on Write**: Clear cache entries when data is modified
3. **Batch Invalidation**: Group related invalidations to reduce Redis operations

### Error Handling

1. **Graceful Degradation**: Fall back to direct database access when Redis is unavailable
2. **Error Logging**: Log cache errors for monitoring and debugging
3. **Connection Monitoring**: Regularly check Redis connection status

### Monitoring

1. **Track Cache Hit Rate**: Monitor the ratio of cache hits to total requests
2. **Monitor Memory Usage**: Ensure Redis has sufficient memory for the cache
3. **Log Cache Operations**: Log cache hits, misses, and invalidations for analysis