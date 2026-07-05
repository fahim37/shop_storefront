"use client";

import * as React from "react";
import Link from "next/link";
import { Share2 } from "lucide-react";
import { CartIcon, HomeIcon } from "@/components/icons/nav-icons";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import { CountBadge } from "@/components/ui/count-badge";
import { useCartCount } from "@/lib/api/cart";
import { useUIStore } from "@/lib/store/ui";

/** Scroll depth (px) at which the bar turns solid and the title fades in. */
const SOLID_AT = 96;

/**
 * Mobile-only PDP top chrome (the global site header hides itself on product
 * pages below `md` — see HeaderShell). Starts as translucent chip buttons
 * floating over the gallery, then morphs into a solid frosted bar with the
 * product title once the page scrolls.
 */
export function PdpTopBar({ title }: { title: string }) {
  const openCart = useUIStore((s) => s.openCartDrawer);
  const count = useCartCount();
  const [solid, setSolid] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > SOLID_AT);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  };

  const chip = cn(
    "relative flex size-9 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-300 active:scale-90",
    solid
      ? "text-ink hover:bg-muted"
      : "bg-blue-deep/40 text-white backdrop-blur-md",
  );

  return (
    <div
      className={cn(
        "fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)] transition-[background-color,box-shadow] duration-300 md:hidden",
        solid
          ? "border-b border-border bg-card/95 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-lg"
          : "bg-transparent",
      )}
    >
      <div className="flex h-[52px] items-center gap-1.5 px-2.5">
        <Link href="/" aria-label="Home" className={chip}>
          <HomeIcon className="size-5" />
        </Link>
        <p
          aria-hidden={!solid}
          className={cn(
            "min-w-0 flex-1 truncate px-1 text-center text-[13px] font-extrabold transition-opacity duration-300",
            solid ? "opacity-100" : "opacity-0",
          )}
        >
          {title}
        </p>
        <button type="button" onClick={share} aria-label="Share this product" className={chip}>
          <Share2 className="size-5" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={openCart}
          aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
          className={chip}
        >
          <CartIcon className="size-5" />
          <CountBadge count={count} className="bg-amber text-blue-deep" />
        </button>
      </div>
    </div>
  );
}
