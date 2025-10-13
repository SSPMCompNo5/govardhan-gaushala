'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function MetricsProvider({ children }) {
  const pathname = usePathname();
  
  useEffect(() => {
    // Only initialize metrics on dashboard pages to avoid slowing down public pages
    const isDashboardPage = pathname?.startsWith('/dashboard');
    
    if (!isDashboardPage) {
      return;
    }

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
    const timer = setTimeout(initializeMetrics, 1000); // Reduced from 2000ms to 1000ms
    
    return () => clearTimeout(timer);
  }, [pathname]);

  return <>{children}</>;
}
