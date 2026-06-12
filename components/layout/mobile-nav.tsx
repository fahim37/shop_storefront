"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  Grid3x3,
  Heart,
  Home,
  LogOut,
  Menu,
  ShoppingCart,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { useUIStore } from "@/lib/store/ui";
import { initials } from "@/lib/format";

export function MobileMenuButton() {
  const open = useUIStore((s) => s.openMobileNav);
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open menu"
      className="flex size-9 items-center justify-center rounded-lg text-ink md:hidden"
    >
      <Menu className="size-6" />
    </button>
  );
}

export function MobileNav() {
  const open = useUIStore((s) => s.mobileNavOpen);
  const setOpen = useUIStore((s) => s.setMobileNav);
  const { data: tree } = useCategoryTree();
  const { status, user, openAuth, logout } = useAuth();
  const roots = tree ?? [];

  const close = () => setOpen(false);

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
                <span className="flex size-11 items-center justify-center rounded-full bg-blue-deep font-display font-extrabold text-amber">
                  {initials(user.fullName)}
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
              { label: "Home", href: "/", icon: Home },
              { label: "My orders", href: "/account/orders", icon: ShoppingCart },
              { label: "Wishlist", href: "/account/wishlist", icon: Heart },
            ].map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={close}
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
  { label: "Home", href: "/", icon: Home },
  { label: "Categories", href: "/category/electronics", icon: Grid3x3 },
  { label: "Cart", href: "#cart", icon: ShoppingCart, isCart: true },
  { label: "Wishlist", href: "/account/wishlist", icon: Heart },
  { label: "Account", href: "/account", icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const openCart = useUIStore((s) => s.openCartDrawer);
  const count = useCartCount();

  return (
    <nav className="sticky bottom-0 z-40 flex border-t border-border bg-card md:hidden">
      {TABS.map((t) => {
        const active = !t.isCart && (t.href === "/" ? pathname === "/" : pathname.startsWith(t.href));
        const content = (
          <span className="relative flex flex-col items-center gap-1">
            <span className="relative">
              <t.icon className="size-[22px]" strokeWidth={active ? 2.4 : 1.8} />
              {t.isCart && count > 0 && (
                <span className="absolute -right-2.5 -top-1.5 flex min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-extrabold text-white">
                  {count}
                </span>
              )}
            </span>
            {t.label}
          </span>
        );
        const cls = cn(
          "flex flex-1 items-center justify-center py-2.5 text-[10px] font-bold transition-colors",
          active ? "text-primary" : "text-faint",
        );
        return t.isCart ? (
          <button key={t.label} type="button" onClick={openCart} className={cls}>
            {content}
          </button>
        ) : (
          <Link key={t.label} href={t.href} className={cls}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
