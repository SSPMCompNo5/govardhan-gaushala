import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { canAccess } from '@/lib/roles';

export default async function HealthLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');
  const role = session.user?.role;
  if (!canAccess(role, 'health')) redirect('/unauthorized');
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <h1 className="page-title" style={{ marginBottom: 4 }}>Health Dashboard</h1>
        <p className="page-subtitle">Track medical records and treatments.</p>
      </div>
      {children}
    </>
  );
}
