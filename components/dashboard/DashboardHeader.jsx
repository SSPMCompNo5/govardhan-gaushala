'use client';

import { signOut, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const getDashboardTitle = (pathname, role) => {
  if (pathname.includes('/admin')) return 'Admin Dashboard';
  if (pathname.includes('/watchman')) return 'Watchman Dashboard';
  if (pathname.includes('/food-manager')) return 'Food Manager Dashboard';
  return role === 'admin' ? 'Admin Dashboard' : 'Dashboard';
};

export default function DashboardHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  const dashboardTitle = getDashboardTitle(pathname, session?.user?.role);

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <h1 className="text-xl font-bold">
        {dashboardTitle}
      </h1>
      <div className="flex items-center gap-4">
        {session?.user?.name && (
          <span className="text-sm text-muted-foreground">
            {session.user.name}
          </span>
        )}
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleLogout}
          className="ml-2"
        >
          Logout
        </Button>
      </div>
    </header>
  );
}
