import { Skeleton } from "@/components/ui/skeleton";

/** Route-level fallback — matches ToolsSkeleton/BuilderSkeleton/PaletteSkeleton exactly. */
export default function Loading() {
  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      {/* Topbar */}
      <div className="flex items-center gap-2 border-b-2 border-foreground bg-card px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Skeleton className="size-6" />
          Toolkit Studio
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-7 w-14" />
          <Skeleton className="size-7" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* ToolsSkeleton */}
        <aside className="relative flex w-87.5 shrink-0 flex-col border-r-2 border-foreground">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b-2 border-foreground px-4">
            <span className="text-sm font-bold">Tools</span>
            <div className="ml-auto flex items-center gap-2">
              <Skeleton className="size-8 border-2 border-foreground shadow-nb-sm" />
              <Skeleton className="size-8 border-2 border-foreground shadow-nb-sm" />
            </div>
          </div>
          <div className="border-b-2 border-foreground px-3 py-2.5">
            <Skeleton className="h-8 w-full border-2 border-foreground" />
          </div>
          <div className="flex-1 overflow-auto p-2">
            <div className="flex flex-col gap-1">
              {[50, 67, 84, 61, 78, 55, 72].map((w, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 border-2 border-foreground bg-card px-2.5 py-2"
                >
                  <Skeleton className="size-1.5 shrink-0 rounded-full border-0" />
                  <Skeleton
                    className="h-3 flex-1 border-0"
                    style={{ width: `${w}%` }}
                  />
                  <Skeleton className="size-7 shrink-0 rounded-md border-0" />
                </div>
              ))}
            </div>
          </div>
          <div className="border-t-2 border-foreground p-3">
            <Skeleton className="h-9 w-full border-2 border-foreground" />
          </div>
        </aside>

        {/* BuilderSkeleton */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b-2 border-foreground px-4">
            <span className="text-sm font-bold">Builder</span>
            <Skeleton className="h-3 w-28 border-0" />
            <div className="ml-auto">
              <Skeleton className="h-7 w-24 border-0" />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 sm:p-6">
            <div className="mx-auto flex max-w-2xl flex-col">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col">
                  {i > 0 && (
                    <span
                      className="mx-auto h-5 w-0 border-l-2 border-foreground"
                      aria-hidden
                    />
                  )}
                  <div className="flex items-start gap-3 border-2 border-foreground bg-card p-2.5">
                    <Skeleton className="size-8 shrink-0 border-2 border-foreground/15" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
                      <Skeleton className="h-2.5 w-20 border-0" />
                      <Skeleton className="h-2 w-36 border-0" />
                    </div>
                    <Skeleton className="size-6 shrink-0 rounded-md border-0" />
                  </div>
                </div>
              ))}
              <span
                className="mx-auto h-5 w-0 border-l border-dashed border-border"
                aria-hidden
              />
              <Skeleton className="h-14 border-2 border-dashed border-foreground/40" />
            </div>
          </div>
        </main>

        {/* PaletteSkeleton — groups: Data(1), Inputs(8), Logic(3), Website Site(5) */}
        <aside className="flex w-100 shrink-0 flex-col border-l-2 border-foreground">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b-2 border-foreground px-4">
            <span className="text-sm font-bold">Node</span>
          </div>
          <div className="flex-1 overflow-auto p-3">
            <div className="flex flex-col gap-4">
              {[1, 8, 3, 5].map((count, gi) => (
                <div key={gi} className="flex flex-col gap-1.5">
                  <Skeleton className="mx-1 h-2 w-12 border-0" />
                  <div className="flex flex-col gap-1.5">
                    {Array.from({ length: count }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 border-2 border-foreground bg-card p-2.5"
                      >
                        <Skeleton className="size-8 shrink-0 border-2 border-foreground/15" />
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
                          <Skeleton className="h-2.5 w-20 border-0" />
                          <Skeleton className="h-2 w-36 border-0" />
                        </div>
                        <Skeleton className="size-6 shrink-0 rounded-md border-0" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
