"use client";

import { useSession } from "next-auth/react";
import { Activity, Droplets, AlertTriangle, Clock, CheckCircle2, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoutButton from "@/components/auth/LogoutButton";

export default function DashboardPage() {
  const { data: session, status } = useSession();

  const isLoading = status === "loading";

  // Mock data - replace with actual data
  const stats = [
    { 
      title: "Total Animals", 
      value: "42", 
      icon: <Users className="h-5 w-5 text-primary" />,
      change: "+2 from last week"
    },
    { 
      title: "Milk Production", 
      value: "128 L", 
      icon: <Droplets className="h-5 w-5 text-blue-500" />,
      change: "+5% from yesterday"
    },
    { 
      title: "Active Alerts", 
      value: "3", 
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
      change: "1 new"
    },
    { 
      title: "Tasks Pending", 
      value: "5", 
      icon: <Clock className="h-5 w-5 text-amber-500" />,
      change: "2 overdue"
    }
  ];

  const recentActivities = [
    { id: 1, title: "Morning feed distributed", time: "2 hours ago", icon: CheckCircle2 },
    { id: 2, title: "Milk collected - 42L", time: "4 hours ago", icon: CheckCircle2 },
    { id: 3, title: "Health check completed", time: "1 day ago", icon: CheckCircle2 },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen w-full grid place-items-center p-6">
        <div className="w-full max-w-6xl space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-10 w-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 w-full bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"></div>
            ))}
          </div>
          <div className="h-96 w-full bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div key={index} className="rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">{stat.title}</h3>
              <div className="rounded-lg bg-primary/10 p-2">
                {stat.icon}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.change}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Quick Actions */}
        <div className="rounded-xl border bg-card p-6 shadow-sm md:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
            <Button variant="outline" size="sm">View All</Button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-24 flex-col items-center justify-center gap-2">
              <Droplets className="h-6 w-6 text-blue-500" />
              <span>Record Milk</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col items-center justify-center gap-2">
              <Activity className="h-6 w-6 text-emerald-500" />
              <span>Health Check</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col items-center justify-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <span>Report Issue</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col items-center justify-center gap-2">
              <Clock className="h-6 w-6 text-purple-500" />
              <span>Add Task</span>
            </Button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <div className="mt-4 space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-primary/10 p-1.5">
                  <activity.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
