// Simple in-memory rate limiter for edge/middleware or route handlers
// NOTE: For production, consider Redis or Upstash for distributed limits.

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

// ---- Redis (Upstash) integration via REST ----
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


