"use client";
import { useState } from 'react';

export default function UnlockButton({ userId, onDone }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const onClick = async () => {
    setErr('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/throttle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Failed');
      onDone && onDone();
    } catch (e) {
      setErr(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
      <button className="btn" onClick={onClick} disabled={loading}>
        {loading ? 'Unlocking...' : 'Unlock'}
      </button>
      {err && <span style={{ color: '#b91c1c', fontSize: 12 }}>{err}</span>}
    </div>
  );
}
