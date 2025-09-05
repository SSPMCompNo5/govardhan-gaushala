import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// GET /api/test-auth - Test authentication status
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    return NextResponse.json({
      success: true,
      authenticated: !!session,
      user: session?.user || null,
      role: session?.user?.role || null,
      message: session ? 'You are logged in!' : 'You are not logged in'
    });

  } catch (error) {
    console.error('Auth test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
