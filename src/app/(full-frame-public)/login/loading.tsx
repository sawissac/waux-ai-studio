import { Skeleton } from "@/components/ui/skeleton";

/** Route-level fallback for the login/sign-up page (soft card aesthetic). */
export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Wordmark */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Skeleton soft className="size-8 rounded-lg" />
            <Skeleton soft className="h-5 w-28" />
          </div>
          <Skeleton soft className="h-4 w-40" />
        </div>

        {/* Form card */}
        <div className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <div className="space-y-1.5">
            <Skeleton soft className="h-4 w-14" />
            <Skeleton soft className="h-9 w-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton soft className="h-4 w-20" />
            <Skeleton soft className="h-9 w-full" />
          </div>
          <Skeleton soft className="h-9 w-full" />
        </div>

        <Skeleton soft className="mx-auto h-4 w-48" />
      </div>
    </div>
  );
}
