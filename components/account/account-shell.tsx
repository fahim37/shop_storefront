"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  Heart,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  Star,
  Store,
  Undo2,
} from "lucide-react";
import { AccountIcon, BellIcon } from "@/components/icons/nav-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { useAuth } from "@/lib/auth/auth-context";
import { useUnreadCount } from "@/lib/api/account";
import { AccountAvatar } from "@/components/account/account-avatar";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/account", icon: LayoutDashboard, exact: true },
  { label: "Personal information", href: "/account/profile", icon: AccountIcon },
  { label: "Order history", href: "/account/orders", icon: Package },
  { label: "Returns & refunds", href: "/account/returns", icon: Undo2 },
  { label: "My wishlist", href: "/account/wishlist", icon: Heart },
  { label: "Followed stores", href: "/account/followed-stores", icon: Store },
  { label: "Addresses", href: "/account/addresses", icon: MapPin },
  { label: "My reviews", href: "/account/reviews", icon: Star },
  { label: "Notifications", href: "/account/notifications", icon: BellIcon },
  { label: "Change password", href: "/account/password", icon: KeyRound },
];

export function AccountShell({ children }: { children: React.ReactNode }) {
  const { status, user, openAuth, logout } = useAuth();
  const pathname = usePathname();
  const { data: unread } = useUnreadCount();
  const unreadCount = unread?.count ?? 0;

  if (status === "loading") {
    return <AccountShellSkeleton />;
  }

  if (status !== "authenticated" || !user) {
    return (
      <div className="wrap py-16">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card p-10 text-center shadow-[var(--shadow-card)]">
          <span className="flex size-14 items-center justify-center rounded-full bg-blue-soft text-primary">
            <AccountIcon className="size-6" />
          </span>
          <h1 className="font-display text-xl font-extrabold">Sign in to your account</h1>
          <p className="text-sm text-muted-foreground">
            View your orders, wishlist, addresses and more.
          </p>
          <Button onClick={() => openAuth("login")}>Sign in</Button>
        </div>
      </div>
    );
  }

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const isHub = pathname === "/account";
  // The most specific non-exact section this route belongs to (e.g. an order
  // detail lives under "Order history").
  const section = NAV.find((item) => !item.exact && pathname.startsWith(item.href));

  // Mobile back target: nested pages step back to their section root; section
  // roots step back to the dashboard.
  const back =
    section && pathname !== section.href
      ? { href: section.href, label: section.label }
      : { href: "/account", label: "Dashboard" };

  const crumbs = section
    ? [{ label: "My account", href: "/account" }, { label: section.label }]
    : [{ label: "My account" }];

  return (
    <div className="wrap py-4 lg:py-6">
      <Breadcrumbs items={crumbs} className="mb-4 hidden lg:flex" />

      {!isHub && (
        <Link
          href={back.href}
          className="-ml-2 mb-3 flex w-fit items-center gap-1 rounded-full py-1 pr-3 text-ink transition-colors hover:bg-muted active:bg-muted lg:hidden"
        >
          <span className="flex size-9 shrink-0 items-center justify-center">
            <ChevronLeft className="size-5" />
          </span>
          <span className="text-sm font-bold text-sub">{back.label}</span>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-[264px_1fr]">
        <aside className="hidden h-max rounded-2xl border border-border bg-card p-4 pt-6 shadow-[var(--shadow-card)] lg:block">
          <div className="mb-3 flex flex-col items-center border-b border-border pb-5 text-center">
            <AccountAvatar
              fullName={user.fullName}
              photoUrl={user.photoUrl}
              className="size-[72px] bg-blue-deep font-display text-2xl font-extrabold text-amber"
            />
            <b className="mt-3 font-display text-base font-extrabold">{user.fullName}</b>
            <span className="max-w-full truncate text-xs text-faint">{user.email}</span>
            {user.isEmailVerified && user.isPhoneVerified && (
              <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-amber-soft px-2.5 py-1 text-2xs font-extrabold uppercase tracking-wide text-amber-deep">
                <Star className="size-3 fill-amber text-amber" />
                Verified member
              </span>
            )}
          </div>
          <nav className="flex flex-col gap-0.5">
            {NAV.map((item) => {
              const active = isActive(item);
              const showBadge =
                item.href === "/account/notifications" && unreadCount > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-13 font-bold transition-colors",
                    active ? "bg-primary text-white" : "text-sub hover:bg-muted",
                  )}
                >
                  <item.icon
                    className={cn("size-4 shrink-0", active ? "text-amber" : "text-faint")}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {showBadge && (
                    <span
                      className={cn(
                        "flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-2xs font-extrabold",
                        active ? "bg-white/20 text-white" : "bg-red text-white",
                      )}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
            <div className="my-2 h-px bg-line" />
            <button
              type="button"
              onClick={() => void logout()}
              className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-13 font-bold text-red transition-colors hover:bg-red/10"
            >
              <LogOut className="size-4 text-red" />
              Log out
            </button>
          </nav>
        </aside>
        <div className="flex min-w-0 flex-col gap-4">{children}</div>
      </div>
    </div>
  );
}

/** Mirrors the shell layout while auth status resolves. */
function AccountShellSkeleton() {
  return (
    <div className="wrap py-4 lg:py-6">
      <Skeleton className="mb-4 hidden h-4 w-40 lg:block" />
      <div className="grid gap-6 lg:grid-cols-[264px_1fr]">
        <aside className="hidden h-max rounded-2xl border border-border bg-card p-4 pt-6 lg:block">
          <div className="mb-3 flex flex-col items-center gap-2 border-b border-border pb-5">
            <Skeleton className="size-[72px] rounded-full" />
            <Skeleton className="mt-1 h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
          <nav className="flex flex-col gap-0.5">
            {Array.from({ length: NAV.length + 1 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-col gap-4">
          <Skeleton className="h-[132px] rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
