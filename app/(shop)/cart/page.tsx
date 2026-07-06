"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ShoppingBag,
  Store,
  Tag,
  Trash2,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaImage } from "@/components/ui/media-image";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { SectionHeader } from "@/components/layout/section-header";
import { ProductGrid } from "@/components/product/product-grid";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/api/http";
import { formatPaisa } from "@/lib/format";
import { visibleOptionEntries } from "@/lib/options";
import { fromRecHit } from "@/lib/api/card";
import {
  cartErrorMessage,
  useApplyCoupon,
  useCart,
  useCartCount,
  useCartItemQuantity,
  useRemoveCartItem,
  useRemoveCoupon,
} from "@/lib/api/cart";
import { useCartRecommendations } from "@/lib/api/search";
import type { CartLine } from "@/lib/api/types";

/**
 * Full cart page. Reached from the mobile bottom tab bar and the drawer's
 * "View cart"; the slide-in CartDrawer stays the quick view. Both render the
 * same TanStack Query snapshot (`qk.cart()`), so they can never disagree.
 *
 * Mobile-first: store-grouped cards, line controls under the info column, and
 * a sticky checkout bar that rides above the bottom tab bar (offset by the
 * measured `--bottom-nav-h`). Desktop keeps the two-column layout with a
 * sticky order summary.
 */
export default function CartPage() {
  const { cart, isLoading } = useCart();
  const count = useCartCount();
  const recs = useCartRecommendations(cart.items.length > 0);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-7" />
      </div>
    );
  }

  return (
    <div className="wrap py-4 md:py-5">
      <Breadcrumbs items={[{ label: "Cart" }]} className="mb-4 max-md:hidden" />

      {/* Mobile page header — the bottom tab bar lands here, so the page gets
          a proper title instead of the desktop breadcrumb trail. */}
      <div className="mb-3 flex items-center justify-between md:hidden">
        <h1 className="font-display text-xl font-extrabold">My cart</h1>
        {count > 0 && (
          <span className="rounded-full bg-blue-soft px-2.5 py-1 text-11 font-extrabold text-primary">
            {count} item{count === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {cart.items.length === 0 ? (
        <EmptyState
          className="my-10"
          icon={<ShoppingBag className="size-6" />}
          title="Your cart is empty"
          description="Add products and they'll show up here, grouped by store."
          action={
            <Button asChild>
              <Link href="/">Start shopping</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid items-start gap-4 lg:grid-cols-[1fr_340px] lg:gap-6">
            {/* lines, one card per store */}
            <div className="flex min-w-0 flex-col gap-3 md:gap-4">
              {cart.vendorGroups.map((group, gi) => (
                <div
                  key={group.vendorId}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]"
                >
                  <div className="flex items-center gap-2.5 border-b border-border bg-muted px-4 py-3 text-13 font-extrabold sm:px-5">
                    <Store className="size-4 text-primary" />
                    Store {gi + 1}
                    <span className="ml-auto text-xs font-bold text-faint">
                      Ships via Pathao · {formatPaisa(group.subtotalPaisa)}
                    </span>
                  </div>
                  {group.items.map((line) => (
                    <CartLineRow key={line.itemId} line={line} />
                  ))}
                </div>
              ))}

              {cart.vendorGroups.length > 1 && (
                <div className="flex items-center gap-2.5 rounded-xl bg-muted px-4 py-3 text-13 font-bold text-sub">
                  <Truck className="size-4 shrink-0 text-primary" />
                  Items from {cart.vendorGroups.length} stores will arrive as{" "}
                  {cart.vendorGroups.length} deliveries under one order.
                </div>
              )}
            </div>

            {/* summary */}
            <CartSummary />
          </div>

          {recs.data && recs.data.items.length > 0 && (
            <section className="mt-6 md:mt-8">
              <SectionHeader title="You may also like" subtitle="Goes well with your cart" />
              <ProductGrid
                products={recs.data.items.slice(0, 6).map(fromRecHit)}
                cols={5}
                flushRows
              />
            </section>
          )}

          {/* Mobile sticky checkout bar. Last element in the page wrapper so
              it stays pinned (just above the bottom tab bar) until the shopper
              reaches the end of the page, where it settles into the flow. */}
          <MobileCheckoutBar />
        </>
      )}
    </div>
  );
}

function CartLineRow({ line }: { line: CartLine }) {
  const setQuantity = useCartItemQuantity();
  const remove = useRemoveCartItem();

  return (
    <div className="flex gap-3 border-b border-[oklch(0.96_0.005_258)] px-4 py-4 last:border-b-0 sm:gap-4 sm:px-5">
      <Link
        href={`/product/${line.productSlug}`}
        className="size-20 shrink-0 overflow-hidden rounded-xl border border-[oklch(0.96_0.005_258)] sm:size-24"
      >
        <MediaImage mediaId={line.imageMediaId} variant="thumbnail" alt={line.productTitle} />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/product/${line.productSlug}`}
            className="line-clamp-2 text-13 font-bold leading-snug hover:text-primary sm:text-sm"
          >
            {line.productTitle}
          </Link>
          <button
            type="button"
            onClick={() => remove.mutate(line.itemId)}
            aria-label={`Remove ${line.productTitle}`}
            className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-full text-faint transition-[color,background-color,transform] duration-150 hover:bg-red/10 hover:text-red active:scale-90"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        {visibleOptionEntries(line.optionValues).length > 0 && (
          <span className="flex flex-wrap gap-1.5 text-11 font-bold text-faint">
            {visibleOptionEntries(line.optionValues).map(([k, v]) => (
              <span key={k} className="rounded bg-muted px-1.5 py-0.5">
                {v}
              </span>
            ))}
          </span>
        )}

        {line.priceChanged && (
          <span className="text-11 font-extrabold text-red">
            Price changed to {formatPaisa(line.livePricePaisa)}
          </span>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
          <span className="flex min-w-0 flex-col">
            <b className="font-display text-15 font-extrabold text-primary sm:text-base">
              {formatPaisa(line.lineTotalPaisa)}
            </b>
            {line.quantity > 1 && (
              <span className="text-11 font-semibold text-faint">
                {formatPaisa(line.unitPricePaisa)} each
              </span>
            )}
          </span>
          <QuantityStepper
            size="sm"
            value={line.quantity}
            max={line.maxQuantity}
            onChange={(q) =>
              setQuantity(line.itemId, q, (err) => toast.error(cartErrorMessage(err)))
            }
          />
        </div>
      </div>
    </div>
  );
}

/** Grand total + checkout CTA pinned above the mobile bottom tab bar. */
function MobileCheckoutBar() {
  const { cart } = useCart();
  const count = useCartCount();

  return (
    <div className="sticky bottom-[calc(var(--bottom-nav-h,56px)+12px)] z-30 mt-4 md:hidden">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/95 py-2.5 pl-4 pr-2.5 shadow-[var(--shadow-pop)] backdrop-blur-lg">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-11 font-bold text-faint">
            Total · {count} item{count === 1 ? "" : "s"}
          </span>
          <b className="font-display text-lg font-extrabold leading-tight text-primary">
            {formatPaisa(cart.grandTotalPaisa)}
          </b>
        </span>
        <Button asChild variant="accent" size="lg" className="shrink-0">
          <Link href="/checkout">
            Checkout <ArrowRight className="size-4" strokeWidth={2.4} />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function CartSummary() {
  const { cart } = useCart();
  const applyCoupon = useApplyCoupon();
  const removeCoupon = useRemoveCoupon();
  const [code, setCode] = React.useState("");

  const submitCoupon = async () => {
    const trimmed = code.trim();
    if (!/^[A-Za-z0-9_-]{2,40}$/.test(trimmed)) {
      toast.error("Enter a valid voucher code");
      return;
    }
    try {
      await applyCoupon.mutateAsync(trimmed);
      toast.success("Voucher applied");
      setCode("");
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.code) {
          case "COUPON_EXPIRED":
            toast.error("This voucher has expired");
            break;
          case "COUPON_USAGE_LIMIT":
            toast.error("This voucher has reached its usage limit");
            break;
          case "COUPON_INVALID":
            toast.error("That voucher code isn't valid");
            break;
          case "VALIDATION_FAILED":
            toast.error("Enter a valid voucher code");
            break;
          default:
            toast.error(err.message);
        }
      } else {
        toast.error("Invalid voucher code");
      }
    }
  };

  return (
    <div className="h-max rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5 lg:sticky lg:top-44">
      <h3 className="font-display text-base font-extrabold">Order summary</h3>
      <div className="mt-4 flex flex-col gap-3 text-13">
        <Row label={`Subtotal (${cart.items.length} item${cart.items.length === 1 ? "" : "s"})`}>
          {formatPaisa(cart.subtotalPaisa)}
        </Row>
        <Row label="Shipping">{formatPaisa(cart.shippingTotalPaisa)}</Row>
        {cart.vatPaisa !== "0" && <Row label="VAT">{formatPaisa(cart.vatPaisa)}</Row>}
        {cart.appliedCoupon && (
          <div className="flex justify-between font-semibold text-green">
            <span className="inline-flex items-center gap-1.5">
              Voucher · {cart.appliedCoupon.code}
              <button
                type="button"
                onClick={() => removeCoupon.mutate()}
                aria-label="Remove voucher"
              >
                <X className="size-3.5" />
              </button>
            </span>
            <span>−{formatPaisa(cart.discountPaisa)}</span>
          </div>
        )}
      </div>

      {!cart.appliedCoupon && (
        <div className="mt-4 flex gap-2">
          <Input
            placeholder="Voucher code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-11"
          />
          <Button variant="soft" loading={applyCoupon.isPending} onClick={submitCoupon}>
            <Tag className="size-4" /> Apply
          </Button>
        </div>
      )}

      <div className="mt-4 flex items-baseline justify-between border-t border-dashed border-border pt-4">
        <span className="text-sm font-extrabold">Grand total</span>
        <span className="font-display text-2xl font-extrabold text-primary">
          {formatPaisa(cart.grandTotalPaisa)}
        </span>
      </div>

      {/* On mobile the sticky checkout bar owns this CTA. */}
      <Button asChild variant="accent" fullWidth size="lg" className="mt-4 max-md:hidden">
        <Link href="/checkout">
          Proceed to checkout <ArrowRight className="size-4" strokeWidth={2.4} />
        </Link>
      </Button>

      <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-muted px-3 py-2.5 text-xs font-bold text-faint">
        <Wallet className="size-4 shrink-0 text-green" />
        Cash on delivery available · VAT included where applicable
      </div>
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
