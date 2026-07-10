"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Home,
  MapPin,
  Plus,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressFormDialog } from "@/components/account/address-form-dialog";
import { PhoneVerifyDialog } from "@/components/account/phone-verify-dialog";
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
  /** When set, the payment tile shows this logo image instead of a text badge. */
  logo?: string;
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
    hint: "Pay securely with your bKash wallet",
    badge: "bKash",
    badgeBg: "#e2136e",
    logo: "/bkash-logo.svg",
    enabled: true,
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
  const { status, openAuth, user } = useAuth();
  const router = useRouter();
  const { cart, isLoading: cartLoading } = useCart();
  const { data: addresses, isLoading: addrLoading } = useAddresses();
  const checkout = useCheckout();

  const verifiedPhone = user?.verifiedPhone ?? null;

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [payment, setPayment] = React.useState<PaymentMethod>("cod");
  const [agreed, setAgreed] = React.useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = React.useState(false);
  const [verifyOpen, setVerifyOpen] = React.useState(false);

  // "Place order" stays clickable even when requirements are missing; instead
  // of a silently disabled button we scroll to and flash the incomplete step.
  const [attention, setAttention] = React.useState<"address" | "terms" | null>(
    null,
  );
  const attentionTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const addressSectionRef = React.useRef<HTMLElement | null>(null);
  const agreeRef = React.useRef<HTMLLabelElement | null>(null);

  React.useEffect(
    () => () => {
      if (attentionTimer.current) clearTimeout(attentionTimer.current);
    },
    [],
  );

  const drawAttention = (
    target: "address" | "terms",
    el: HTMLElement | null,
  ) => {
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setAttention(target);
    if (attentionTimer.current) clearTimeout(attentionTimer.current);
    attentionTimer.current = setTimeout(() => setAttention(null), 2200);
  };

  // Derive the active address: the user's explicit pick, otherwise their
  // default (falling back to the first). Computed during render so it stays in
  // sync with `addresses` without an effect.
  const addressId =
    selectedId ??
    (addresses && addresses.length > 0
      ? (addresses.find((a) => a.isDefault) ?? addresses[0]).id
      : null);

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

  const hasAddresses = !!addresses && addresses.length > 0;

  const placeOrder = async () => {
    // A verified phone is encouraged, not required — an unverified customer can
    // still order and we confirm by a phone call. The only hard requirements
    // are a delivery address (which carries the contact number) and consent.
    if (!addressId) {
      toast.error(
        hasAddresses
          ? "Please select a delivery address"
          : "Add a delivery address to place your order",
      );
      drawAttention("address", addressSectionRef.current);
      return;
    }
    if (!agreed) {
      toast.error("Please agree to the policies to place your order");
      drawAttention("terms", agreeRef.current);
      return;
    }
    try {
      const res = await checkout.mutateAsync({
        shippingAddressId: addressId,
        paymentMethod: payment,
      });
      // Online methods (bKash / SSLCommerz) return a hosted-page URL — hand the
      // browser off to the gateway to collect payment. The gateway redirects
      // back to /checkout/return|failed|cancelled once the customer is done.
      if (res.paymentSessionUrl) {
        toast.success("Redirecting to bKash…", {
          description: "Complete your payment to confirm the order.",
        });
        window.location.assign(res.paymentSessionUrl);
        return;
      }
      // COD (and any method that settles inline): straight to the order.
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
          {/* Verify phone — encouraged, not required. An unverified customer
              can still place the order; we simply confirm it by a phone call. */}
          {!verifiedPhone && (
            <section className="flex flex-col gap-3 rounded-2xl border border-amber/40 bg-amber-soft p-5 sm:flex-row sm:items-center">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-amber/20 text-amber-deep">
                <Smartphone className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-extrabold text-ink">
                  Verify your number for a smoother delivery
                  <span className="rounded-full bg-amber/25 px-2 py-0.5 text-2xs font-extrabold uppercase tracking-wide text-amber-deep">
                    Optional
                  </span>
                </p>
                <p className="text-13 text-sub">
                  A verified number lets us reach you instantly about your order.
                  You can place your order without it — we&apos;ll just call to
                  confirm before delivery.
                </p>
              </div>
              <Button
                variant="outline"
                className="shrink-0"
                onClick={() => setVerifyOpen(true)}
              >
                <Smartphone className="size-4" /> Verify now
              </Button>
            </section>
          )}

          {/* 1. Address */}
          <section
            ref={addressSectionRef}
            className={cn(
              "overflow-hidden rounded-2xl border border-border bg-card transition-shadow duration-300",
              attention === "address" && "ring-2 ring-amber ring-offset-2",
            )}
          >
            <StepHead n={1} title="Delivery address">
              {hasAddresses && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/account/addresses">Manage</Link>
                </Button>
              )}
            </StepHead>
            <div className="p-5">
              {addrLoading ? (
                <Spinner />
              ) : !hasAddresses ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center">
                  <span className="flex size-11 items-center justify-center rounded-full bg-blue-soft text-primary">
                    <MapPin className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink">
                      Where should we deliver your order?
                    </p>
                    <p className="mt-0.5 text-sm text-sub">
                      Add a delivery address — it only takes a minute.
                    </p>
                  </div>
                  <Button onClick={() => setAddressDialogOpen(true)}>
                    <Plus className="size-4" /> Add delivery address
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
                        onClick={() => setSelectedId(a.id)}
                        className={cn(
                          "rounded-xl border p-4 text-left transition-colors",
                          on
                            ? "border-primary shadow-[0_0_0_3px_oklch(0.52_0.2_259/0.1)]"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-soft px-2.5 py-0.5 text-11 font-extrabold text-primary">
                            {a.label?.toLowerCase() === "office" ? (
                              <Store className="size-3" />
                            ) : (
                              <Home className="size-3" />
                            )}
                            {a.label ?? "Address"}
                          </span>
                          {a.isDefault && (
                            <span className="text-2xs font-extrabold uppercase tracking-wide text-faint">
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
                        <b className="block text-13 font-extrabold">
                          {[a.recipientName, a.recipientPhone]
                            .filter(Boolean)
                            .join(" · ")}
                        </b>
                        <p className="mt-0.5 text-xs font-semibold text-sub">
                          {[a.streetAddress, a.upazila, a.district]
                            .filter((p) => !!p && p.trim().length > 0)
                            .join(", ")}
                          {a.postcode ? ` — ${a.postcode}` : ""}
                        </p>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setAddressDialogOpen(true)}
                    className="flex min-h-[104px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-13 font-bold text-sub transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    <Plus className="size-5" />
                    Add new address
                  </button>
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
                  className="flex items-center gap-3 border-b border-[oklch(0.96_0.005_258)] py-2.5 text-13 last:border-b-0"
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
                    {p.logo ? (
                      <span className="flex h-8 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-white px-1.5">
                        {/* Official bKash logo — served from /public. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.logo}
                          alt={p.label}
                          className="h-4 w-auto"
                          decoding="async"
                        />
                      </span>
                    ) : (
                      <span
                        className="flex h-8 w-11 shrink-0 items-center justify-center rounded-md text-2xs font-extrabold text-white"
                        style={{ background: p.badgeBg }}
                      >
                        {p.badge}
                      </span>
                    )}
                    <span className="flex-1">
                      <b className="block text-13 font-extrabold">{p.label}</b>
                      <span className="text-xs font-semibold text-faint">{p.hint}</span>
                    </span>
                    {!p.enabled && (
                      <span className="shrink-0 rounded-full bg-amber-soft px-2 py-0.5 text-2xs font-extrabold uppercase tracking-wide text-amber-deep">
                        Soon
                      </span>
                    )}
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
          <div className="mt-4 flex flex-col gap-3 text-13">
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
            <span className="text-sm font-extrabold">Grand total</span>
            <span className="font-display text-2xl font-extrabold text-primary">
              {formatPaisa(cart.grandTotalPaisa)}
            </span>
          </div>

          {!addrLoading && !hasAddresses && (
            <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-amber-soft p-3">
              <MapPin className="size-4 shrink-0 text-amber-deep" />
              <p className="min-w-0 flex-1 text-xs font-semibold leading-snug text-amber-deep">
                <b className="block font-extrabold">No delivery address yet</b>
                Add one to place your order.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => setAddressDialogOpen(true)}
              >
                <Plus className="size-4" /> Add
              </Button>
            </div>
          )}

          <label
            ref={agreeRef}
            className={cn(
              "mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg p-2 text-xs font-semibold text-sub transition-colors duration-300",
              attention === "terms" && "bg-amber-soft ring-2 ring-amber",
            )}
          >
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
            className="mt-3"
            loading={checkout.isPending}
            onClick={placeOrder}
          >
            Place order · {formatPaisa(cart.grandTotalPaisa)}
          </Button>

          <div className="mt-4 flex flex-col gap-2 text-xs font-bold text-sub">
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

      <AddressFormDialog
        open={addressDialogOpen}
        onOpenChange={setAddressDialogOpen}
      />
      <PhoneVerifyDialog open={verifyOpen} onOpenChange={setVerifyOpen} />
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
      <span className="flex size-7 items-center justify-center rounded-lg bg-blue-deep text-13 font-extrabold text-white">
        {n}
      </span>
      <h3 className="font-display text-15 font-extrabold">{title}</h3>
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
