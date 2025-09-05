"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function HelpPage() {
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => { 
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);
  
  if (loading) {
    return (
      <div className="min-h-screen w-full grid place-items-center p-4">
        <div className="w-full max-w-2xl h-96 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen w-full grid place-items-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Help & Support</CardTitle>
          <CardDescription>Quick answers and resources</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <section>
            <h2 className="text-sm font-medium text-muted-foreground">Common issues</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
              <li>Can’t sign in? Ensure your User ID and password are correct or contact an admin.</li>
              <li>Unauthorized page? Your role might not have access. Ask an admin to adjust permissions.</li>
              <li>Seed admin: visit /api/seed/admin?force=1 to recreate the admin account.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-sm font-medium text-muted-foreground">Contact</h2>
            <p className="mt-2 text-sm">For further assistance, reach your system administrator.</p>
          </section>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link href="/">Back to sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
