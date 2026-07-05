"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  Heart,
  KeyRound,
  LogOut,
  MapPin,
  Package,
  Star,
} from "lucide-react";
import { AccountIcon, BellIcon } from "@/components/icons/nav-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { useAuth } from "@/lib/auth/auth-context";
import { AccountAvatar } from "@/components/account/account-avatar";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { label: "Personal information", href: "/account", icon: AccountIcon, exact: true },
  { label: "Order history", href: "/account/orders", icon: Package },
  { label: "My wishlist", href: "/account/wishlist", icon: Heart },
  { label: "Addresses", href: "/account/addresses", icon: MapPin },
  { label: "My reviews", href: "/account/reviews", icon: Star },
  { label: "Notifications", href: "/account/notifications", icon: BellIcon },
  { label: "Change password", href: "/account/password", icon: KeyRound },
];

export function AccountShell({ children }: { children: React.ReactNode }) {
  const { status, user, openAuth, logout } = useAuth();
  const pathname = usePathname();

  if (status === "loading") {
    return <AccountShellSkeleton />;
  }

  if (status !== "authenticated" || !user) {
    return (
      <div className="wrap py-16">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card p-10 text-center">
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

  // /account/profile is the mobile-only detail route for personal information;
  // on desktop it shows the same content as /account, so highlight that item.
  const isActive = (item: NavItem) =>
    item.exact
      ? pathname === item.href ||
        (item.href === "/account" && pathname.startsWith("/account/profile"))
      : pathname.startsWith(item.href);

  const isHub = pathname === "/account";
  const section = NAV.find((item) => !item.exact && pathname.startsWith(item.href));

  // Mobile back target: nested pages (e.g. an order detail) step back to their
  // section; section roots step back to the account hub.
  const back =
    section && pathname !== section.href
      ? { href: section.href, label: section.label }
      : { href: "/account", label: "My account" };

  const crumbs = section
    ? [{ label: "My account", href: "/account" }, { label: section.label }]
    : [{ label: "My account" }];

  return (
    <div className="wrap py-4">
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

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="hidden h-max rounded-2xl border border-border bg-card p-4 pt-6 lg:block">
          <div className="mb-3 flex flex-col items-center border-b border-border pb-5 text-center">
            <AccountAvatar
              fullName={user.fullName}
              photoUrl={user.photoUrl}
              className="size-[76px] bg-blue-deep font-display text-2xl font-extrabold text-amber"
            />
            <b className="mt-2.5 font-display text-base font-extrabold">{user.fullName}</b>
            <span className="text-xs text-faint">{user.email}</span>
          </div>
          <nav className="flex flex-col gap-0.5">
            {NAV.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3.5 py-2.5 text-[13px] font-bold transition-colors",
                    active
                      ? "bg-primary text-white"
                      : "text-sub hover:bg-muted",
                  )}
                >
                  <item.icon
                    className={cn("size-4", active ? "text-amber" : "text-faint")}
                  />
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => void logout()}
              className="mt-1 flex items-center gap-3 rounded-md px-3.5 py-2.5 text-[13px] font-bold text-red hover:bg-red/10"
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
    <div className="wrap py-4">
      <Skeleton className="mb-4 hidden h-4 w-40 lg:block" />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="hidden h-max rounded-2xl border border-border bg-card p-4 pt-6 lg:block">
          <div className="mb-3 flex flex-col items-center gap-2 border-b border-border pb-5">
            <Skeleton className="size-[76px] rounded-full" />
            <Skeleton className="mt-1 h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
          <nav className="flex flex-col gap-0.5">
            {Array.from({ length: NAV.length + 1 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-col gap-4">
          <Skeleton className="h-[104px] rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
