"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Sidebar from "@/components/dashboard/Sidebar";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Handle redirect in useEffect to avoid setState during render
  useEffect(() => {
    if (status === "unauthenticated") {
      const callbackUrl = encodeURIComponent(window.location.pathname);
      router.push(`/?callbackUrl=${callbackUrl}`);
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main 
          className={cn(
            'flex-1 overflow-y-auto p-4 md:p-6 bg-muted/20',
            'transition-all duration-300 ease-in-out',
            'ml-16' // Default collapsed width
          )}
        >
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
