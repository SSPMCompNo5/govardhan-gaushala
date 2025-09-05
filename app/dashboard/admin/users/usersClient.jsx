"use client";
import { useEffect, useMemo, useState } from 'react';

export default function UsersClient() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(null); // userId currently saving
  const [op, setOp] = useState(null); // current operation indicator

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return users;
    return users.filter(u =>
      (u.userId || "").toLowerCase().includes(term) ||
      (u.role || "").toLowerCase().includes(term)
    );
  }, [q, users]);

  const load = async () => {
    setLoading(true);
    try {
      const [uRes, rRes] = await Promise.all([
        fetch(`/api/users`).then(r => r.json()),
        fetch(`/api/roles`).then(r => r.json()),
      ]);
      setUsers(Array.isArray(uRes.users) ? uRes.users : []);
      setRoles(Array.isArray(rRes.roles) ? rRes.roles.map(r => r.name) : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const assign = async (userId, role) => {
    setSaving(userId);
    try {
      const res = await fetch(`/api/users/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update');
      setUsers(prev => prev.map(u => u.userId === userId ? { ...u, role } : u));
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(null);
    }
  };

  const changePassword = async (userId) => {
    const newPassword = window.prompt(`Enter new password for ${userId}`);
    if (!newPassword) return;
    setOp(`pwd:${userId}`);
    try {
      const res = await fetch(`/api/users/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to change password');
      alert('Password updated');
    } catch (e) {
      alert(e.message);
    } finally {
      setOp(null);
    }
  };

  const renameUser = async (userId) => {
    const newUserId = window.prompt(`Rename user ${userId} to:`);
    if (!newUserId || newUserId === userId) return;
    setOp(`rename:${userId}`);
    try {
      const res = await fetch(`/api/users/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to rename user');
      setUsers(prev => prev.map(u => u.userId === userId ? { ...u, userId: newUserId } : u));
      alert('User ID updated');
    } catch (e) {
      alert(e.message);
    } finally {
      setOp(null);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <input
          placeholder="Search users (id or role)"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ flex: 1, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8 }}
        />
        <button className="btn" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>User ID</th>
              <th style={{ textAlign: 'left' }}>Role</th>
              <th style={{ textAlign: 'left' }}>Role</th>
              <th style={{ textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.userId}>
                <td>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span>{u.userId}</span>
                    <button className="btn btn-sm" onClick={() => renameUser(u.userId)} disabled={op === `rename:${u.userId}`}>
                      Rename
                    </button>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      value={u.role}
                      onChange={e => assign(u.userId, e.target.value)}
                      disabled={saving === u.userId}
                    >
                      {roles.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    {saving === u.userId && <span style={{ color: '#6b7280', fontSize: 12 }}>Saving…</span>}
                  </div>
                </td>
                <td>
                  <button className="btn btn-sm" onClick={() => changePassword(u.userId)} disabled={op === `pwd:${u.userId}`}>
                    Change Password
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: '#6b7280' }}>No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
