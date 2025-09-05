import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Doctor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const medId = searchParams.get('medId');
    const tagId = searchParams.get('tagId');
    const treatmentId = searchParams.get('treatmentId');

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const usageCol = db.collection('doctor_medicine_usage');

    const filter = {};
    if (medId) filter.medId = medId;
    if (tagId) filter.tagId = tagId;
    if (treatmentId) filter.treatmentId = treatmentId;

    const usage = await usageCol
      .find(filter)
      .sort({ at: -1 })
      .limit(limit)
      .toArray();

    // Populate medicine names
    const medIds = [...new Set(usage.map(u => u.medId))];
    if (medIds.length > 0) {
      const medicines = await db.collection('doctor_medicines')
        .find({ _id: { $in: medIds.map(id => {
          const { ObjectId } = require('mongodb');
          try {
            return ObjectId.createFromHexString(id);
          } catch {
            return null;
          }
        }).filter(Boolean) } })
        .toArray();
      
      const medMap = Object.fromEntries(medicines.map(m => [m._id.toString(), m.name]));
      
      usage.forEach(u => {
        u.medicineName = medMap[u.medId] || 'Unknown Medicine';
      });
    }

    return NextResponse.json({ usage });
  } catch (e) {
    console.error('Medicine usage fetch error:', e);
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}
