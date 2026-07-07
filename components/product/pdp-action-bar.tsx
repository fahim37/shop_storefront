"use client";

import * as React from "react";
import Link from "next/link";
import { Ban, MessageCircle, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { useChatStore } from "@/lib/chat/use-chat-store";
import { useUnreadTotal } from "@/lib/chat/queries";

/**
 * Mobile-only sticky bottom bar on the PDP (Daraz-style): quick Store + Chat
 * shortcuts beside the two purchase CTAs. Replaces the global bottom tab bar
 * on product pages (MobileBottomNav returns null there). Cart/variant state
 * lives in BuyPanel, which renders this bar and passes the handlers down so
 * the sticky CTAs and the desktop inline CTAs share one source of truth.
 */
export function PdpActionBar({
  vendorId,
  vendorName,
  vendorSlug,
  productId,
  productTitle,
  outOfStock,
  buyingNow,
  onAddToCart,
  onBuyNow,
}: {
  vendorId: string;
  vendorName: string | null;
  vendorSlug: string | null;
  productId: string;
  productTitle: string;
  outOfStock: boolean;
  buyingNow: boolean;
  onAddToCart: () => void;
  onBuyNow: () => void;
}) {
  const { requireAuth, isAuthenticated } = useAuth();
  const startWithVendor = useChatStore((s) => s.startWithVendor);
  const unread = useUnreadTotal(isAuthenticated);

  const iconTab =
    "flex w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-2xs font-bold text-sub transition-transform duration-150 active:scale-90";

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_32px_rgba(15,23,42,0.10)] backdrop-blur-lg md:hidden">
      <div className="flex items-stretch gap-2 px-3 py-2.5">
        {vendorName && (
          <Link
            href={
              vendorSlug
                ? `/store/${vendorSlug}`
                : `/search?q=${encodeURIComponent(vendorName)}`
            }
            className={iconTab}
          >
            <Store className="size-[22px] text-faint" strokeWidth={1.8} />
            Store
          </Link>
        )}
        <button
          type="button"
          onClick={() =>
            requireAuth(() =>
              startWithVendor({ vendorId, vendorName, productId, productTitle }),
            )
          }
          className={iconTab}
        >
          <span className="relative">
            <MessageCircle className="size-[22px] text-faint" strokeWidth={1.8} />
            {unread > 0 && (
              <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-red px-1 text-2xs font-extrabold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </span>
          Chat
        </button>

        {outOfStock ? (
          <Button variant="soft" size="lg" className="flex-1" disabled>
            <Ban className="size-4" /> Out of stock
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="lg"
              className="flex-1 px-2 text-sm"
              onClick={onAddToCart}
            >
              Add to cart
            </Button>
            <Button
              variant="accent"
              size="lg"
              className="flex-1 px-2 text-sm"
              onClick={onBuyNow}
              loading={buyingNow}
            >
              Buy now
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
