"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Camera,
  CheckCircle2,
  PackageX,
  Truck,
  Undo2,
  XCircle,
} from "lucide-react";
import { useReturnDetail } from "@/lib/api/returns";
import {
  returnReasonLabel,
  returnStepIndex,
  RETURN_STATUS,
  RETURN_STEPS,
} from "@/lib/orders/return-meta";
import { formatDate, formatDateTime } from "@/lib/format";
import { ApiError } from "@/lib/api/http";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { MediaImage } from "@/components/ui/media-image";
import type {
  ReturnLineItem,
  ReturnShipmentInfo,
  ReturnView,
} from "@/lib/api/types";

export default function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useReturnDetail(id);

  const notFound = isError && error instanceof ApiError && error.status === 404;

  if (isLoading) {
    return <ReturnDetailSkeleton />;
  }

  if (notFound || (isError && !data)) {
    return (
      <EmptyState
        icon={<PackageX className="size-6" />}
        title="Return not found"
        description="We couldn’t find this return request. It may have been removed or the link is incorrect."
        action={
          <Button asChild variant="outline" size="md">
            <Link href="/account/returns">Back to returns</Link>
          </Button>
        }
      />
    );
  }

  if (!data) return null;

  return <ReturnDetail view={data} />;
}

function ReturnDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-4 w-28" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}

function ReturnDetail({ view }: { view: ReturnView }) {
  const { request, items, shipment } = view;
  const status = RETURN_STATUS[request.status];
  const failed = request.status === "rejected" || request.status === "disputed";

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="space-y-4">
        <Link
          href="/account/returns"
          className="hidden w-fit items-center gap-1.5 text-sm font-semibold text-sub transition-colors hover:text-primary lg:inline-flex"
        >
          <ArrowLeft className="size-4" />
          Back to returns
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display text-xl font-extrabold text-ink sm:text-2xl">
            Return · {returnReasonLabel(request.reasonCode)}
          </h1>
          <Badge variant={status.variant} size="md">
            {status.label}
          </Badge>
        </div>
        <p className="-mt-2 text-sm text-sub">
          Requested on {formatDate(request.createdAt)}
        </p>
      </div>

      {/* Progress / outcome */}
      {failed ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red/25 bg-red/5 p-4 sm:p-5">
          <XCircle className="mt-0.5 size-5 shrink-0 text-red" />
          <div>
            <p className="text-sm font-extrabold text-ink">{status.label}</p>
            <p className="mt-1 text-sm text-sub">{status.blurb}</p>
            {request.approvalNotes && (
              <p className="mt-2 rounded-xl bg-card px-3 py-2 text-13 text-sub">
                {request.approvalNotes}
              </p>
            )}
          </div>
        </div>
      ) : (
        <ReturnStepper view={view} />
      )}

      {/* Items */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <header className="border-b border-line bg-surface/60 px-4 py-3 sm:px-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-extrabold text-ink">
            <Undo2 className="size-4 text-primary" />
            Items in this return
          </h2>
        </header>
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id}>
              <ReturnItemRow item={item} headlineReason={request.reasonCode} />
            </li>
          ))}
        </ul>
      </section>

      {/* Pickup / reverse shipment */}
      {shipment && <PickupCard shipment={shipment} />}

      {/* Request details */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
        <h2 className="mb-3 font-display text-sm font-extrabold text-ink">
          Request details
        </h2>
        <dl className="space-y-2.5 text-sm">
          <DetailRow label="Reason" value={returnReasonLabel(request.reasonCode)} />
          <DetailRow
            label="Refund method"
            value={
              request.refundPreference === "wallet"
                ? "Store wallet credit"
                : "Original payment method"
            }
            icon={<Banknote className="size-3.5 text-faint" />}
          />
          {request.description && (
            <div>
              <dt className="text-sub">Your note</dt>
              <dd className="mt-1 rounded-xl bg-muted/50 px-3 py-2 text-13 leading-relaxed text-ink">
                {request.description}
              </dd>
            </div>
          )}
          {(request.photos?.length ?? 0) > 0 && (
            <DetailRow
              label="Photos attached"
              value={`${request.photos?.length} photo${
                (request.photos?.length ?? 0) > 1 ? "s" : ""
              }`}
              icon={<Camera className="size-3.5 text-faint" />}
            />
          )}
          {request.approvedAt && (
            <DetailRow label="Approved" value={formatDateTime(request.approvedAt)} />
          )}
          {request.resolvedAt && (
            <DetailRow
              label={request.status === "refunded" ? "Refunded" : "Resolved"}
              value={formatDateTime(request.resolvedAt)}
            />
          )}
        </dl>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stepper                                                             */
/* ------------------------------------------------------------------ */

function ReturnStepper({ view }: { view: ReturnView }) {
  const { request } = view;
  const status = RETURN_STATUS[request.status];
  const step = returnStepIndex(request.status);
  const done = request.status === "refunded";

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex items-start gap-3">
        {done ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green" />
        ) : (
          <Truck className="mt-0.5 size-5 shrink-0 text-primary" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-ink">{status.label}</p>
          <p className="mt-0.5 text-13 text-sub">{status.blurb}</p>
        </div>
      </div>

      {/* Rail */}
      <ol className="mt-4 flex items-center gap-1.5">
        {RETURN_STEPS.map((s, i) => (
          <li key={s.key} className="flex flex-1 flex-col gap-1.5">
            <span
              className={cn(
                "h-1.5 rounded-full transition-colors",
                i <= step ? (done ? "bg-green" : "bg-accent") : "bg-line",
              )}
            />
            <span
              className={cn(
                "text-center text-2xs font-bold sm:text-11",
                i <= step ? "text-ink" : "text-faint",
              )}
            >
              {s.label}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Items                                                               */
/* ------------------------------------------------------------------ */

function ReturnItemRow({
  item,
  headlineReason,
}: {
  item: ReturnLineItem;
  headlineReason: string;
}) {
  const productHref = item.productSlug ? `/product/${item.productSlug}` : null;
  // Only surface the per-item reason when it differs from the headline.
  const itemReason =
    item.reasonCode && item.reasonCode !== headlineReason
      ? returnReasonLabel(item.reasonCode)
      : null;

  const media = (
    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
      <MediaImage
        mediaId={item.thumbnailMediaId}
        variant="thumbnail"
        alt={item.productTitle ?? "Returned item"}
      />
    </div>
  );

  const info = (
    <div className="min-w-0 flex-1">
      <p className="line-clamp-2 text-sm font-semibold text-ink">
        {item.productTitle ?? "Item no longer available"}
      </p>
      <p className="mt-0.5 text-xs text-faint">
        Qty {item.quantity}
        {itemReason ? ` · ${itemReason}` : ""}
      </p>
    </div>
  );

  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 sm:px-5">
      {productHref ? (
        <Link href={productHref} className="flex min-w-0 flex-1 items-center gap-3">
          {media}
          {info}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {media}
          {info}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pickup card                                                         */
/* ------------------------------------------------------------------ */

const SHIPMENT_STATUS_LABEL: Record<ReturnShipmentInfo["status"], string> = {
  scheduled: "Pickup scheduled",
  picked_up: "Picked up",
  in_transit: "In transit to hub",
  at_hub: "Arrived at hub",
  qc_passed: "Inspection passed",
  qc_failed: "Inspection failed",
};

function PickupCard({ shipment }: { shipment: ReturnShipmentInfo }) {
  const courier = shipment.courier === "pathao" ? "Pathao" : "Our courier";

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-extrabold text-ink">
        <Truck className="size-4 text-primary" />
        Pickup
      </h2>
      <dl className="space-y-2.5 text-sm">
        <DetailRow label="Courier" value={courier} />
        <DetailRow
          label="Status"
          value={SHIPMENT_STATUS_LABEL[shipment.status] ?? shipment.status}
        />
        {shipment.trackingNumber && (
          <DetailRow label="Tracking number" value={shipment.trackingNumber} mono />
        )}
        {shipment.qcOutcome && (
          <DetailRow
            label="Inspection"
            value={shipment.qcOutcome === "pass" ? "Passed" : "Failed"}
          />
        )}
        {shipment.qcNotes && (
          <div>
            <dt className="text-sub">Inspection notes</dt>
            <dd className="mt-1 rounded-xl bg-muted/50 px-3 py-2 text-13 leading-relaxed text-ink">
              {shipment.qcNotes}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

function DetailRow({
  label,
  value,
  icon,
  mono = false,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex items-center gap-1.5 text-sub">
        {icon}
        {label}
      </dt>
      <dd
        className={cn(
          "text-right font-semibold text-ink",
          mono && "font-mono text-13",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
