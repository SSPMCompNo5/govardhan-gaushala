import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongo';
import { ensureIndexes } from '@/lib/indexes';

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function sample(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function randomName() {
  const first = ['Rahul','Priya','Amit','Sneha','Vikram','Anita','Rohit','Nisha','Karan','Pooja','Arjun','Kavya','Manish','Isha','Sanjay','Meera','Vivek','Riya','Shreya','Dev'];
  const last = ['Sharma','Verma','Patel','Iyer','Gupta','Reddy','Nair','Das','Khan','Singh','Agarwal','Bose','Chopra','Gandhi','Kapoor','Mehta'];
  return `${sample(first)} ${sample(last)}`;
}

function randomAddress() {
  const streets = ['MG Road','NH 48','LBS Marg','Ring Road','Brigade Rd','FC Road','Park Street','SV Road','GT Road','Anna Salai'];
  const cities = ['Mumbai','Delhi','Bengaluru','Hyderabad','Pune','Chennai','Kolkata','Ahmedabad','Jaipur','Lucknow'];
  return `${randInt(1, 400)}, ${sample(streets)}, ${sample(cities)}`;
}

function randomPhone() {
  // 10-digit Indian-style starting 6-9
  const start = sample(['6','7','8','9']);
  let rest = '';
  for (let i=0;i<9;i++) rest += String(randInt(0,9));
  return start + rest;
}

function randomPlate() {
  // Format like KA-01-AB-1234 or with spaces
  const states = ['KA','MH','DL','TN','GJ','RJ','UP','PB','WB','HR','KL','TS'];
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const state = sample(states);
  const r2 = String(randInt(0,99)).padStart(2,'0');
  const l2 = letters[randInt(0,25)] + letters[randInt(0,25)];
  const n4 = String(randInt(0,9999)).padStart(4,'0');
  const sep = sample([' ','-']);
  return `${state}${sep}${r2}${sep}${l2}${sep}${n4}`;
}

function randomNote() {
  const texts = [
    'Visitor to Goshala',
    'Delivery at gate',
    'Volunteer entry',
    'VIP visit',
    'Late night exit',
    'Animal feed delivery',
    'Maintenance crew',
    'Donation drop-off',
  ];
  return sample(texts);
}

export async function POST(request) {
  try {
    // Guard: allow only on localhost in dev or if ENABLE_SEED=true
    const allowed = process.env.NODE_ENV === 'development' || process.env.ENABLE_SEED === 'true';
    const host = request?.headers?.get('host') || '';
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]');
    if (!allowed || !isLocalhost) {
      return NextResponse.json({ ok: false, error: 'Not Found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const count = Math.min(Math.max(parseInt(body?.count ?? '100', 10) || 100, 1), 2000);

    await ensureIndexes();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const coll = db.collection('gate_logs');

    const now = new Date();
    const docs = [];
    for (let i = 0; i < count; i++) {
      const daysAgo = randInt(0, 90);
      const at = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - randInt(0, 86399) * 1000);
      const type = sample(['entry','exit','incident']);
      const withPhone = Math.random() < 0.9;
      const withAddress = Math.random() < 0.7;
      const withPlate = Math.random() < 0.6;
      const withGroup = Math.random() < 0.3;

      docs.push({
        type,
        note: Math.random() < 0.6 ? randomNote() : undefined,
        visitorName: randomName(),
        visitorPhone: withPhone ? randomPhone() : undefined,
        visitorAddress: withAddress ? randomAddress() : undefined,
        groupSize: withGroup ? randInt(1, 8) : undefined,
        plate: withPlate ? randomPlate() : undefined,
        actor: 'seed',
        at,
        createdAt: at,
        updatedAt: at,
      });
    }

    if (docs.length) await coll.insertMany(docs, { ordered: false });

    return NextResponse.json({ ok: true, inserted: docs.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || 'Seed failed' }, { status: 500 });
  }
}
