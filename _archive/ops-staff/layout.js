import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { canAccess } from '@/lib/roles';

export default async function OpsStaffLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');
  const role = session.user?.role;
  if (!canAccess(role, 'ops-staff')) redirect('/unauthorized');
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <h1 className="page-title" style={{ marginBottom: 4 }}>Operations Staff Dashboard</h1>
        <p className="page-subtitle">Daily ops shortcuts and tasks.</p>
      </div>
      {children}
    </>
  );
}
