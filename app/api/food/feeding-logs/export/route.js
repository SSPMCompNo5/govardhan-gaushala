import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getFeedingLogsCollection } from '@/lib/models/foodInventory';
import { stringify } from 'csv-stringify/sync';
import { PDFDocument, StandardFonts } from 'pdf-lib';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'csv').toLowerCase();
    const limit = Math.min(parseInt(searchParams.get('limit') || '1000', 10), 5000);

    const collection = await getFeedingLogsCollection();
    const logs = await collection.find({}).sort({ feedingTime: -1 }).limit(limit).toArray();

    if (format === 'pdf') {
      const pdf = await PDFDocument.create();
      const page = pdf.addPage();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const fontSize = 10;
      let y = page.getHeight() - 40;
      page.drawText('Feeding Logs Export', { x: 40, y, size: 14, font });
      y -= 20;
      logs.forEach((l) => {
        const line = `${new Date(l.feedingTime).toLocaleString()} | ${l.cowGroup} | ${l.foodType} | ${l.quantity} ${l.unit}${l.notes ? ' | ' + l.notes : ''}`;
        y -= 12;
        if (y < 40) { y = page.getHeight() - 40; pdf.addPage(); }
        page.drawText(line, { x: 40, y, size: fontSize, font });
      });
      const bytes = await pdf.save();
      return new NextResponse(Buffer.from(bytes), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="feeding-logs.pdf"' } });
    }

    // CSV
    const records = logs.map(l => ({ time: new Date(l.feedingTime).toISOString(), cowGroup: l.cowGroup, foodType: l.foodType, quantity: l.quantity, unit: l.unit, notes: l.notes || '' }));
    const csv = stringify(records, { header: true });
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="feeding-logs.csv"' } });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Export failed' }, { status: 500 });
  }
}


