"use client";

import React from "react";

export default function Unauthorized() {
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => { 
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full h-48 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Unauthorized</h1>
        <p className="text-gray-500 mt-2">You do not have permission to access this page.</p>
      </div>
    </div>
  );
}
