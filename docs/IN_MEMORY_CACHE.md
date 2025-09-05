# In-Memory API Cache Implementation

## Overview

This document details the in-memory caching system implemented in the Govardhan Goshala application. The in-memory cache serves as a fallback mechanism when Redis is unavailable and provides a lightweight caching solution for API responses.

## Table of Contents

1. [Implementation Details](#implementation-details)
2. [Cache Operations](#cache-operations)
3. [API Integration](#api-integration)
4. [Cache Key Generation](#cache-key-generation)
5. [Comparison with Redis Cache](#comparison-with-redis-cache)
6. [Best Practices](#best-practices)

## Implementation Details

The in-memory cache is implemented in `lib/apiCache.js` using JavaScript's native `Map` data structure:

```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

This implementation provides:

1. **Fast Access**: O(1) lookup time for cache entries
2. **Automatic Memory Management**: JavaScript's garbage collection handles memory management
3. **Simple Implementation**: No external dependencies required
4. **TTL Support**: Time-based expiration of cache entries

However, it has limitations:

1. **Process-Bound**: Cache is not shared across multiple server instances
2. **Memory Constraints**: Limited by available Node.js process memory
3. **No Persistence**: Cache is lost on server restart

## Cache Operations

The in-memory cache provides the following operations:

### Get Cache

```javascript
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

This function:
1. Retrieves the cached entry by key
2. Checks if the entry has expired
3. Deletes expired entries
4. Returns the cached data or null

### Set Cache

```javascript
export function setCache(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}
```

This function:
1. Stores data in the cache with the current timestamp
2. Overwrites any existing entry with the same key

### Clear Cache

```javascript
export function clearCache(key) {
  cache.delete(key);
}
```

This function removes a specific cache entry by key.

### Clear All Cache

```javascript
export function clearAllCache() {
  cache.clear();
}
```

This function removes all entries from the cache.

## API Integration

The in-memory cache is integrated with API handlers through the `withCache` function:

```javascript
export async function withCache(request, handler, ttl = 300) {
  const key = generateCacheKey(request);
  
  // Only cache GET requests
  if (request.method === 'GET') {
    const cached = getCache(key);
    if (cached) {
      return cached;
    }
  }
  
  // Call the original handler
  const result = await handler();
  
  // Cache the result if it's a successful GET response
  if (request.method === 'GET' && result && result.status === 200) {
    setCache(key, result);
  }
  
  return result;
}
```

This function:
1. Generates a cache key from the request
2. Only attempts to cache GET requests
3. Returns cached responses if available
4. Calls the original handler on cache miss
5. Caches successful responses

## Cache Key Generation

Cache keys are generated from request properties to ensure uniqueness:

```javascript
export function generateCacheKey(req) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  return `${req.method}:${url.pathname}${url.search}`;
}
```

This function creates a key that includes:
1. The HTTP method
2. The request path
3. The query string

For example: `GET:/api/food/inventory?page=1&limit=20`

## Comparison with Redis Cache

| Feature | In-Memory Cache | Redis Cache |
|---------|----------------|-------------|
| **Persistence** | None (lost on restart) | Yes (survives restarts) |
| **Distribution** | No (process-bound) | Yes (shared across instances) |
| **Speed** | Very fast (in-process) | Fast (network call) |
| **Capacity** | Limited by process memory | Limited by Redis server memory |
| **TTL Support** | Yes (manual check) | Yes (automatic) |
| **Pattern Deletion** | No | Yes |
| **Monitoring** | Limited | Extensive |
| **Failure Mode** | N/A (always available) | Graceful fallback |

## Best Practices

### When to Use In-Memory Cache

1. **Development Environment**: When Redis is not available
2. **Simple Applications**: For single-instance applications with low traffic
3. **Fallback Mechanism**: As a backup when Redis is unavailable
4. **Non-Critical Data**: For caching data that doesn't require persistence

### Cache Size Management

The in-memory cache has no built-in size limits, which could lead to memory issues. Consider implementing:

1. **Maximum Entry Count**: Limit the number of entries in the cache
2. **LRU Eviction**: Remove least recently used entries when the cache is full
3. **Size-Based Eviction**: Monitor cache size and evict entries when it exceeds a threshold

### Cache Invalidation

Unlike Redis, the in-memory cache doesn't support pattern-based invalidation. Consider these approaches:

1. **Explicit Key Tracking**: Maintain lists of related keys for group invalidation
2. **Time-Based Invalidation**: Rely on TTL for automatic invalidation
3. **Manual Invalidation**: Call `clearCache` explicitly when data changes

### Error Handling

The in-memory cache implementation is simple and doesn't include extensive error handling. Consider adding:

1. **Try-Catch Blocks**: Wrap cache operations in try-catch blocks
2. **Logging**: Add logging for cache hits, misses, and errors
3. **Monitoring**: Track cache size and hit rate

### Integration with Redis

For a robust caching strategy, consider using both caching mechanisms:

1. **Redis First**: Attempt to use Redis cache first
2. **In-Memory Fallback**: Fall back to in-memory cache when Redis is unavailable
3. **Consistent Keys**: Use consistent key generation across both caching systems