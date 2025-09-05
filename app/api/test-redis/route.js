import { NextResponse } from 'next/server';
import { cache, CacheKeys } from '@/lib/redisCache';

// GET /api/test-redis - Test Redis connection (no auth required)
export async function GET(request) {
  try {
    console.log('🧪 Testing Redis connection...');
    
    // Test connection
    const isConnected = await cache.isConnected();
    console.log('✅ Redis connected:', isConnected);
    
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        message: 'Redis not available',
        instructions: {
          windows: 'choco install redis-64',
          docker: 'docker run -d -p 6379:6379 redis:alpine',
          manual: 'Download from https://github.com/microsoftarchive/redis/releases'
        }
      });
    }
    
    // Test basic operations
    const testKey = 'test:cache:key';
    const testData = { 
      message: 'Hello Redis!', 
      timestamp: new Date().toISOString(),
      performance: 'Redis is working! 🚀'
    };
    
    // Set data
    await cache.set(testKey, testData, 60);
    console.log('✅ Data set in cache');
    
    // Get data
    const retrieved = await cache.get(testKey);
    console.log('✅ Data retrieved:', retrieved);
    
    // Test cache key generation
    const cacheKey = CacheKeys.FOOD_INVENTORY({ page: 1, limit: 20, search: 'hay' });
    console.log('✅ Cache key generated:', cacheKey);
    
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
