# Redis Implementation Documentation

## Overview

This document provides a comprehensive overview of the Redis implementation in the Govardhan Goshala application. Redis is used for caching API responses, rate limiting, and other performance optimizations.

## Table of Contents

1. [Redis Configuration](#redis-configuration)
2. [Redis Connection Management](#redis-connection-management)
3. [Redis Caching System](#redis-caching-system)
4. [Cache Key Structure](#cache-key-structure)
5. [API Performance Optimization](#api-performance-optimization)
6. [In-Memory Cache Fallback](#in-memory-cache-fallback)
7. [Rate Limiting with Redis](#rate-limiting-with-redis)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)

## Redis Configuration

The Redis configuration is defined in `lib/redis.js`. The application uses the `ioredis` library for Redis connectivity.

```javascript
// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB) || 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  family: 4,
  keepAlive: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
  // Connection pool settings
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableOfflineQueue: false,
};
```

The configuration is designed to be flexible and can be customized through environment variables:

- `REDIS_HOST`: Redis server hostname (default: 'localhost')
- `REDIS_PORT`: Redis server port (default: 6379)
- `REDIS_PASSWORD`: Redis server password (if required)
- `REDIS_DB`: Redis database number (default: 0)

## Redis Connection Management

The Redis connection is managed as a singleton instance exported from `lib/redis.js`:

```javascript
// Create Redis instance
export const redis = new Redis(redisConfig);
```

The connection includes event handlers for various Redis events:

- `connect`: Triggered when the connection is established
- `ready`: Triggered when Redis is ready to accept commands
- `error`: Triggered when a connection error occurs
- `close`: Triggered when the connection is closed
- `reconnecting`: Triggered when Redis is attempting to reconnect

Graceful shutdown is implemented through process event handlers:

```javascript
// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down Redis connection...');
  await redis.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down Redis connection...');
  await redis.quit();
  process.exit(0);
});
```

This ensures that Redis connections are properly closed when the application is terminated.

## Redis Caching System

The Redis caching system is implemented in `lib/redisCache.js`. It provides a class-based interface for interacting with Redis for caching purposes:

```javascript
export class RedisCache {
  constructor(defaultTTL = 300) {
    this.defaultTTL = defaultTTL;
    this.redis = redis;
  }

  // Methods for get, set, del, delPattern, isConnected, getStats
}
```

The `RedisCache` class provides the following methods:

- `get(key)`: Retrieve cached data by key
- `set(key, data, ttl)`: Store data in cache with optional TTL
- `del(key)`: Delete a specific cache key
- `delPattern(pattern)`: Delete multiple cache keys by pattern
- `isConnected()`: Check if Redis is connected
- `getStats()`: Get cache statistics

## Cache Key Structure

The application uses a structured approach to cache key generation through the `CacheKeys` object:

```javascript
export const CacheKeys = {
  // Food management
  FOOD_INVENTORY: (params = {}) => `food:inventory:${JSON.stringify(params)}`,
  FOOD_SCHEDULE: (params = {}) => `food:schedule:${JSON.stringify(params)}`,
  // ... other key generators
};
```

This approach ensures consistent cache key generation across the application. Cache keys are structured as:

```
<domain>:<entity>:<serialized-params>
```

For example:

```
food:inventory:{"page":1,"limit":20,"search":"hay"}
```

## API Performance Optimization

API performance is optimized using the `withRedisCache` function, which wraps API handlers with Redis caching:

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

  // Try to get from cache or execute handler and cache result
  // ...
}
```

This function:

1. Only caches GET requests
2. Checks if Redis is available
3. Generates a cache key based on request parameters
4. Attempts to retrieve the response from cache
5. Falls back to the original handler if cache miss
6. Caches successful responses

## In-Memory Cache Fallback

The application includes an in-memory cache fallback in `lib/apiCache.js` for scenarios where Redis is not available:

```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCache(key) {
  const cached = cache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}
```

This provides a simple Map-based cache with automatic expiration.

## Rate Limiting with Redis

The application implements rate limiting with Redis integration in `lib/rateLimit.js`:

```javascript
async function redisRateCheck(key, windowMs, max) {
  const cfg = getRedisConfig();
  if (!cfg) return null;
  const windowSec = Math.ceil(windowMs / 1000);
  // INCR the key
  const incrRes = await fetch(`${cfg.url}/INCR/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}` },
  });
  // ... implementation details
}
```

The rate limiter supports both Redis-based (via Upstash REST API) and in-memory rate limiting, with automatic fallback to in-memory if Redis is not available.

## Monitoring and Maintenance

Redis monitoring is available through the `getStats` method in the `RedisCache` class:

```javascript
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
```

This provides information about Redis memory usage and keyspace statistics.

Cache invalidation is handled through the `invalidateCache` function:

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

This allows for targeted invalidation of cache entries based on patterns.

## Troubleshooting

The application includes a test endpoint at `/api/test-redis` for verifying Redis connectivity and functionality:

```javascript
// GET /api/test-redis - Test Redis connection (no auth required)
export async function GET(request) {
  try {
    console.log('🧪 Testing Redis connection...');
    
    // Test connection
    const isConnected = await cache.isConnected();
    console.log('✅ Redis connected:', isConnected);
    
    // ... test operations
    
    return NextResponse.json({
      success: true,
      message: 'Redis is working perfectly! 🎉',
      data: {
        connected: isConnected,
        testData: retrieved,
        cacheKey: cacheKey,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Redis test failed:', error);
    return NextResponse.json({
      success: false,
      message: 'Redis test failed',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
```

This endpoint can be used to verify that Redis is properly configured and functioning.