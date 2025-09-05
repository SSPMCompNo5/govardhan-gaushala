import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { canAccess, roleHome } from '@/lib/roles';

export default async function AuditLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');
  const role = session.user?.role;
  if (!canAccess(role, 'audit')) redirect(roleHome(role));
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <h1 className="page-title" style={{ marginBottom: 4 }}>Audit Dashboard</h1>
        <p className="page-subtitle">Read-only access to reports and records.</p>
      </div>
      {children}
    </>
  );
}
