"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCw, Loader2 } from "lucide-react";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 800);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Set initial state
    setIsOnline(navigator.onLine);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md h-64 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      </div>
    );
  }

  if (isOnline) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-bold">You&apos;re back online!</h1>
          <p className="text-muted-foreground">You can now continue using the application.</p>
          <Button asChild className="mt-4">
            <Link href="/">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md space-y-6">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-yellow-50 dark:bg-yellow-900/30">
            <WifiOff className="size-10 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">No Internet Connection</h1>
        <p className="text-muted-foreground">
          You&apos;re currently offline. Some features may not be available, but you can still access cached data.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="size-4" />
            Retry
          </Button>
          <Button asChild>
            <Link href="/">Go to Home</Link>
          </Button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Emergency Contacts
          </h3>
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <p>Admin: +91-9876543210</p>
            <p>Doctor: +91-9876543211</p>
            <p>Emergency: 108</p>
          </div>
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p className="font-medium mb-2">Available offline:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>View cached data</li>
            <li>Basic navigation</li>
            <li>Help documentation</li>
            <li>Emergency contacts</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
