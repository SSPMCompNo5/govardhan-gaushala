'use client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function AdminLayoutClient({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/?callbackUrl=' + encodeURIComponent('/admin'));
      return;
    }

    if (status === "authenticated" && session?.user?.role !== 'Owner/Admin') {
      router.push('/dashboard');
      return;
    }

    if (status === "authenticated" && session?.user?.role === 'Owner/Admin') {
      setIsAuthorized(true);
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <>
      {children}
    </>
  );
}
