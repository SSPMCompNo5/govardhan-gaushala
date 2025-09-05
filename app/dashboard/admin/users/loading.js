import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <section className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <div className="mb-3">
        <Skeleton className="h-7 w-72 mb-2" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="rounded-lg border bg-card shadow-sm p-4">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      </div>
    </section>
  );
}
