"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Check,
  Home,
  MapPin,
  Plus,
  RotateCcw,
  ShieldCheck,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MediaImage } from "@/components/ui/media-image";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/api/http";
import { formatPaisa } from "@/lib/format";
import { useCart } from "@/lib/api/cart";
import { useAddresses } from "@/lib/api/account";
import { useCheckout } from "@/lib/api/orders";
import { useAuth } from "@/lib/auth/auth-context";
import type { PaymentMethod } from "@/lib/api/types";

const PAYMENTS: {
  id: PaymentMethod;
  label: string;
  hint: string;
  badge: string;
  badgeBg: string;
  enabled: boolean;
}[] = [
  {
    id: "cod",
    label: "Cash on delivery",
    hint: "Pay the rider when your order arrives",
    badge: "৳",
    badgeBg: "var(--green)",
    enabled: true,
  },
  {
    id: "bkash",
    label: "bKash",
    hint: "Online payment — coming soon",
    badge: "bKash",
    badgeBg: "oklch(0.5 0.21 350)",
    enabled: false,
  },
  {
    id: "sslcommerz",
    label: "Card / Mobile banking",
    hint: "Via SSLCommerz — coming soon",
    badge: "CARD",
    badgeBg: "var(--blue-strong)",
    enabled: false,
  },
];

export default function CheckoutPage() {
  const { status, openAuth } = useAuth();
  const router = useRouter();
  const { cart, isLoading: cartLoading } = useCart();
  const { data: addresses, isLoading: addrLoading } = useAddresses();
  const checkout = useCheckout();

  const [addressId, setAddressId] = React.useState<string | null>(null);
  const [payment, setPayment] = React.useState<PaymentMethod>("cod");
  const [agreed, setAgreed] = React.useState(false);

  // Default to the user's default address.
  React.useEffect(() => {
    if (!addressId && addresses && addresses.length > 0) {
      setAddressId((addresses.find((a) => a.isDefault) ?? addresses[0]).id);
    }
  }, [addresses, addressId]);

  if (status === "loading" || cartLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-7" />
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="wrap py-16">
        <EmptyState
          icon={<ShieldCheck className="size-6" />}
          title="Sign in to check out"
          description="Your cart is saved — sign in to place your order."
          action={<Button onClick={() => openAuth("login")}>Sign in</Button>}
        />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="wrap py-16">
        <EmptyState
          icon={<Store className="size-6" />}
          title="Nothing to check out"
          description="Add items to your cart first."
          action={
            <Button asChild>
              <Link href="/">Browse products</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const placeOrder = async () => {
    if (!addressId) {
      toast.error("Please select a delivery address");
      return;
    }
    if (!agreed) {
      toast.error("Please agree to the terms to continue");
      return;
    }
    try {
      const res = await checkout.mutateAsync({
        shippingAddressId: addressId,
        paymentMethod: payment,
      });
      toast.success("Order placed!", { description: res.order.orderNumber });
      router.push(`/account/orders/${res.order.id}`);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.code === "CART_ITEM_OUT_OF_STOCK"
            ? "An item went out of stock — please review your cart."
            : err.message
          : "Could not place your order.";
      toast.error(msg);
    }
  };

  return (
    <div className="wrap py-4">
      <Breadcrumbs items={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]} className="mb-4" />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* 1. Address */}
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <StepHead n={1} title="Delivery address">
              <Button asChild variant="outline" size="sm">
                <Link href="/account/addresses">
                  <Plus className="size-4" strokeWidth={2.6} /> Manage
                </Link>
              </Button>
            </StepHead>
            <div className="p-5">
              {addrLoading ? (
                <Spinner />
              ) : !addresses || addresses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <p className="mb-3 text-sm text-muted-foreground">
                    You have no saved addresses yet.
                  </p>
                  <Button asChild>
                    <Link href="/account/addresses">
                      <Plus className="size-4" /> Add delivery address
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {addresses.map((a) => {
                    const on = addressId === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setAddressId(a.id)}
                        className={cn(
                          "rounded-xl border p-4 text-left transition-colors",
                          on
                            ? "border-primary shadow-[0_0_0_3px_oklch(0.52_0.2_259/0.1)]"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-soft px-2.5 py-0.5 text-[11px] font-extrabold text-primary">
                            {a.label?.toLowerCase() === "office" ? (
                              <Store className="size-3" />
                            ) : (
                              <Home className="size-3" />
                            )}
                            {a.label ?? "Address"}
                          </span>
                          {a.isDefault && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wide text-faint">
                              Default
                            </span>
                          )}
                          <span
                            className={cn(
                              "ml-auto flex size-5 items-center justify-center rounded-full border-2",
                              on ? "border-primary" : "border-border",
                            )}
                          >
                            {on && <span className="size-2.5 rounded-full bg-primary" />}
                          </span>
                        </div>
                        <b className="block text-[13px] font-extrabold">
                          {a.recipientName} · {a.recipientPhone}
                        </b>
                        <p className="mt-0.5 text-[12px] font-semibold text-sub">
                          {a.streetAddress}, {a.upazila}, {a.district} — {a.postcode}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* 2. Items */}
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <StepHead n={2} title={`Order items · ${cart.items.length}`}>
              <span className="text-xs font-bold text-faint">
                {cart.vendorGroups.length} deliver{cart.vendorGroups.length === 1 ? "y" : "ies"}
              </span>
            </StepHead>
            <div className="px-5 py-3">
              {cart.items.map((line) => (
                <div
                  key={line.itemId}
                  className="flex items-center gap-3 border-b border-[oklch(0.96_0.005_258)] py-2.5 text-[13px] last:border-b-0"
                >
                  <span className="size-11 shrink-0 overflow-hidden rounded-lg">
                    <MediaImage mediaId={line.imageMediaId} variant="thumbnail" alt={line.productTitle} />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-bold">{line.productTitle}</span>
                  <span className="shrink-0 text-faint">× {line.quantity}</span>
                  <span className="shrink-0 font-extrabold text-primary">
                    {formatPaisa(line.lineTotalPaisa)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Payment */}
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <StepHead n={3} title="Payment method" />
            <div className="flex flex-col gap-2.5 p-5">
              {PAYMENTS.map((p) => {
                const on = payment === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!p.enabled}
                    onClick={() => p.enabled && setPayment(p.id)}
                    className={cn(
                      "flex items-center gap-3.5 rounded-xl border p-3.5 text-left transition-colors",
                      on ? "border-primary bg-blue-soft" : "border-border",
                      !p.enabled && "cursor-not-allowed opacity-55",
                    )}
                  >
                    <span
                      className="flex h-8 w-11 shrink-0 items-center justify-center rounded-md text-[10px] font-extrabold text-white"
                      style={{ background: p.badgeBg }}
                    >
                      {p.badge}
                    </span>
                    <span className="flex-1">
                      <b className="block text-[13px] font-extrabold">{p.label}</b>
                      <span className="text-[11.5px] font-semibold text-faint">{p.hint}</span>
                    </span>
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full border-2",
                        on ? "border-primary" : "border-border",
                      )}
                    >
                      {on && <span className="size-2.5 rounded-full bg-primary" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* summary */}
        <div className="h-max rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-44">
          <h3 className="font-display text-base font-extrabold">Order summary</h3>
          <div className="mt-4 flex flex-col gap-3 text-[13px]">
            <Row label="Subtotal">{formatPaisa(cart.subtotalPaisa)}</Row>
            <Row label="Shipping">{formatPaisa(cart.shippingTotalPaisa)}</Row>
            <Row label="VAT">{cart.vatPaisa === "0" ? "Included" : formatPaisa(cart.vatPaisa)}</Row>
            {cart.appliedCoupon && (
              <div className="flex justify-between font-semibold text-green">
                <span>Voucher · {cart.appliedCoupon.code}</span>
                <span>−{formatPaisa(cart.discountPaisa)}</span>
              </div>
            )}
          </div>
          <div className="mt-4 flex items-baseline justify-between border-t border-dashed border-border pt-4">
            <span className="text-[13.5px] font-extrabold">Grand total</span>
            <span className="font-display text-2xl font-extrabold text-primary">
              {formatPaisa(cart.grandTotalPaisa)}
            </span>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[12px] font-semibold text-sub">
            <Checkbox
              checked={agreed}
              onCheckedChange={(c) => setAgreed(c === true)}
              className="mt-0.5 size-[18px]"
            />
            <span>
              I agree to the{" "}
              <Link href="/pages/terms" className="font-bold text-primary">
                Terms
              </Link>
              ,{" "}
              <Link href="/pages/privacy" className="font-bold text-primary">
                Privacy
              </Link>{" "}
              and Return policies of GCL.
            </span>
          </label>

          <Button
            variant="accent"
            fullWidth
            size="lg"
            className="mt-4"
            loading={checkout.isPending}
            disabled={!addressId || !agreed}
            onClick={placeOrder}
          >
            Place order · {formatPaisa(cart.grandTotalPaisa)}
          </Button>

          <div className="mt-4 flex flex-col gap-2 text-[12px] font-bold text-sub">
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-green" /> Payment data encrypted end-to-end
            </span>
            <span className="flex items-center gap-2">
              <Banknote className="size-4 text-green" /> COD available nationwide
            </span>
            <span className="flex items-center gap-2">
              <RotateCcw className="size-4 text-green" /> 7-day returns on all items
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepHead({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-5 py-4">
      <span className="flex size-7 items-center justify-center rounded-lg bg-blue-deep text-[13px] font-extrabold text-white">
        {n}
      </span>
      <h3 className="font-display text-[15px] font-extrabold">{title}</h3>
      {children && <span className="ml-auto">{children}</span>}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between font-semibold text-sub">
      <span>{label}</span>
      <b className="text-ink">{children}</b>
    </div>
  );
}
