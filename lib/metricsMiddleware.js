import { metricsService } from './metrics.js';

// Middleware to collect performance metrics
export function metricsMiddleware(handler) {
  return async (request, context) => {
    const startTime = Date.now();
    let response;
    let error = null;

    try {
      // Execute the original handler
      response = await handler(request, context);
      
      // Calculate response time
      const responseTime = Date.now() - startTime;
      
      // Extract request information
      const url = new URL(request.url);
      const endpoint = url.pathname;
      const method = request.method;
      const statusCode = response.status;
      
      // Get user information from session if available
      let userId = null;
      let userRole = null;
      
      try {
        const { getServerSession } = await import('next-auth');
        const { authOptions } = await import('@/app/api/auth/[...nextauth]/route');
        const session = await getServerSession(authOptions);
        
        if (session?.user) {
          userId = session.user.id;
          userRole = session.user.role;
        }
      } catch (err) {
        // Ignore session errors in metrics collection
      }
      
      // Get request and response sizes
      const requestSize = request.headers.get('content-length') ? 
        parseInt(request.headers.get('content-length')) : 0;
      
      const responseSize = response.headers.get('content-length') ? 
        parseInt(response.headers.get('content-length')) : 0;
      
      // Collect performance metrics
      await metricsService.collectPerformanceMetrics(
        endpoint,
        method,
        responseTime,
        statusCode,
        userId,
        userRole,
        requestSize,
        responseSize
      );
      
      return response;
    } catch (err) {
      error = err;
      
      // Calculate response time for errors
      const responseTime = Date.now() - startTime;
      
      // Extract request information
      const url = new URL(request.url);
      const endpoint = url.pathname;
      const method = request.method;
      const statusCode = 500; // Default error status
      
      // Get user information from session if available
      let userId = null;
      let userRole = null;
      
      try {
        const { getServerSession } = await import('next-auth');
        const { authOptions } = await import('@/app/api/auth/[...nextauth]/route');
        const session = await getServerSession(authOptions);
        
        if (session?.user) {
          userId = session.user.id;
          userRole = session.user.role;
        }
      } catch (sessionErr) {
        // Ignore session errors in metrics collection
      }
      
      // Get request size
      const requestSize = request.headers.get('content-length') ? 
        parseInt(request.headers.get('content-length')) : 0;
      
      // Collect performance metrics for error
      await metricsService.collectPerformanceMetrics(
        endpoint,
        method,
        responseTime,
        statusCode,
        userId,
        userRole,
        requestSize,
        0 // No response size for errors
      );
      
      // Re-throw the error
      throw err;
    }
  };
}

// Utility function to wrap API routes with metrics collection
export function withMetrics(handler) {
  return metricsMiddleware(handler);
}

// Utility function to collect custom metrics
export async function collectCustomMetric(name, value, tags = {}) {
  try {
    await metricsService.collectPerformanceMetrics(
      `custom:${name}`,
      'METRIC',
      0, // No response time for custom metrics
      200,
      null,
      null,
      0,
      0
    );
  } catch (error) {
    console.error('Error collecting custom metric:', error);
  }
}

// Utility function to collect business metrics
export async function collectBusinessMetric(metricType, value, metadata = {}) {
  try {
    const db = await metricsService.connect();
    
    const businessMetric = {
      type: metricType,
      value: value,
      metadata: metadata,
      timestamp: new Date()
    };
    
    await db.collection('businessMetrics').insertOne(businessMetric);
  } catch (error) {
    console.error('Error collecting business metric:', error);
  }
}
