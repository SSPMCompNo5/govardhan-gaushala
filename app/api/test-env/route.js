import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
    JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
    MONGODB_URI: process.env.MONGODB_URI || 'NOT SET',
    MONGODB_DB: process.env.MONGODB_DB || 'NOT SET',
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
  });
}
