"use client";

import { memo } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Sidebar from "@/components/dashboard/Sidebar";

// Memoized sidebar to prevent re-renders
const MemoizedSidebar = memo(Sidebar);
const MemoizedHeader = memo(DashboardHeader);

export default function DashboardLayout({ children }) {
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
