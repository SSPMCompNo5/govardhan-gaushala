import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import GateLogsClient from './GateLogsClient';

export default async function OpsStaffDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');
  const role = session.user?.role;
  if (!(role === 'Operations Staff' || role === 'Watchman')) redirect('/unauthorized');
  const isWatchman = role === 'Watchman';
  return (
    <section className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <div style={{ marginBottom: 12 }}>
        <h1 className="page-title" style={{ marginBottom: 4 }}>{isWatchman ? 'Watchman' : 'Operations Staff'} Dashboard</h1>
        <p className="page-subtitle">Quick actions for gate logs and operations support.</p>
      </div>

      <GateLogsClient />
    </section>
  );
}
