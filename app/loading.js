import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <section className="container grid min-h-dvh place-items-center">
      <div className="w-full max-w-sm">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6 text-center border-b">
            <Skeleton className="h-7 w-40 mx-auto mb-2" />
            <Skeleton className="h-4 w-56 mx-auto" />
          </div>
          <div className="p-6">
            <div className="grid gap-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-16 mt-2" />
              <Skeleton className="h-10 w-full" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
