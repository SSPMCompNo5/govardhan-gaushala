import clientPromise from './mongo';

// Logs an audit event into the 'audit_logs' collection
// Example: await logAudit({ actor: 'admin', action: 'user:role:update', target: 'opsmgr', details: { from: 'Operations Manager', to: 'Accountant' } })
export async function logAudit({ actor, action, target, details = {}, ip = null }) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const doc = {
      actor: actor || null,
      action,
      target: target || null,
      details,
      ip: ip || null,
      at: new Date(),
    };
    await db.collection('audit_logs').insertOne(doc);
  } catch (e) {
    console.error('audit log error', e);
  }
}
