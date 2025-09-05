# Rate Limiting Implementation with Redis Integration

## Overview

This document details the rate limiting system implemented in the Govardhan Goshala application. The system uses a hybrid approach, leveraging Redis for distributed rate limiting when available and falling back to an in-memory implementation when Redis is unavailable.

## Table of Contents

1. [Implementation Details](#implementation-details)
2. [Redis Integration](#redis-integration)
3. [In-Memory Fallback](#in-memory-fallback)
4. [Rate Limit Configuration](#rate-limit-configuration)
5. [Request Key Generation](#request-key-generation)
6. [Usage Examples](#usage-examples)
7. [Best Practices](#best-practices)

## Implementation Details

The rate limiting system is implemented in `lib/rateLimit.js`. It provides a flexible rate limiting solution that can work in both Redis-backed and standalone modes.

The core functionality is provided by the `rateLimit` function:

```javascript
export function rateLimit({ windowMs = windowMsDefault, max = maxDefault, keyGenerator } = {}) {
  return async (keySeed) => {
    const key = (typeof keyGenerator === 'function') ? keyGenerator(keySeed) : keySeed;
    // Try Redis first
    const cfg = getRedisConfig();
    if (cfg) {
      const r = await redisRateCheck(key, windowMs, max);
      return r || { limited: false, remaining: max, resetTime: Date.now() + windowMs };
    }
    // Fallback to in-memory
    const bucket = getBucket(key);
    bucket.resetTime = Math.max(bucket.resetTime, Date.now() + windowMs);
    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    const limited = bucket.count > max;
    return { limited, remaining, resetTime: bucket.resetTime };
  };
}
```

This function:

1. Creates a rate limiter function with configurable window size and request limit
2. Attempts to use Redis for rate limiting if available
3. Falls back to in-memory rate limiting if Redis is unavailable
4. Returns rate limit status including whether the request is limited, remaining requests, and reset time

## Redis Integration

The Redis integration is implemented through the Upstash Redis REST API, allowing for serverless Redis access:

```javascript
function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_REST_URL || '';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_REST_TOKEN || '';
  if (url && token) return { url, token };
  return null;
}

async function redisRateCheck(key, windowMs, max) {
  const cfg = getRedisConfig();
  if (!cfg) return null;
  const windowSec = Math.ceil(windowMs / 1000);
  // INCR the key
  const incrRes = await fetch(`${cfg.url}/INCR/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}` },
  });
  if (!incrRes.ok) throw new Error('Redis INCR failed');
  const value = await incrRes.json();
  const count = Array.isArray(value) ? value[1] : value.result ?? value;
  // If first hit, set expire
  if (count === 1) {
    await fetch(`${cfg.url}/EXPIRE/${encodeURIComponent(key)}/${windowSec}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}` },
    });
  }
  const remaining = Math.max(0, max - count);
  const limited = count > max;
  return { limited, remaining, resetTime: Date.now() + windowMs };
}
```

This implementation:

1. Retrieves Redis configuration from environment variables
2. Uses the Redis `INCR` command to increment the request counter
3. Sets an expiration time on the counter for automatic cleanup
4. Calculates remaining requests and rate limit status

The Redis-based rate limiting provides several advantages:

1. **Distributed Rate Limiting**: Works across multiple server instances
2. **Persistence**: Rate limit counters survive server restarts
3. **Scalability**: Can handle high traffic volumes

## In-Memory Fallback

When Redis is unavailable, the system falls back to an in-memory implementation:

```javascript
const windowMsDefault = 60 * 1000; // 1 minute
const maxDefault = 30; // 30 requests per window per key

const store = new Map();

function getBucket(key) {
  const now = Date.now();
  let b = store.get(key);
  if (!b || b.resetTime <= now) {
    b = { count: 0, resetTime: now + windowMsDefault };
    store.set(key, b);
  }
  return b;
}
```

This implementation:

1. Uses a JavaScript `Map` to store rate limit counters
2. Creates time-based buckets for each rate limit key
3. Automatically resets counters when the time window expires

The in-memory fallback provides:

1. **Reliability**: Always available, even when Redis is down
2. **Performance**: Fast in-process rate limiting
3. **Simplicity**: No external dependencies

However, it has limitations:

1. **Process-Bound**: Only works within a single server instance
2. **No Persistence**: Counters are reset on server restart

## Rate Limit Configuration

The rate limiting system is configurable through the following parameters:

- **windowMs**: The time window in milliseconds (default: 60000 ms / 1 minute)
- **max**: Maximum number of requests per window (default: 30)
- **keyGenerator**: Custom function for generating rate limit keys

These parameters can be adjusted based on the specific needs of different API endpoints.

## Request Key Generation

Rate limit keys are generated from request properties to ensure proper isolation of rate limits:

```javascript
export function rateLimitKeyFromRequest(req, userId) {
  try {
    // Prefer IP; fallback to user token if available later
    const xff = (req.headers.get?.('x-forwarded-for') || req.headers['x-forwarded-for'] || '').split(',').map(s=>s.trim()).filter(Boolean);
    const ip = xff.length ? xff[xff.length - 1] : (req.ip || req.headers.get?.('x-real-ip') || 'unknown');
    const path = req.nextUrl?.pathname || req.url || '';
    const uid = userId || 'anon';
    return `${ip}:${uid}:${path}`;
  } catch {
    return `unknown:${userId || 'anon'}:${Date.now()}`;
  }
}
```

This function creates a key that includes:

1. The client IP address (with proper handling of proxies)
2. The user ID (if available)
3. The request path

For example: `192.168.1.1:user123:/api/food/inventory`

This approach allows for:

1. **Per-User Rate Limiting**: Different limits for different users
2. **Per-Endpoint Rate Limiting**: Different limits for different API endpoints
3. **IP-Based Rate Limiting**: Protection against anonymous abuse

## Usage Examples

### Basic Rate Limiting

```javascript
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';

// Create a rate limiter with default settings (30 requests per minute)
const limiter = rateLimit();

// In an API route handler
export async function GET(request) {
  // Generate a key from the request
  const key = rateLimitKeyFromRequest(request);
  
  // Check rate limit
  const { limited, remaining, resetTime } = await limiter(key);
  
  // If rate limited, return 429 Too Many Requests
  if (limited) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((resetTime - Date.now()) / 1000),
        'X-RateLimit-Limit': '30',
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
      }
    });
  }
  
  // Process the request normally
  // ...
}
```

### Custom Rate Limiting

```javascript
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';

// Create a stricter rate limiter for sensitive endpoints (10 requests per 5 minutes)
const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10 // 10 requests per window
});

// Create a more lenient rate limiter for public endpoints (100 requests per minute)
const publicLimiter = rateLimit({
  max: 100 // 100 requests per window
});

// In an API route handler
export async function GET(request) {
  // Choose the appropriate limiter based on the endpoint
  const isPublicEndpoint = request.url.includes('/public/');
  const limiter = isPublicEndpoint ? publicLimiter : strictLimiter;
  
  // Generate a key from the request
  const key = rateLimitKeyFromRequest(request);
  
  // Check rate limit
  const { limited, remaining, resetTime } = await limiter(key);
  
  // Handle rate limiting
  // ...
}
```

## Best Practices

### Rate Limit Configuration

1. **Tiered Rate Limiting**: Use different limits for different types of endpoints
   - Public/Read-only: Higher limits (e.g., 100 requests per minute)
   - Authenticated/Write: Moderate limits (e.g., 30 requests per minute)
   - Sensitive/Admin: Stricter limits (e.g., 10 requests per 5 minutes)

2. **Adaptive Rate Limiting**: Adjust limits based on server load or user behavior

3. **User-Based Differentiation**: Higher limits for authenticated or premium users

### Response Headers

Include standard rate limit headers in responses:

```javascript
'X-RateLimit-Limit': max.toString(),
'X-RateLimit-Remaining': remaining.toString(),
'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
```

When rate limited, include a `Retry-After` header:

```javascript
'Retry-After': Math.ceil((resetTime - Date.now()) / 1000)
```

### Error Handling

1. **Graceful Degradation**: Fall back to in-memory rate limiting when Redis is unavailable
2. **Clear Error Messages**: Provide helpful error messages when rate limited
3. **Logging**: Log rate limit events for monitoring and analysis

### Security Considerations

1. **IP Spoofing Protection**: Properly handle X-Forwarded-For headers
2. **User Identification**: Use a combination of IP and user ID for rate limiting
3. **Path-Specific Limits**: Apply different limits to different API endpoints

### Monitoring and Maintenance

1. **Track Rate Limit Events**: Monitor how often rate limits are hit
2. **Adjust Limits as Needed**: Increase limits if legitimate users are being limited
3. **Watch for Abuse Patterns**: Identify and block abusive IP addresses or users