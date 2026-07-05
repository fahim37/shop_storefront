"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Heart, LogOut, Menu, User } from "lucide-react";
import {
  AccountIcon,
  BellIcon,
  CartIcon,
  CategoriesIcon,
  HomeIcon,
} from "@/components/icons/nav-icons";
import { cn, isProductPath } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { categoryIcon } from "@/lib/category-icons";
import { useCategoryTree } from "@/lib/api/catalog";
import { useAuth } from "@/lib/auth/auth-context";
import { useCartCount } from "@/lib/api/cart";
import { useUnreadCount } from "@/lib/api/account";
import { useUIStore } from "@/lib/store/ui";
import { initials } from "@/lib/format";

export function MobileMenuButton() {
  const open = useUIStore((s) => s.openMobileNav);
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open menu"
      className="group flex size-9 items-center justify-center rounded-lg text-white transition-transform duration-200 ease-out active:scale-90 md:hidden"
    >
      <Menu className="size-6 transition-transform duration-200 ease-out group-hover:scale-110" />
    </button>
  );
}

export function MobileNav() {
  const open = useUIStore((s) => s.mobileNavOpen);
  const setOpen = useUIStore((s) => s.setMobileNav);
  const pathname = usePathname();
  const { data: tree } = useCategoryTree();
  const { status, user, openAuth, logout } = useAuth();
  const roots = tree ?? [];

  const close = () => setOpen(false);
  // Same-route navigations are a no-op in the App Router, so "Home" while
  // already on the homepage scrolls back to the top instead.
  const closeAndScroll = (href: string) => {
    close();
    if (pathname === href) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-[88vw] max-w-sm">
        <SheetHeader>
          <SheetTitle>
            <Logo size="sm" />
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* account */}
          <div className="border-b border-border p-4">
            {status === "authenticated" && user ? (
              <Link
                href="/account"
                onClick={close}
                className="flex items-center gap-3"
              >
                <span className="flex size-11 items-center justify-center overflow-hidden rounded-full bg-blue-deep font-display font-extrabold text-amber">
                  {user.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.photoUrl} alt="" className="size-full object-cover" />
                  ) : (
                    initials(user.fullName)
                  )}
                </span>
                <span className="min-w-0">
                  <b className="block truncate text-sm font-extrabold">{user.fullName}</b>
                  <span className="block truncate text-xs text-faint">{user.email}</span>
                </span>
                <ChevronRight className="ml-auto size-4 text-faint" />
              </Link>
            ) : (
              <Button
                fullWidth
                variant="primary"
                onClick={() => {
                  close();
                  openAuth("login");
                }}
              >
                <User className="size-4" /> Sign in / Register
              </Button>
            )}
          </div>

          {/* quick links */}
          <nav className="border-b border-border p-2">
            {[
              { label: "Home", href: "/", icon: HomeIcon },
              { label: "My orders", href: "/account/orders", icon: CartIcon },
              { label: "Wishlist", href: "/account/wishlist", icon: Heart },
            ].map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => closeAndScroll(l.href)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-ink hover:bg-muted"
              >
                <l.icon className="size-5 text-faint" />
                {l.label}
              </Link>
            ))}
          </nav>

          {/* categories */}
          <div className="p-2">
            <p className="px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-faint">
              Categories
            </p>
            {roots.map((cat) => {
              const Icon = categoryIcon(cat.slug);
              return (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  onClick={close}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-ink hover:bg-muted"
                >
                  <Icon className="size-5 text-primary" />
                  {cat.name}
                  <ChevronRight className="ml-auto size-4 text-faint" />
                </Link>
              );
            })}
          </div>
        </div>

        {status === "authenticated" && (
          <div className="border-t border-border p-2">
            <button
              type="button"
              onClick={() => {
                close();
                void logout();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-red hover:bg-red/10"
            >
              <LogOut className="size-5" /> Log out
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

const TABS = [
  { label: "Home", href: "/", icon: HomeIcon },
  { label: "Categories", href: "/category/electronics", icon: CategoriesIcon },
  { label: "Cart", href: "#cart", icon: CartIcon, isCart: true },
  { label: "Alerts", href: "/account/notifications", icon: BellIcon, isAlerts: true },
  { label: "Account", href: "/account", icon: AccountIcon },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const openCart = useUIStore((s) => s.openCartDrawer);
  const count = useCartCount();
  const { data: unread } = useUnreadCount();
  const unreadCount = unread?.count ?? 0;

  // Product pages replace the tab bar with the PDP's own sticky action bar
  // (Store / Chat / Add to cart / Buy now) — showing both would stack two
  // bottom bars.
  if (isProductPath(pathname)) return null;

  // Single active slot drives both the tab tint and the sliding indicator/glow
  // (hidden entirely on routes that aren't in the bar, e.g. product pages).
  const activeIndex = TABS.findIndex(
    (t) =>
      !t.isCart &&
      (t.href === "/" ? pathname === "/" : pathname.startsWith(t.href)),
  );
  const slide = {
    transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
  };
  const slideCls = cn(
    "pointer-events-none absolute left-0 w-1/5 transition-[transform,opacity] duration-[550ms] [transition-timing-function:cubic-bezier(0.3,1.35,0.4,1)]",
    activeIndex < 0 && "opacity-0",
  );

  return (
    <nav className="sticky bottom-0 z-40 overflow-hidden bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_32px_rgba(15,23,42,0.10)] backdrop-blur-lg md:hidden">
      {/* soft glow trailing the active tab */}
      <div className={cn(slideCls, "inset-y-0 flex items-center justify-center")} style={slide}>
        <span
          className="size-[62px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--primary) 16%, transparent) 0%, transparent 70%)",
          }}
        />
      </div>
      {/* sliding top indicator */}
      <div className={cn(slideCls, "top-0 flex justify-center")} style={slide}>
        <span
          className="h-1 w-[42px] rounded-b-[4px]"
          style={{
            background:
              "linear-gradient(90deg, color-mix(in oklch, var(--primary) 75%, transparent), var(--primary))",
            boxShadow:
              "0 2px 10px color-mix(in oklch, var(--primary) 45%, transparent)",
          }}
        />
      </div>
      <div className="relative flex">
        {TABS.map((t, i) => {
          const active = i === activeIndex;
          const content = (
            <>
              <span
                className={cn(
                  "relative flex transition-[transform,color] duration-[450ms] ease-spring",
                  active
                    ? "-translate-y-[3px] scale-[1.12] text-primary"
                    : "text-faint",
                )}
              >
                <t.icon className="size-[22px]" />
                {t.isCart && count > 0 && (
                  <span className="absolute -right-[9px] -top-[7px] flex h-4 min-w-4 animate-badge-pulse items-center justify-center rounded-full border-2 border-card bg-primary px-1 text-[10px] font-bold text-white">
                    {count}
                  </span>
                )}
                {t.isAlerts && unreadCount > 0 && (
                  <span className="absolute -right-[9px] -top-[7px] flex h-4 min-w-4 animate-badge-pulse items-center justify-center rounded-full border-2 border-card bg-red px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "text-[11px] transition-colors duration-300",
                  active ? "font-bold text-primary" : "font-medium text-faint",
                )}
              >
                {t.label}
              </span>
            </>
          );
          // pt-[18px] keeps the badge (rides 7px above the icon, plus its
          // pulse) clear of the 4px indicator bar at the top edge.
          const cls =
            "flex flex-1 flex-col items-center gap-1 pb-2 pt-[18px] transition-transform duration-[180ms] ease-out active:scale-[0.92]";
          return t.isCart ? (
            <button key={t.label} type="button" onClick={openCart} className={cls}>
              {content}
            </button>
          ) : (
            <Link
              key={t.label}
              href={t.href}
              onClick={() => {
                if (pathname === t.href)
                  window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={cls}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
