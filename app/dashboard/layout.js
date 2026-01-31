"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, memo, useState } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Sidebar from "@/components/dashboard/Sidebar";
import { Loader2 } from "lucide-react";

// Memoized sidebar to prevent re-renders
const MemoizedSidebar = memo(Sidebar);
const MemoizedHeader = memo(DashboardHeader);

// Lightweight loading component
function LoadingSpinner() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Handle redirect in useEffect to avoid setState during render
  useEffect(() => {
    if (status === "unauthenticated" && !isRedirecting) {
      setIsRedirecting(true);
      const callbackUrl = encodeURIComponent(window.location.pathname);
      router.push(`/login?callbackUrl=${callbackUrl}`);
    }
  }, [status, router, isRedirecting]);

  // Show loading state
  if (status === "loading" || status === "unauthenticated") {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MemoizedHeader />
      <div className="flex flex-1 overflow-hidden">
        <MemoizedSidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/20 ml-16 transition-all duration-200">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
