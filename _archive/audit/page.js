import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';

export default async function AuditDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');
  const role = session.user?.role;
  if (!(role === 'Owner/Admin' || role === 'Auditor (Read-Only)')) redirect('/unauthorized');
  return (
    <section className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      {/* Audit dashboard content goes here */}
    </section>
  );
}
