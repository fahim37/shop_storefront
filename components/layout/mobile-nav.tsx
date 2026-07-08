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
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { closeButtonClass } from "@/components/ui/close-button";
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

  // Staggered row entrance: --i feeds .mnav-item's animation-delay.
  const stagger = (i: number) => ({ "--i": i }) as React.CSSProperties;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" swipeToClose hideClose className="w-[88vw] max-w-sm">
        <SheetHeader>
          <SheetTitle>
            <Logo size="sm" />
          </SheetTitle>
          <SheetClose
            aria-label="Close menu"
            className={closeButtonClass({ className: "ml-auto" })}
          >
            {/* two bars draw into an X (see .x-bar); the wrapper spins a
                quarter turn on hover/press for tactile feedback */}
            <span className="relative block size-4 transition-transform duration-300 ease-spring group-hover:rotate-90 group-active:rotate-90">
              <span className="x-bar" style={{ "--bar-r": "45deg", animationDelay: "160ms" } as React.CSSProperties} />
              <span className="x-bar" style={{ "--bar-r": "-45deg", animationDelay: "240ms" } as React.CSSProperties} />
            </span>
          </SheetClose>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* account */}
          <div className="mnav-item border-b border-border p-4" style={stagger(0)}>
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
            ].map((l, i) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => closeAndScroll(l.href)}
                className="mnav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-ink hover:bg-muted"
                style={stagger(1 + i)}
              >
                <l.icon className="size-5 text-faint" />
                {l.label}
              </Link>
            ))}
          </nav>

          {/* categories */}
          <div className="p-2">
            <p
              className="mnav-item px-3 py-2 text-11 font-extrabold uppercase tracking-wide text-faint"
              style={stagger(4)}
            >
              Categories
            </p>
            {roots.map((cat, i) => {
              const Icon = categoryIcon(cat.slug);
              return (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  onClick={close}
                  className="mnav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-ink hover:bg-muted"
                  style={stagger(5 + i)}
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
          <div className="mnav-item border-t border-border p-2" style={stagger(3)}>
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
  { label: "Cart", href: "/cart", icon: CartIcon, isCart: true },
  { label: "Alerts", href: "/account/notifications", icon: BellIcon, isAlerts: true },
  { label: "Account", href: "/account", icon: AccountIcon },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const count = useCartCount();
  const { data: unread } = useUnreadCount();
  const unreadCount = unread?.count ?? 0;
  const navRef = React.useRef<HTMLElement | null>(null);

  // Product pages replace the tab bar with the PDP's own sticky action bar
  // (Store / Chat / Add to cart / Buy now) — showing both would stack two
  // bottom bars.
  const hidden = isProductPath(pathname);

  // Publish the bar's rendered height as --bottom-nav-h so in-page sticky
  // elements (the cart page's checkout bar) can rest just above it. Measured
  // rather than hardcoded so safe-area insets and font metrics stay covered.
  React.useEffect(() => {
    const el = navRef.current;
    if (hidden || !el) return;
    const root = document.documentElement;
    const update = () =>
      root.style.setProperty("--bottom-nav-h", `${el.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--bottom-nav-h");
    };
  }, [hidden]);

  if (hidden) return null;

  // Single active slot drives both the tab tint and the sliding indicator/glow
  // (hidden entirely on routes that aren't in the bar, e.g. product pages).
  const activeIndex = TABS.findIndex((t) =>
    t.href === "/" ? pathname === "/" : pathname.startsWith(t.href),
  );
  const slide = {
    transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
  };
  const slideCls = cn(
    "pointer-events-none absolute left-0 w-1/5 transition-[transform,opacity] duration-[260ms] [transition-timing-function:cubic-bezier(0.34,1.12,0.5,1)]",
    activeIndex < 0 && "opacity-0",
  );

  return (
    <nav
      ref={navRef}
      // Top hairline set as an explicit inline border (literal `solid`) rather
      // than Tailwind's `border-t border-border`. The utility routes the style
      // through `border-top-style: var(--tw-border-style)`, and that custom
      // property can fail to resolve to `solid` in the minified prod bundle —
      // giving a 1px, correctly-coloured, but style:none (invisible) border.
      // Renders in dev, vanishes on Vercel. Inline `solid` sidesteps it.
      style={{ borderTop: "1px solid var(--border)" }}
      className="sticky bottom-0 z-40 overflow-hidden bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
    >
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
                  "relative flex transition-[transform,color] duration-[280ms] ease-spring",
                  active
                    ? "-translate-y-[3px] scale-[1.12] text-primary"
                    : "text-faint",
                )}
              >
                <t.icon className="size-5" />
                {t.isCart && count > 0 && (
                  <span className="absolute -right-[9px] -top-[2px] flex h-4 min-w-4 animate-badge-pulse items-center justify-center rounded-full border-2 border-card bg-primary px-1 text-2xs font-bold text-white">
                    {count}
                  </span>
                )}
                {t.isAlerts && unreadCount > 0 && (
                  <span className="absolute -right-[9px] -top-[2px] flex h-4 min-w-4 animate-badge-pulse items-center justify-center rounded-full border-2 border-card bg-primary px-1 text-2xs font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "text-11 transition-colors duration-200",
                  active ? "font-bold text-primary" : "font-medium text-faint",
                )}
              >
                {t.label}
              </span>
            </>
          );
          // Badge sits at -top-[2px] (not higher) so the active tab's
          // -translate-y-[3px] scale-[1.12] lift can't push it up into the
          // 4px top indicator bar. pt-[13px] holds the icon's resting height.
          const cls =
            "flex flex-1 flex-col items-center gap-0.5 pb-1.5 pt-[13px] transition-transform duration-[120ms] ease-out active:scale-[0.92]";
          return (
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
