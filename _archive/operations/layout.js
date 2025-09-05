import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { canAccess } from '@/lib/roles';

export default async function OperationsLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');
  const role = session.user?.role;
  if (!canAccess(role, 'operations')) redirect('/unauthorized');
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <h1 className="page-title" style={{ marginBottom: 4 }}>Operations Dashboard</h1>
        <p className="page-subtitle">Manage cows, milk, tasks, and health operations.</p>
      </div>
      {children}
    </>
  );
}
