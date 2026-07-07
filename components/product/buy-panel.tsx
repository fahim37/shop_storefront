"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, Flame, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/api/http";
import { formatPaisa } from "@/lib/format";
import { useAddToCart } from "@/lib/api/cart";
import { WishlistButton } from "@/components/product/wishlist-button";
import { PdpActionBar } from "@/components/product/pdp-action-bar";
import { useUIStore } from "@/lib/store/ui";
import { visibleOptionEntries, carriedColorHex, colorNameHex } from "@/lib/options";
import type { ProductDetail, ProductVariant } from "@/lib/api/types";

/** Distinct option keys → ordered distinct values, derived from variants.
 *  `_`-prefixed metadata keys (e.g. _ColorHex) are excluded from the pickers. */
function deriveOptions(variants: ProductVariant[]) {
  const groups = new Map<string, string[]>();
  for (const v of variants) {
    for (const [k, val] of visibleOptionEntries(v.optionValues)) {
      const arr = groups.get(k) ?? [];
      if (!arr.includes(val)) arr.push(val);
      groups.set(k, arr);
    }
  }
  return groups;
}

/** Exact swatch hex per (option key → value) carried by the vendor upload. */
function deriveColorHexes(variants: ProductVariant[]) {
  const map = new Map<string, string>();
  for (const v of variants) {
    for (const [k, val] of visibleOptionEntries(v.optionValues)) {
      const hex = carriedColorHex(v.optionValues, k);
      if (hex) map.set(`${k} ${val}`, hex);
    }
  }
  return map;
}

export function BuyPanel({ detail }: { detail: ProductDetail }) {
  const router = useRouter();
  // Memoized so the derived-option memos below keep a stable dep (a bare
  // `.filter()` would mint a new array every render, defeating them).
  const variants = React.useMemo(
    () => detail.variants.filter((v) => v.isActive),
    [detail.variants],
  );
  const optionGroups = React.useMemo(() => deriveOptions(variants), [variants]);
  const colorHexes = React.useMemo(() => deriveColorHexes(variants), [variants]);
  const optionKeys = Array.from(optionGroups.keys());

  const [selected, setSelected] = React.useState<Record<string, string>>(
    () => Object.fromEntries(visibleOptionEntries(variants[0]?.optionValues)),
  );
  // The user's *requested* quantity; the effective `qty` below re-clamps it to
  // live stock at render time (no effect needed).
  const [rawQty, setQty] = React.useState(1);

  const activeVariant =
    variants.find((v) =>
      optionKeys.every((k) => v.optionValues[k] === selected[k]),
    ) ??
    variants[0] ??
    null;

  const add = useAddToCart();
  const openCart = useUIStore((s) => s.openCartDrawer);
  const [buyingNow, setBuyingNow] = React.useState(false);

  // Stock, driven by the server's per-variant availableStock. A race (someone
  // else buys the last unit between page-load and our click) is corrected from
  // the STOCK_INSUFFICIENT response and recorded here so the UI re-clamps.
  const LOW_STOCK_THRESHOLD = 5;
  const STEPPER_MAX = 99;
  const [stockOverrides, setStockOverrides] = React.useState<
    Record<string, number>
  >({});
  // Resolve available units: a race correction (override) wins; otherwise the
  // server's per-variant figure. If a backend build predates availableStock,
  // fall back to "in stock, unconstrained" rather than breaking the stepper.
  const rawAvailable = activeVariant
    ? stockOverrides[activeVariant.id] ?? activeVariant.availableStock
    : 0;
  const available =
    activeVariant == null
      ? 0
      : Number.isFinite(rawAvailable)
        ? rawAvailable
        : STEPPER_MAX;
  const outOfStock = available <= 0;
  const lowStock = !outOfStock && available <= LOW_STOCK_THRESHOLD;
  const stepperMax = Math.min(STEPPER_MAX, Math.max(1, available));

  // Never let the requested qty exceed what's available (e.g. after switching
  // to a lower-stock variant, or after a race correction). Derived at render —
  // clamping in an effect would flash the stale value and cascade a re-render.
  const qty = outOfStock ? rawQty : Math.min(rawQty, stepperMax);

  const pickColor = (key: string) =>
    /colou?r/i.test(key) ? key : null;

  const addError = (err: unknown): string =>
    err instanceof ApiError
      ? err.code === "PRODUCT_INACTIVE"
        ? "This item is not currently buyable."
        : err.message
      : "Could not add to cart.";

  // Turn a failed add into a clear stock signal: read the authoritative
  // `available` from STOCK_INSUFFICIENT and re-clamp the UI to it.
  const handleAddError = (err: unknown) => {
    if (err instanceof ApiError && err.code === "STOCK_INSUFFICIENT") {
      const avail = Math.max(
        0,
        Number((err.details as { available?: number } | undefined)?.available ?? 0),
      );
      if (activeVariant) {
        setStockOverrides((m) => ({ ...m, [activeVariant.id]: avail }));
      }
      toast.error(
        avail > 0
          ? `Only ${avail} left in stock — we adjusted your quantity.`
          : "Sorry, this just sold out.",
      );
      return;
    }
    toast.error(addError(err));
  };

  /** Snapshot the active variant so the cart can render the line instantly. */
  const optimisticLine = () =>
    activeVariant
      ? {
          variantId: activeVariant.id,
          productId: detail.product.id,
          productTitle: detail.product.title,
          productSlug: detail.product.slug,
          vendorId: detail.product.vendorId,
          sku: activeVariant.sku,
          optionValues: activeVariant.optionValues,
          unitPricePaisa: activeVariant.pricePaisa,
          imageMediaId: detail.product.thumbnailMediaId,
          availableStock: available,
        }
      : undefined;

  // Instant: the optimistic line lands in the cache synchronously, so the
  // drawer (the confirmation) and the header badge update immediately while
  // the POST settles in the background. No spinner.
  const addToCart = () => {
    if (!activeVariant || outOfStock) return;
    add.mutate(
      { variantId: activeVariant.id, quantity: qty, optimistic: optimisticLine() },
      { onError: handleAddError },
    );
    openCart();
  };

  // Buy now must have the item server-side before /checkout reads the cart, so
  // we await — the spinner stays on this button only.
  const buyNow = async () => {
    if (!activeVariant || outOfStock || buyingNow) return;
    setBuyingNow(true);
    try {
      await add.mutateAsync({
        variantId: activeVariant.id,
        quantity: qty,
        optimistic: optimisticLine(),
      });
      router.push("/checkout");
    } catch (err) {
      handleAddError(err);
      setBuyingNow(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* price */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl bg-muted px-3 py-2.5 sm:px-4 sm:py-3.5">
        <Price
          pricePaisa={activeVariant?.pricePaisa ?? detail.product.minPricePaisa}
          comparePaisa={activeVariant?.compareAtPricePaisa}
          size="xl"
          showSave
        />
        <span className="ml-auto text-xs font-bold text-faint">
          per unit · VAT included
        </span>
      </div>

      {/* option pickers */}
      {optionKeys.map((key) => {
        const values = optionGroups.get(key) ?? [];
        const colorKey = pickColor(key);
        return (
          <div key={key} className="flex flex-col gap-2">
            <label className="text-13 font-extrabold">
              {key}: <span className="font-bold text-faint">{selected[key]}</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {values.map((val) => {
                const on = selected[key] === val;
                if (colorKey) {
                  const hex = colorHexes.get(`${key} ${val}`) ?? colorNameHex(val);
                  return (
                    <button
                      key={val}
                      type="button"
                      aria-label={val}
                      onClick={() => setSelected((s) => ({ ...s, [key]: val }))}
                      className={cn(
                        "size-8 rounded-full border-2 border-white",
                        on ? "ring-2 ring-primary ring-offset-1" : "ring-1 ring-border",
                      )}
                      style={{ background: hex ?? "var(--surface)" }}
                    >
                      {!hex && <span className="text-2xs font-bold">{val[0]}</span>}
                    </button>
                  );
                }
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSelected((s) => ({ ...s, [key]: val }))}
                    className={cn(
                      "min-w-10 rounded-lg border px-3.5 py-2 text-xs font-extrabold transition-colors",
                      on
                        ? "border-primary bg-blue-soft text-primary"
                        : "border-border text-sub hover:border-primary/40",
                    )}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* quantity + live stock state */}
      <div className="flex items-center gap-3 sm:gap-4">
        <QuantityStepper
          value={qty}
          onChange={setQty}
          max={stepperMax}
          disabled={outOfStock}
        />
        {outOfStock ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-red/10 px-2.5 py-1 text-xs font-extrabold text-red">
            <Ban className="size-4" strokeWidth={2.6} /> Out of stock
          </span>
        ) : lowStock ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber px-2.5 py-1 text-xs font-extrabold text-blue-deep">
            <Flame className="size-4" strokeWidth={2.6} />
            {available === 1 ? "Last one left" : `Only ${available} left`}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-green">
            <Check className="size-4" strokeWidth={3} /> In stock
          </span>
        )}
        {/* On mobile the CTA row lives in the sticky PdpActionBar, so the
            wishlist heart rides here instead. */}
        <WishlistButton
          productId={detail.product.id}
          heartClassName="size-5"
          className="ml-auto size-10 shrink-0 rounded-full border border-border text-sub hover:border-red/40 hover:text-red md:hidden"
        />
      </div>

      {/* CTAs — desktop/tablet inline; mobile uses the sticky bottom bar */}
      <div className="hidden gap-2.5 md:flex">
        {outOfStock ? (
          <Button variant="soft" className="flex-1" disabled>
            <Ban className="size-4" /> Out of stock
          </Button>
        ) : (
          <>
            <Button variant="outline" className="flex-1" onClick={addToCart}>
              <ShoppingCart className="size-4" /> Add to cart
            </Button>
            <Button
              variant="accent"
              className="flex-1"
              onClick={buyNow}
              loading={buyingNow}
            >
              Buy now
            </Button>
          </>
        )}
        <WishlistButton
          productId={detail.product.id}
          heartClassName="size-5"
          className="size-11 shrink-0 rounded-md border-2 border-border text-sub hover:border-red/40 hover:text-red"
        />
      </div>

      {outOfStock && (
        <p className="text-xs font-semibold text-faint">
          This item is sold out. Tap the heart to save it and we&apos;ll keep it
          on your wishlist.
        </p>
      )}

      {activeVariant && (
        <p className="text-11 font-semibold text-faint">
          SKU: {activeVariant.sku} · {formatPaisa(activeVariant.pricePaisa)} each
        </p>
      )}

      {/* Mobile sticky CTA bar (fixed, so its place in the tree is cosmetic) */}
      <PdpActionBar
        vendorId={detail.product.vendorId}
        vendorName={detail.product.vendorName}
        vendorSlug={detail.product.vendorSlug}
        productId={detail.product.id}
        productTitle={detail.product.title}
        outOfStock={outOfStock}
        buyingNow={buyingNow}
        onAddToCart={addToCart}
        onBuyNow={buyNow}
      />
    </div>
  );
}
