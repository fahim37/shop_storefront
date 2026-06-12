import { Skeleton } from "@/components/ui/skeleton";

/** PDP loading state: mirrors the gallery + info column above the fold. */
export default function ProductLoading() {
  return (
    <div className="wrap py-4 pb-16">
      {/* breadcrumb */}
      <Skeleton className="mb-4 h-4 w-64" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,560px)_1fr] lg:gap-10">
        {/* gallery */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
          <div className="flex gap-2.5 sm:flex-col">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="size-16 rounded-lg sm:size-[68px]" />
            ))}
          </div>
          <Skeleton className="aspect-square min-w-0 flex-1 rounded-2xl" />
        </div>

        {/* info column */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-8 w-3/5" />
          <Skeleton className="h-4 w-52" />

          <Skeleton className="mt-2 h-16 w-full rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-12 w-24 rounded-lg" />
            <Skeleton className="h-12 w-24 rounded-lg" />
          </div>
          <div className="flex gap-2.5">
            <Skeleton className="h-11 flex-1 rounded-[10px]" />
            <Skeleton className="h-11 flex-1 rounded-[10px]" />
            <Skeleton className="size-12 rounded-[10px]" />
          </div>
        </div>
      </div>

      {/* delivery strip */}
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
