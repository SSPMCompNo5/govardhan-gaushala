/**
 * Redis configuration and connection management
 */
import Redis from 'ioredis';

// Check if Redis URL is configured
const isRedisEnabled = !!process.env.REDIS_URL;

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

// Create Redis instance only if enabled
export const redis = isRedisEnabled ? new Redis(redisConfig) : null;

// Handle Redis events only if enabled
if (redis) {
  redis.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  redis.on('ready', () => {
    console.log('✅ Redis ready to accept commands');
  });

  redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err);
  });

  redis.on('close', () => {
    console.log('⚠️ Redis connection closed');
  });

  redis.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
  });
} else {
  console.log('⚠️ Redis is disabled - caching will not be available');
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (redis) {
    console.log('🛑 Shutting down Redis connection...');
    await redis.quit();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (redis) {
    console.log('🛑 Shutting down Redis connection...');
    await redis.quit();
  }
  process.exit(0);
});

export default redis;