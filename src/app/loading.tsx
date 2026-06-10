import { Skeleton } from "@/components/ui/skeleton";

/** Route-level fallback for the Tool Builder workspace. */
export default function Loading() {
  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Topbar */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b-2 border-foreground bg-card px-4">
        <Skeleton className="size-6" />
        <Skeleton className="h-4 w-40" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Three-pane body */}
      <div className="flex min-h-0 flex-1">
        {/* Tools sidebar */}
        <aside className="hidden w-87.5 shrink-0 flex-col border-r-2 border-foreground md:flex">
          {/* Header */}
          <div className="flex h-12 shrink-0 items-center gap-2 border-b-2 border-foreground px-4">
            <span className="text-sm font-bold">Tools</span>
            <div className="ml-auto flex items-center gap-2">
              <Skeleton className="size-8 shadow-nb-sm" />
              <Skeleton className="size-8 shadow-nb-sm" />
            </div>
          </div>
          {/* Search */}
          <div className="border-b-2 border-foreground px-3 py-2.5">
            <Skeleton className="h-8 w-full" />
          </div>
          {/* List */}
          <div className="flex flex-1 flex-col gap-1 p-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-2.5 py-2">
                <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/30" />
                <Skeleton className="h-3 w-2/3 border-0" />
              </div>
            ))}
          </div>
          {/* Footer */}
          <div className="border-t-2 border-foreground p-3">
            <Skeleton className="h-9 w-full shadow-nb" />
          </div>
        </aside>

        {/* Builder canvas — centered vertical node chain */}
        <main className="min-w-0 flex-1 overflow-hidden p-4 sm:p-6">
          <div className="mx-auto flex max-w-2xl flex-col">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col">
                {i > 0 && (
                  <span
                    className="mx-auto h-5 w-0 border-l-2 border-foreground"
                    aria-hidden
                  />
                )}
                <div className="flex h-14 items-center gap-2.5 border-2 border-foreground bg-card p-2.5 shadow-nb">
                  <Skeleton className="size-8 shrink-0" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3 w-24 border-0" />
                    <Skeleton className="h-2.5 w-36 border-0" />
                  </div>
                </div>
              </div>
            ))}
            <span
              className="mx-auto h-5 w-0 border-l border-dashed border-border"
              aria-hidden
            />
            <div className="flex h-14 items-center justify-center border-2 border-dashed border-foreground/40">
              <Skeleton className="h-3 w-24 border-0" />
            </div>
          </div>
        </main>

        {/* Inspector */}
        <aside className="hidden w-100 shrink-0 flex-col gap-3 border-l-2 border-foreground p-4 lg:flex">
          <Skeleton className="h-6 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </aside>
      </div>
    </div>
  );
}
