"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Heart, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/api/http";
import { formatPaisa } from "@/lib/format";
import { useAddToCart } from "@/lib/api/cart";
import { useToggleWishlist } from "@/lib/api/engagement";
import { useUIStore } from "@/lib/store/ui";
import type { ProductDetail, ProductVariant } from "@/lib/api/types";

/** Distinct option keys → ordered distinct values, derived from variants. */
function deriveOptions(variants: ProductVariant[]) {
  const groups = new Map<string, string[]>();
  for (const v of variants) {
    for (const [k, val] of Object.entries(v.optionValues)) {
      const arr = groups.get(k) ?? [];
      if (!arr.includes(val)) arr.push(val);
      groups.set(k, arr);
    }
  }
  return groups;
}

function COLOR_HEX(name: string): string | null {
  const map: Record<string, string> = {
    black: "#000000",
    white: "#FFFFFF",
    red: "#E11D48",
    blue: "#2563EB",
    green: "#16A34A",
    grey: "#6B7280",
    gray: "#6B7280",
    silver: "#C0C5CE",
    gold: "#D4AF37",
    navy: "#1E2A6E",
    sage: "#9CAF88",
    pink: "#EC4899",
    yellow: "#F5B82E",
  };
  return map[name.toLowerCase()] ?? null;
}

export function BuyPanel({ detail }: { detail: ProductDetail }) {
  const router = useRouter();
  const variants = detail.variants.filter((v) => v.isActive);
  const optionGroups = React.useMemo(() => deriveOptions(variants), [variants]);
  const optionKeys = Array.from(optionGroups.keys());

  const [selected, setSelected] = React.useState<Record<string, string>>(
    () => variants[0]?.optionValues ?? {},
  );
  const [qty, setQty] = React.useState(1);

  const activeVariant =
    variants.find((v) =>
      optionKeys.every((k) => v.optionValues[k] === selected[k]),
    ) ??
    variants[0] ??
    null;

  const add = useAddToCart();
  const openCart = useUIStore((s) => s.openCartDrawer);
  const { isWishlisted, toggle } = useToggleWishlist();
  const wished = isWishlisted(detail.product.id);

  const pickColor = (key: string) =>
    /colou?r/i.test(key) ? key : null;

  const doAdd = async (then?: () => void) => {
    if (!activeVariant) return;
    try {
      await add.mutateAsync({ variantId: activeVariant.id, quantity: qty });
      if (then) then();
      else {
        toast.success("Added to cart", { description: detail.product.title });
        openCart();
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.code === "PRODUCT_INACTIVE"
            ? "This item is not currently buyable."
            : err.message
          : "Could not add to cart.";
      toast.error(msg);
    }
  };

  const buyNow = () =>
    doAdd(() => router.push("/checkout"));

  return (
    <div className="flex flex-col gap-4">
      {/* price */}
      <div className="flex items-baseline gap-3 rounded-xl bg-muted px-4 py-3.5">
        <Price
          pricePaisa={activeVariant?.pricePaisa ?? detail.product.minPricePaisa}
          comparePaisa={activeVariant?.compareAtPricePaisa}
          size="xl"
          showSave
        />
        <span className="ml-auto text-[11.5px] font-bold text-faint">
          per unit · VAT included
        </span>
      </div>

      {/* option pickers */}
      {optionKeys.map((key) => {
        const values = optionGroups.get(key) ?? [];
        const colorKey = pickColor(key);
        return (
          <div key={key} className="flex flex-col gap-2">
            <label className="text-[12.5px] font-extrabold">
              {key}: <span className="font-bold text-faint">{selected[key]}</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {values.map((val) => {
                const on = selected[key] === val;
                if (colorKey) {
                  const hex = COLOR_HEX(val);
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
                      {!hex && <span className="text-[10px] font-bold">{val[0]}</span>}
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

      {/* quantity + stock */}
      <div className="flex items-center gap-4">
        <QuantityStepper value={qty} onChange={setQty} max={99} />
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-green">
          <Check className="size-4" strokeWidth={3} /> In stock
        </span>
      </div>

      {/* CTAs */}
      <div className="flex gap-2.5">
        <Button
          variant="outline"
          className="flex-1"
          loading={add.isPending}
          onClick={() => doAdd()}
        >
          <ShoppingCart className="size-4" /> Add to cart
        </Button>
        <Button variant="accent" className="flex-1" onClick={buyNow} loading={add.isPending}>
          Buy now
        </Button>
        <button
          type="button"
          onClick={() => toggle(detail.product.id)}
          aria-label="Add to wishlist"
          aria-pressed={wished}
          className="flex size-12 shrink-0 items-center justify-center rounded-[10px] border-2 border-border text-sub transition-colors hover:border-red/40 hover:text-red"
        >
          <Heart className={cn("size-5", wished && "fill-red text-red")} />
        </button>
      </div>

      {activeVariant && (
        <p className="text-[11px] font-semibold text-faint">
          SKU: {activeVariant.sku} · {formatPaisa(activeVariant.pricePaisa)} each
        </p>
      )}
    </div>
  );
}
