import clientPromise from '@/lib/mongo';

let ensuredPromise = null;

export async function ensureIndexes() {
  if (ensuredPromise) return ensuredPromise;
  ensuredPromise = (async () => {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // roles
    await db.collection('roles').createIndex({ name: 1 }, { unique: true });

    // users
    await db.collection('users').createIndex({ userId: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ createdAt: -1 });

    // audit_logs
    await db.collection('audit_logs').createIndex({ at: -1 });
    await db.collection('audit_logs').createIndex({ actor: 1 });
    await db.collection('audit_logs').createIndex({ action: 1 });
    await db.collection('audit_logs').createIndex({ target: 1 });

    // gate_logs (for Watchman dashboard)
    await db.collection('gate_logs').createIndex({ at: -1 });
    await db.collection('gate_logs').createIndex({ type: 1 });
    await db.collection('gate_logs').createIndex({ actor: 1 });
    await db.collection('gate_logs').createIndex({ visitorName: 1 });
    await db.collection('gate_logs').createIndex({ visitorPhone: 1 });
    await db.collection('gate_logs').createIndex({ plate: 1 });
    await db.collection('gate_logs').createIndex({ note: 1 });
    await db.collection('gate_logs').createIndex({ visitorAddress: 1 });

    return true;
  })();
  return ensuredPromise;
}
