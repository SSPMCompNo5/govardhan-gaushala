import { redirect } from 'next/navigation';

export default function ThrottleAdminPage() {
  redirect('/dashboard/admin');
}
