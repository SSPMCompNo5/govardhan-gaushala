import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <section className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <div className="mb-3">
        <Skeleton className="h-7 w-64 mb-2" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="rounded-lg border bg-card shadow-sm p-4">
        <Skeleton className="h-5 w-48 mb-3" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      </div>
    </section>
  );
}
