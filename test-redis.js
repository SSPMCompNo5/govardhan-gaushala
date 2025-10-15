const Redis = require('ioredis');

async function testRedis() {
  console.log('🔍 Testing Redis connection...');
  
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    db: process.env.REDIS_DB || 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  });

  try {
    // Test basic connection
    await redis.ping();
    console.log('✅ Redis ping successful');

    // Test set/get
    await redis.set('test:key', 'Hello Redis!');
    const value = await redis.get('test:key');
    console.log('✅ Redis set/get test successful:', value);

    // Test expiration
    await redis.setex('test:expire', 5, 'This will expire');
    console.log('✅ Redis expiration test successful');

    // Clean up
    await redis.del('test:key', 'test:expire');
    console.log('✅ Redis cleanup successful');

    console.log('🎉 All Redis tests passed!');
    
  } catch (error) {
    console.error('❌ Redis test failed:', error.message);
    process.exit(1);
  } finally {
    await redis.quit();
  }
}

testRedis();

