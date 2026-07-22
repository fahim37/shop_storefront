"use client";

import * as React from "react";
import Link from "next/link";
import { PackageOpen, Undo2 } from "lucide-react";
import { useMyReturns } from "@/lib/api/returns";
import { returnReasonLabel, RETURN_STATUS } from "@/lib/orders/return-meta";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { MediaImage } from "@/components/ui/media-image";
import { cn } from "@/lib/utils";
import type { ReturnListItem } from "@/lib/api/types";

/** Coarse tab buckets over the return status. */
type ReturnFilter = "all" | "open" | "refunded" | "rejected";

const FILTERS: { key: ReturnFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "In progress" },
  { key: "refunded", label: "Refunded" },
  { key: "rejected", label: "Rejected" },
];

function bucketOf(r: ReturnListItem): Exclude<ReturnFilter, "all"> {
  if (r.status === "refunded") return "refunded";
  if (r.status === "rejected" || r.status === "disputed") return "rejected";
  return "open"; // requested + approved + in_transit + at_hub
}

export default function ReturnsPage() {
  const { data: returns, isLoading, isError } = useMyReturns();
  const [filter, setFilter] = React.useState<ReturnFilter>("all");

  const counts = React.useMemo(() => {
    const c: Record<ReturnFilter, number> = {
      all: 0,
      open: 0,
      refunded: 0,
      rejected: 0,
    };
    for (const r of returns ?? []) {
      c.all += 1;
      c[bucketOf(r)] += 1;
    }
    return c;
  }, [returns]);

  const visible = React.useMemo(() => {
    const list = returns ?? [];
    if (filter === "all") return list;
    return list.filter((r) => bucketOf(r) === filter);
  }, [returns, filter]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-extrabold text-ink sm:text-2xl">
          Returns &amp; refunds
        </h1>
        <p className="mt-1 text-sm text-sub">
          Track your return requests and refunds. Start a return from a
          delivered item in your order history.
        </p>
      </div>

      {/* Filter tabs */}
      {!isLoading && !isError && (returns?.length ?? 0) > 0 && (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count = counts[f.key];
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-2 text-13 font-bold transition-colors",
                  active
                    ? "border-blue-deep bg-blue-deep text-white"
                    : "border-border bg-card text-sub hover:bg-muted",
                )}
              >
                {f.label}
                {count > 0 && (
                  <span className={cn("ml-1.5", active ? "text-white/70" : "text-faint")}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <ul className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i}>
              <ReturnCardSkeleton />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <EmptyState
          icon={<PackageOpen className="size-6" />}
          title="Couldn’t load your returns"
          description="Something went wrong while fetching your return requests. Please try again."
        />
      ) : !returns || returns.length === 0 ? (
        <EmptyState
          icon={<Undo2 className="size-6" />}
          title="No returns yet"
          description="If something arrives damaged or isn’t right, you can request a return from any delivered item."
          action={
            <Button asChild variant="accent" size="md">
              <Link href="/account/orders">View your orders</Link>
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<PackageOpen className="size-6" />}
          title={`No ${FILTERS.find((f) => f.key === filter)?.label.toLowerCase()} returns`}
          description="Try a different filter to see more of your returns."
          action={
            <Button variant="soft" size="md" onClick={() => setFilter("all")}>
              Show all returns
            </Button>
          }
        />
      ) : (
        <ul className="space-y-4">
          {visible.map((r) => (
            <li key={r.id}>
              <ReturnCard item={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReturnCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface/60 px-4 py-3 sm:px-5">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>
      <div className="flex items-center gap-4 px-4 py-4 sm:px-5">
        <Skeleton className="size-16 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-10 w-28 rounded-md" />
      </div>
    </div>
  );
}

function ReturnCard({ item }: { item: ReturnListItem }) {
  const detailHref = `/account/returns/${item.id}`;
  const status = RETURN_STATUS[item.status];

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-pop)]">
      {/* Header: reason + date | status */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-surface/60 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <Link
            href={detailHref}
            className="block truncate font-display text-sm font-extrabold text-ink transition-colors hover:text-primary"
          >
            Return · {returnReasonLabel(item.reasonCode)}
          </Link>
          <p className="mt-0.5 text-xs font-medium text-sub">
            Requested {formatDate(item.createdAt)}
            {item.vendorName ? ` · ${item.vendorName}` : ""}
          </p>
        </div>
        <Badge variant={status.variant} size="lg">
          {status.label}
        </Badge>
      </header>

      {/* Body: thumbnail · items · action */}
      <div className="flex items-center gap-4 px-4 py-4 sm:px-5">
        <Link
          href={detailHref}
          className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted"
        >
          <MediaImage
            mediaId={item.firstThumbnailMediaId}
            variant="thumbnail"
            alt={item.firstProductTitle ?? "Returned item"}
          />
        </Link>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold text-ink">
            {item.firstProductTitle ?? "Returned item"}
            {item.itemCount > 1 && (
              <span className="text-sub">
                {" "}
                +{item.itemCount - 1} more{" "}
                {item.itemCount - 1 === 1 ? "item" : "items"}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-sub">
            Refund to{" "}
            {item.refundPreference === "wallet"
              ? "store wallet"
              : "original payment method"}
          </p>
        </div>

        <Button asChild variant="soft" size="sm" className="shrink-0">
          <Link href={detailHref}>View details</Link>
        </Button>
      </div>
    </article>
  );
}
