import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session || !(['Cow Manager','Goshala Manager','Admin','Owner/Admin'].includes(role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse multipart form
    const form = await request.formData();
    const file = form.get('file');
    const tagId = String(form.get('tagId') || '').trim();
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'cows');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const ext = (file.type && file.type.split('/')[1]) || 'bin';
    const safeTag = tagId.replace(/[^a-z0-9\-_.]/gi, '_') || 'cow';
    const filename = `${safeTag}-${Date.now()}.${ext}`;
    const dest = path.join(uploadsDir, filename);
    fs.writeFileSync(dest, buffer);

    const urlPath = `/uploads/cows/${filename}`;
    return NextResponse.json({ ok: true, url: urlPath, name: filename, size: buffer.length, type: file.type || 'application/octet-stream' });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 });
  }
}


