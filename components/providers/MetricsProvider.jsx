'use client';

import { useEffect } from 'react';

export default function MetricsProvider({ children }) {
  useEffect(() => {
    // Initialize metrics collection on client side
    const initializeMetrics = async () => {
      try {
        // Send a request to initialize metrics collection
        await fetch('/api/admin/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('✅ Metrics collection initialized');
      } catch (error) {
        console.error('❌ Failed to initialize metrics collection:', error);
      }
    };

    // Initialize metrics after a short delay to ensure the app is loaded
    const timer = setTimeout(initializeMetrics, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  return <>{children}</>;
}
