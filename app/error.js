"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full border rounded-lg p-6 text-center">
        <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
        <p className="text-sm text-muted-foreground mb-4">An unexpected error occurred. Try again.</p>
        <button
          type="button"
          aria-label="Retry"
          onClick={() => reset()}
          className="inline-flex items-center justify-center rounded-md border px-4 py-2"
        >
          Retry
        </button>
      </div>
    </div>
  );
}


