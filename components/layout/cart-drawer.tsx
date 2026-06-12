"use client";

import Link from "next/link";
import { ShoppingBag, Store, Trash2, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MediaImage } from "@/components/ui/media-image";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { formatPaisa } from "@/lib/format";
import { useUIStore } from "@/lib/store/ui";
import {
  useCart,
  useRemoveCartItem,
  useUpdateCartItem,
} from "@/lib/api/cart";

export function CartDrawer() {
  const open = useUIStore((s) => s.cartDrawerOpen);
  const setOpen = useUIStore((s) => s.setCartDrawer);
  const { cart, isLoading } = useCart();
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();

  const count = cart.items.reduce((n, l) => n + l.quantity, 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <ShoppingBag className="size-5 text-primary" />
          <SheetTitle>Your cart{count ? ` (${count})` : ""}</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="size-6" />
          </div>
        ) : cart.items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState
              icon={<ShoppingBag className="size-6" />}
              title="Your cart is empty"
              description="Browse the marketplace and add items you love."
              action={
                <Button asChild variant="primary" onClick={() => setOpen(false)}>
                  <Link href="/">Start shopping</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              {cart.vendorGroups.map((group) => (
                <div key={group.vendorId}>
                  <div className="flex items-center gap-2 bg-muted px-5 py-2.5 text-xs font-extrabold text-sub">
                    <Store className="size-3.5 text-primary" />
                    {group.items[0]?.productTitle ? "Store" : "Store"}
                    <span className="ml-auto font-bold text-faint">
                      {formatPaisa(group.subtotalPaisa)}
                    </span>
                  </div>
                  {group.items.map((line) => (
                    <div
                      key={line.itemId}
                      className="flex gap-3 border-b border-[oklch(0.96_0.005_258)] px-5 py-3.5"
                    >
                      <Link
                        href={`/product/${line.productSlug}`}
                        onClick={() => setOpen(false)}
                        className="size-16 shrink-0 overflow-hidden rounded-lg"
                      >
                        <MediaImage
                          mediaId={line.imageMediaId}
                          variant="thumbnail"
                          alt={line.productTitle}
                        />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <Link
                          href={`/product/${line.productSlug}`}
                          onClick={() => setOpen(false)}
                          className="line-clamp-1 text-[13px] font-semibold hover:text-primary"
                        >
                          {line.productTitle}
                        </Link>
                        {Object.keys(line.optionValues).length > 0 && (
                          <span className="line-clamp-1 text-[11px] font-semibold text-faint">
                            {Object.values(line.optionValues).join(" · ")}
                          </span>
                        )}
                        {line.priceChanged && (
                          <span className="text-[11px] font-bold text-red">
                            Price updated to {formatPaisa(line.livePricePaisa)}
                          </span>
                        )}
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <QuantityStepper
                            size="sm"
                            value={line.quantity}
                            loading={
                              update.isPending &&
                              update.variables?.itemId === line.itemId
                            }
                            onChange={(q) =>
                              update.mutate({ itemId: line.itemId, quantity: q })
                            }
                          />
                          <span className="font-display text-sm font-extrabold text-primary">
                            {formatPaisa(line.lineTotalPaisa)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove.mutate(line.itemId)}
                        aria-label="Remove item"
                        className="self-start text-faint transition-colors hover:text-red"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="border-t border-border px-5 py-4">
              {cart.discountPaisa !== "0" && (
                <div className="mb-1.5 flex justify-between text-[13px] font-semibold text-green">
                  <span>Voucher</span>
                  <span>−{formatPaisa(cart.discountPaisa)}</span>
                </div>
              )}
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-sm font-bold">Subtotal</span>
                <span className="font-display text-xl font-extrabold text-primary">
                  {formatPaisa(cart.grandTotalPaisa)}
                </span>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="soft" fullWidth onClick={() => setOpen(false)}>
                  <Link href="/cart">View cart</Link>
                </Button>
                <Button asChild variant="accent" fullWidth onClick={() => setOpen(false)}>
                  <Link href="/checkout">Checkout</Link>
                </Button>
              </div>
              <p className="mt-2.5 text-center text-[11px] font-semibold text-faint">
                Cash on delivery available · taxes at checkout
              </p>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close cart"
          className="absolute right-4 top-4 text-faint hover:text-ink sm:hidden"
        >
          <X className="size-5" />
        </button>
      </SheetContent>
    </Sheet>
  );
}
