import 'server-only';
import { metricsService } from './metrics.js';

// Initialize metrics collection on server startup
export async function initializeMetrics() {
  try {
    // Start automatic metrics collection
    metricsService.startAutoCollection();
    
    console.log('✅ Metrics collection initialized successfully');
    
    // Collect initial system metrics
    await metricsService.collectSystemMetrics();
    
    console.log('✅ Initial system metrics collected');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize metrics collection:', error);
    return false;
  }
}

// Graceful shutdown
export async function shutdownMetrics() {
  try {
    // Stop automatic collection
    metricsService.stopAutoCollection();
    
    // Flush any remaining metrics
    await metricsService.flushMetrics();
    
    console.log('✅ Metrics collection shutdown successfully');
    return true;
  } catch (error) {
    console.error('❌ Error during metrics shutdown:', error);
    return false;
  }
}
