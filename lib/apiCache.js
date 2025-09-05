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
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise} Wrapped handler with caching
 */
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

/**
 * Clear cached response
 * @param {string} key - Cache key to clear
 */
export async function clearCachedResponse(key) {
  clearCache(key);
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
