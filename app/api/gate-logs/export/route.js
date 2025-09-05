import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { stringify } from 'csv-stringify/sync';
import { PDFDocument, StandardFonts } from 'pdf-lib';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'csv').toLowerCase();
    const limit = Math.min(parseInt(searchParams.get('limit') || '1000', 10), 5000);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const coll = db.collection('gateLogs');
    const logs = await coll.find({}).sort({ timestamp: -1 }).limit(limit).toArray();

    if (format === 'pdf') {
      const pdf = await PDFDocument.create();
      const page = pdf.addPage();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const fontSize = 10;
      let y = page.getHeight() - 40;
      page.drawText('Gate Logs Export', { x: 40, y, size: 14, font });
      y -= 20;
      logs.forEach((l) => {
        const line = `${new Date(l.timestamp).toLocaleString()} | ${l.type || ''} | ${l.visitorName || ''} ${l.vehicle || ''} ${l.notes ? '| ' + l.notes : ''}`;
        y -= 12;
        if (y < 40) { y = page.getHeight() - 40; pdf.addPage(); }
        page.drawText(line, { x: 40, y, size: fontSize, font });
      });
      const bytes = await pdf.save();
      return new NextResponse(Buffer.from(bytes), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="gate-logs.pdf"' } });
    }

    const records = logs.map(l => ({ time: new Date(l.timestamp).toISOString(), type: l.type || '', visitor: l.visitorName || '', vehicle: l.vehicle || '', notes: l.notes || '' }));
    const csv = stringify(records, { header: true });
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="gate-logs.csv"' } });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Export failed' }, { status: 500 });
  }
}


