import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: false, error: 'Not Found' }, { status: 404 });
}

export async function PATCH() {
  return NextResponse.json({ ok: false, error: 'Not Found' }, { status: 404 });
}
