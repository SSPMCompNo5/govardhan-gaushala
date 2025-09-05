import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { mkdir } from 'fs/promises';

const limitWrite = rateLimit({ windowMs: 60 * 1000, max: 10 });

// Allowed file types for medical attachments
const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
  'image/tiff': '.tiff',
  'image/bmp': '.bmp'
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['Doctor', 'Goshala Manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitWrite(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    
    if (!validateCSRFFromRequest(request)) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    
    const formData = await request.formData();
    const file = formData.get('file');
    const treatmentId = formData.get('treatmentId');
    const description = formData.get('description') || '';
    
    if (!file || !treatmentId) {
      return NextResponse.json({ error: 'File and treatment ID are required' }, { status: 400 });
    }
    
    // Validate file type
    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json({ 
        error: `File type not allowed. Allowed types: ${Object.keys(ALLOWED_TYPES).join(', ')}` 
      }, { status: 400 });
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      }, { status: 400 });
    }
    
    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'treatments');
    await mkdir(uploadDir, { recursive: true });
    
    // Generate unique filename
    const fileExtension = ALLOWED_TYPES[file.type];
    const filename = `${treatmentId}_${uuidv4()}${fileExtension}`;
    const filepath = path.join(uploadDir, filename);
    
    // Save file
    const buffer = await file.arrayBuffer();
    await fs.writeFile(filepath, Buffer.from(buffer));
    
    // Return file info
    const attachment = {
      id: uuidv4(),
      filename: filename,
      originalName: file.name,
      type: file.type,
      size: file.size,
      description: description,
      uploadedAt: new Date().toISOString(),
      uploadedBy: session.user?.userId,
      url: `/uploads/treatments/${filename}`
    };
    
    return NextResponse.json({ 
      ok: true, 
      attachment: attachment 
    });
    
  } catch (e) {
    console.error('Upload error:', e);
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 });
  }
}
