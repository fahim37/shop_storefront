"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, XCircle, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type PaymentOutcome = "success" | "pending" | "failed" | "cancelled";

function resolveOutcome(status: string | null, fallback: PaymentOutcome): PaymentOutcome {
  switch (status) {
    case "success":
      return "success";
    case "pending":
      return "pending";
    case "cancel":
    case "cancelled":
      return "cancelled";
    case "failure":
    case "failed":
      return "failed";
    default:
      return fallback;
  }
}

const COPY: Record<
  PaymentOutcome,
  {
    icon: React.ComponentType<{ className?: string }>;
    tint: string;
    ring: string;
    title: string;
    body: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    tint: "text-green",
    ring: "bg-green/10 ring-green/20",
    title: "Payment successful",
    body: "Your bKash payment went through and your order is confirmed. A receipt is on its way.",
  },
  pending: {
    icon: Clock,
    tint: "text-amber-deep",
    ring: "bg-amber-soft ring-amber/30",
    title: "Confirming your payment",
    body: "We're verifying this payment with bKash. This usually takes a moment — your order will update automatically once it clears.",
  },
  failed: {
    icon: XCircle,
    tint: "text-red",
    ring: "bg-red/10 ring-red/20",
    title: "Payment failed",
    body: "We couldn't complete your bKash payment, so the order was cancelled and no money was taken. The items are back in stock — you can order them again anytime.",
  },
  cancelled: {
    icon: Ban,
    tint: "text-faint",
    ring: "bg-muted ring-border",
    title: "Payment cancelled",
    body: "You cancelled the bKash payment, so the order was cancelled and no money was taken. The items are back in stock — you can order them again anytime.",
  },
};

/**
 * Landing card the customer sees after bKash redirects back through the
 * backend callback. The backend has already run Execute Payment, so by the
 * time we render here the order is settled — we just report the outcome.
 *
 * Query params (set by the backend callback): status, orderId, order, trxID.
 * `defaultOutcome` covers the /failed and /cancelled routes where the URL
 * implies the result even without a status param.
 */
export function PaymentResult({ defaultOutcome }: { defaultOutcome: PaymentOutcome }) {
  const params = useSearchParams();
  const router = useRouter();
  const outcome = resolveOutcome(params.get("status"), defaultOutcome);
  const orderId = params.get("orderId");
  const orderNumber = params.get("order");
  const trxID = params.get("trxID");

  const copy = COPY[outcome];
  const Icon = copy.icon;

  // On success, glide to the order after a beat — but leave a button so a
  // customer who wants to linger (or copy the trxID) isn't yanked away.
  React.useEffect(() => {
    if (outcome !== "success" || !orderId) return;
    const t = setTimeout(() => router.push(`/account/orders/${orderId}`), 6000);
    return () => clearTimeout(t);
  }, [outcome, orderId, router]);

  return (
    <div className="wrap flex justify-center py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 text-center shadow-sm">
        <span
          className={cn(
            "mx-auto flex size-16 items-center justify-center rounded-full ring-8",
            copy.ring,
          )}
        >
          <Icon className={cn("size-8", copy.tint)} />
        </span>

        {/* bKash brand chip — the method this result is for. */}
        <span className="mx-auto mt-4 flex w-max items-center gap-2 rounded-full border border-border bg-white px-3 py-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bkash-logo.svg" alt="bKash" className="h-4 w-auto" decoding="async" />
        </span>

        <h1 className="mt-4 font-display text-xl font-extrabold text-ink">{copy.title}</h1>
        <p className="mt-2 text-13 text-sub">{copy.body}</p>

        {(orderNumber || trxID) && (
          <dl className="mt-5 flex flex-col gap-2 rounded-xl bg-muted/60 p-4 text-13">
            {orderNumber && (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-faint">Order</dt>
                <dd className="font-extrabold text-ink">{orderNumber}</dd>
              </div>
            )}
            {trxID && (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-faint">bKash TrxID</dt>
                <dd className="font-mono font-bold text-ink">{trxID}</dd>
              </div>
            )}
          </dl>
        )}

        <div className="mt-6 flex flex-col gap-2.5">
          {outcome === "success" || outcome === "pending" ? (
            <>
              <Button asChild fullWidth>
                <Link href={orderId ? `/account/orders/${orderId}` : "/account/orders"}>
                  View your order
                </Link>
              </Button>
              <Button asChild variant="outline" fullWidth>
                <Link href="/">Continue shopping</Link>
              </Button>
            </>
          ) : (
            <>
              {/* The order was cancelled server-side and the cart already
                  cleared at checkout — /checkout and /cart are empty now, so
                  send the customer somewhere that actually helps. */}
              <Button asChild fullWidth>
                <Link href="/">Continue shopping</Link>
              </Button>
              <Button asChild variant="outline" fullWidth>
                <Link href={orderId ? `/account/orders/${orderId}` : "/account/orders"}>
                  View order details
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
