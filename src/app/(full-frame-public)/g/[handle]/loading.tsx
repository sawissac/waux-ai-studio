import { Skeleton } from "@/components/ui/skeleton";

/** Route-level fallback for the public gallery view. */
export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b-2 border-foreground bg-card px-4">
        <Skeleton className="size-6" />
        <Skeleton className="h-4 w-40" />
      </header>

      {/* Card grid */}
      <main className="flex-1 px-4 py-10">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-8 space-y-2">
            <Skeleton className="h-9 w-64 shadow-nb-sm" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full shadow-nb-sm" />
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex h-10 shrink-0 items-center justify-center border-t-2 border-foreground bg-card">
        <Skeleton className="h-3 w-28" />
      </footer>
    </div>
  );
}
