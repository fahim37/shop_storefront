"use client";

import Link from "next/link";
import { Heart, LogOut, Package, Star } from "lucide-react";
import { AccountIcon, CartIcon } from "@/components/icons/nav-icons";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth/auth-context";
import { useCartCount } from "@/lib/api/cart";
import { useWishlistCount } from "@/lib/api/engagement";
import { useUIStore } from "@/lib/store/ui";
import { formatPaisa } from "@/lib/format";
import { useCart } from "@/lib/api/cart";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CountBadge } from "@/components/ui/count-badge";

/** Account dropdown (or Sign in) for the desktop nav. */
export function AccountMenu() {
  const { status, user, openAuth, logout } = useAuth();

  if (status === "loading") {
    return (
      <span className="flex items-center gap-2 text-xs font-bold text-faint">
        <Spinner className="size-4" />
      </span>
    );
  }

  if (status !== "authenticated" || !user) {
    return (
      <button
        type="button"
        onClick={() => openAuth("login")}
        className="flex items-center gap-2 text-xs font-bold text-ink"
      >
        <AccountIcon className="size-6" />
        <span className="text-left leading-tight">
          <small className="block text-11 font-semibold text-faint">Hello,</small>
          Sign in
        </span>
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 text-xs font-bold text-ink outline-none"
        >
          <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-blue-deep font-display text-13 font-extrabold text-amber">
            {user.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoUrl} alt="" className="size-full object-cover" />
            ) : (
              initials(user.fullName)
            )}
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <small className="block text-11 font-semibold text-faint">Hello,</small>
            {user.fullName.split(" ")[0]}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <AccountIcon className="size-4 text-faint" />
            My account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/orders">
            <Package className="size-4 text-faint" />
            Orders
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/wishlist">
            <Heart className="size-4 text-faint" />
            Wishlist
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/reviews">
            <Star className="size-4 text-faint" />
            My reviews
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => void logout()}
          className="text-red focus:bg-red/10"
        >
          <LogOut className="size-4 text-red" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Wishlist link: icon + saved-count badge; heart fills once you've saved items. */
export function WishlistLink() {
  const count = useWishlistCount();
  const active = count > 0;

  return (
    <Link
      href="/account/wishlist"
      aria-label={`Wishlist, ${count} saved item${count === 1 ? "" : "s"}`}
      className="group flex items-center gap-2 text-xs font-bold text-ink"
    >
      <span className="relative">
        <Heart
          className={cn(
            "size-6 transition-colors duration-200",
            active && "fill-red text-red",
          )}
          strokeWidth={1.6}
        />
        <CountBadge count={count} className="bg-amber text-blue-deep" />
      </span>
      <span className="hidden text-left leading-tight lg:block">
        <small className="block text-11 font-semibold text-faint">Saved</small>
        Wishlist
      </span>
    </Link>
  );
}

/** Cart button: icon + amber count badge + running total; opens the drawer. */
export function CartButton({ className }: { className?: string }) {
  const openCart = useUIStore((s) => s.openCartDrawer);
  const count = useCartCount();
  const { cart } = useCart();

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
      className={cn("group flex items-center gap-2 text-xs font-bold text-ink", className)}
    >
      <span className="relative">
        <CartIcon className="size-6" />
        <CountBadge count={count} className="bg-amber text-blue-deep" />
      </span>
      <span className="hidden text-left leading-tight lg:block">
        <small className="block text-11 font-semibold text-faint">Total</small>
        {formatPaisa(cart.grandTotalPaisa)}
      </span>
    </button>
  );
}
