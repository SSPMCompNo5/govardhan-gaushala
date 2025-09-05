import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getPerformanceReport } from '@/lib/performance';
import { cache } from '@/lib/redisCache';

// GET /api/admin/performance-monitor - Get performance metrics
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    // For testing purposes, allow access without strict role check
    // In production, uncomment the role check below
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized - Please log in first',
        debug: 'No session found'
      }, { status: 401 });
    }

    // Uncomment this for production:
    // if (!['Admin', 'Owner/Admin'].includes(session.user?.role)) {
    //   return NextResponse.json({ 
    //     error: 'Forbidden - Admin access required',
    //     debug: `Current role: ${session.user?.role}`
    //   }, { status: 403 });
    // }

    const report = await getPerformanceReport();
    
    return NextResponse.json({
      success: true,
      data: report,
      debug: {
        user: session.user?.email || session.user?.username,
        role: session.user?.role
      }
    });

  } catch (error) {
    console.error('Performance monitor error:', error);
    return NextResponse.json(
      { error: 'Failed to get performance metrics', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/admin/performance-monitor/clear - Clear performance metrics
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['Admin', 'Owner/Admin'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action } = await request.json();

    switch (action) {
      case 'clear-metrics':
        // Clear performance metrics
        const { performanceMonitor } = await import('@/lib/performance');
        performanceMonitor.clear();
        break;
        
      case 'clear-cache':
        // Clear Redis cache
        await cache.delPattern('*');
        break;
        
      case 'clear-all':
        // Clear both metrics and cache
        const { performanceMonitor: pm } = await import('@/lib/performance');
        pm.clear();
        await cache.delPattern('*');
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: clear-metrics, clear-cache, or clear-all' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully executed action: ${action}`
    });

  } catch (error) {
    console.error('Performance monitor clear error:', error);
    return NextResponse.json(
      { error: 'Failed to clear metrics' },
      { status: 500 }
    );
  }
}
