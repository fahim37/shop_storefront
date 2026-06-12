"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
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
import { fromRecHit } from "@/lib/api/card";
import {
  useApplyCoupon,
  useCart,
  useRemoveCartItem,
  useRemoveCoupon,
  useUpdateCartItem,
} from "@/lib/api/cart";
import { useCartRecommendations } from "@/lib/api/search";

export default function CartPage() {
  const { cart, isLoading } = useCart();
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const recs = useCartRecommendations(cart.items.length > 0);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-7" />
      </div>
    );
  }

  return (
    <div className="wrap py-4">
      <Breadcrumbs items={[{ label: "Cart" }]} className="mb-4" />

      {cart.items.length === 0 ? (
        <EmptyState
          className="my-10"
          icon={<Truck className="size-6" />}
          title="Your cart is empty"
          description="Add products and they'll show up here, grouped by store."
          action={
            <Button asChild>
              <Link href="/">Start shopping</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* lines */}
          <div className="flex min-w-0 flex-col gap-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {cart.vendorGroups.map((group, gi) => (
                <div key={group.vendorId}>
                  <div className="flex items-center gap-2.5 border-y border-border bg-muted px-5 py-3 text-[12.5px] font-extrabold first:border-t-0">
                    <Store className="size-4 text-primary" />
                    Store {gi + 1}
                    <span className="ml-auto text-[11.5px] font-bold text-faint">
                      Ships via Pathao · {formatPaisa(group.subtotalPaisa)}
                    </span>
                  </div>
                  {group.items.map((line) => (
                    <div
                      key={line.itemId}
                      className="flex items-center gap-4 border-b border-[oklch(0.96_0.005_258)] px-5 py-4 last:border-b-0"
                    >
                      <Link
                        href={`/product/${line.productSlug}`}
                        className="size-[72px] shrink-0 overflow-hidden rounded-lg"
                      >
                        <MediaImage mediaId={line.imageMediaId} variant="thumbnail" alt={line.productTitle} />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <Link
                          href={`/product/${line.productSlug}`}
                          className="line-clamp-1 text-[13.5px] font-bold hover:text-primary"
                        >
                          {line.productTitle}
                        </Link>
                        {Object.keys(line.optionValues).length > 0 && (
                          <span className="flex flex-wrap gap-1.5 text-[11.5px] font-bold text-faint">
                            {Object.entries(line.optionValues).map(([k, v]) => (
                              <span key={k} className="rounded bg-muted px-1.5 py-0.5">
                                {v}
                              </span>
                            ))}
                          </span>
                        )}
                        {line.priceChanged && (
                          <span className="text-[11px] font-extrabold text-red">
                            Price changed to {formatPaisa(line.livePricePaisa)}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => remove.mutate(line.itemId)}
                          className="mt-0.5 inline-flex items-center gap-1 self-start text-[11.5px] font-bold text-faint hover:text-red"
                        >
                          <Trash2 className="size-3.5" /> Remove
                        </button>
                      </div>
                      <QuantityStepper
                        value={line.quantity}
                        loading={update.isPending && update.variables?.itemId === line.itemId}
                        onChange={(q) => update.mutate({ itemId: line.itemId, quantity: q })}
                      />
                      <div className="w-24 shrink-0 text-right">
                        <b className="font-display text-[15px] font-extrabold text-primary">
                          {formatPaisa(line.lineTotalPaisa)}
                        </b>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {cart.vendorGroups.length > 1 && (
              <div className="flex items-center gap-2.5 rounded-xl bg-muted px-4 py-3 text-[12.5px] font-bold text-sub">
                <Truck className="size-4 text-primary" />
                Items from {cart.vendorGroups.length} stores will arrive as{" "}
                {cart.vendorGroups.length} deliveries under one order.
              </div>
            )}

            {recs.data && recs.data.items.length > 0 && (
              <section className="mt-2">
                <SectionHeader title="You may also like" subtitle="Goes well with your cart" />
                <ProductGrid products={recs.data.items.slice(0, 4).map(fromRecHit)} cols={4} />
              </section>
            )}
          </div>

          {/* summary */}
          <CartSummary />
        </div>
      )}
    </div>
  );
}

function CartSummary() {
  const { cart } = useCart();
  const applyCoupon = useApplyCoupon();
  const removeCoupon = useRemoveCoupon();
  const [code, setCode] = React.useState("");

  const submitCoupon = async () => {
    if (!code.trim()) return;
    try {
      await applyCoupon.mutateAsync(code.trim());
      toast.success("Voucher applied");
      setCode("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Invalid voucher code");
    }
  };

  return (
    <div className="h-max rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-44">
      <h3 className="font-display text-base font-extrabold">Order summary</h3>
      <div className="mt-4 flex flex-col gap-3 text-[13px]">
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
        <span className="text-[13.5px] font-extrabold">Grand total</span>
        <span className="font-display text-2xl font-extrabold text-primary">
          {formatPaisa(cart.grandTotalPaisa)}
        </span>
      </div>

      <Button asChild variant="accent" fullWidth size="lg" className="mt-4">
        <Link href="/checkout">
          Proceed to checkout <ArrowRight className="size-4" strokeWidth={2.4} />
        </Link>
      </Button>

      <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-muted px-3 py-2.5 text-[11.5px] font-bold text-faint">
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
