import { Skeleton } from "@/components/ui/skeleton";

/** Route-level fallback for the public shared-tool view. */
export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b-2 border-foreground bg-card px-4">
        <Skeleton className="size-6" />
        <Skeleton className="h-4 w-32" />
        <div className="flex-1" />
        <Skeleton className="size-8 shadow-nb-sm" />
      </header>

      {/* Preview body */}
      <main className="flex flex-1 justify-center px-4 py-8">
        <div className="w-full max-w-xl space-y-4">
          <Skeleton className="h-8 w-2/3 shadow-nb-sm" />
          <Skeleton className="h-24 w-full shadow-nb-sm" />
          <Skeleton className="h-10 w-full shadow-nb-sm" />
          <Skeleton className="h-32 w-full shadow-nb-sm" />
        </div>
      </main>

      {/* Footer */}
      <footer className="flex h-10 shrink-0 items-center justify-center border-t-2 border-foreground bg-card">
        <Skeleton className="h-3 w-28" />
      </footer>
    </div>
  );
}
