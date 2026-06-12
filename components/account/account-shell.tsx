"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  KeyRound,
  LogOut,
  type LucideIcon,
  MapPin,
  Package,
  Heart,
  Star,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { useAuth } from "@/lib/auth/auth-context";
import { initials } from "@/lib/format";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { label: "Personal information", href: "/account", icon: User, exact: true },
  { label: "My wishlist", href: "/account/wishlist", icon: Heart },
  { label: "Order history", href: "/account/orders", icon: Package },
  { label: "Addresses", href: "/account/addresses", icon: MapPin },
  { label: "My reviews", href: "/account/reviews", icon: Star },
  { label: "Notifications", href: "/account/notifications", icon: Bell },
  { label: "Change password", href: "/account/password", icon: KeyRound },
];

export function AccountShell({ children }: { children: React.ReactNode }) {
  const { status, user, openAuth, logout } = useAuth();
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="size-7" />
      </div>
    );
  }

  if (status !== "authenticated" || !user) {
    return (
      <div className="wrap py-16">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card p-10 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-blue-soft text-primary">
            <User className="size-6" />
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

  return (
    <div className="wrap py-4">
      <Breadcrumbs items={[{ label: "My account" }]} className="mb-4" />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="h-max rounded-2xl border border-border bg-card p-4 pt-6">
          <div className="mb-3 flex flex-col items-center border-b border-border pb-5 text-center">
            <span className="flex size-[76px] items-center justify-center rounded-full bg-blue-deep font-display text-2xl font-extrabold text-amber">
              {initials(user.fullName)}
            </span>
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
                    "flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-[13px] font-bold transition-colors",
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
              className="mt-1 flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-[13px] font-bold text-red hover:bg-red/10"
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
