import { NextResponse } from 'next/server';

/**
 * API Cache utility for caching API responses
 */

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached data if it exists and hasn't expired
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null if not found/expired
 */
export function getCache(key) {
  const cached = cache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}

/**
 * Set data in cache with timestamp
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
export function setCache(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Clear cache entry
 * @param {string} key - Cache key to clear
 */
export function clearCache(key) {
  cache.delete(key);
}

/**
 * Clear all cache entries
 */
export function clearAllCache() {
  cache.clear();
}

/**
 * Higher-order function to wrap API handlers with caching
 * @param {Object} request - Next.js request object
 * @param {Function} handler - API handler function
 * @param {number} ttl - Time to live in seconds for this specific cache entry
 * @returns {Promise} Wrapped handler with caching
 */
export async function withCache(request, handler, ttl = 300) {
  const key = generateCacheKey(request);
  
  // Only cache GET requests
  if (request.method === 'GET') {
    const cachedData = getCache(key);
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': `public, max-age=${ttl}`
        }
      });
    }
  }
  
  // Call the original handler
  const result = await handler(request);
  
  // Cache the result if it's a successful GET response
  if (request.method === 'GET' && result && result.status === 200) {
    try {
      // Clone the response to read the body without consuming it
      const cloned = result.clone();
      const data = await cloned.json();
      setCache(key, data);
      
      // Add cache headers to the original result
      result.headers.set('X-Cache', 'MISS');
      result.headers.set('Cache-Control', `public, max-age=${ttl}`);
    } catch (e) {
      console.warn('apiCache: Failed to parse response body for caching', e);
    }
  }
  
  return result;
}

/**
 * Clear cached response by key or prefix
 * @param {string} prefix - Cache key prefix to clear (e.g. 'GET:/api/food/suppliers')
 */
export async function clearCachedResponse(prefix) {
  // Clear all keys that start with the prefix (to handle query params)
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Generate cache key from request
 * @param {Object} req - Request object
 * @returns {string} Cache key
 */
export function generateCacheKey(req) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  return `${req.method}:${url.pathname}${url.search}`;
}
