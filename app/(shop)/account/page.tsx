"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  ChevronRight,
  Heart,
  KeyRound,
  LogOut,
  type LucideIcon,
  MapPin,
  Package,
  Pencil,
  Star,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useUnreadCount } from "@/lib/api/account";
import { initials } from "@/lib/format";
import { ProfileOverview } from "@/components/account/profile-overview";

/* --------------------------------------------------------------------- */
/* Menu data                                                             */
/* --------------------------------------------------------------------- */

const QUICK_LINKS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "My orders", href: "/account/orders", icon: Package },
  { label: "Wishlist", href: "/account/wishlist", icon: Heart },
  { label: "My reviews", href: "/account/reviews", icon: Star },
];

const SETTINGS_LINKS: {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}[] = [
  {
    label: "Personal information",
    description: "Name, gender, date of birth",
    href: "/account/profile",
    icon: UserRound,
  },
  {
    label: "Addresses",
    description: "Manage your delivery addresses",
    href: "/account/addresses",
    icon: MapPin,
  },
  {
    label: "Notifications",
    description: "Order updates and alerts",
    href: "/account/notifications",
    icon: Bell,
  },
  {
    label: "Change password",
    description: "Keep your account secure",
    href: "/account/password",
    icon: KeyRound,
  },
];

/* --------------------------------------------------------------------- */
/* Building blocks                                                       */
/* --------------------------------------------------------------------- */

function QuickTile({
  label,
  href,
  icon: Icon,
}: {
  label: string;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-2 py-4 text-center shadow-[var(--shadow-card)] transition-all duration-200 hover:border-primary/40 active:scale-[0.97]"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-blue-soft text-primary transition-transform duration-200 ease-out group-hover:scale-110">
        <Icon className="size-5" />
      </span>
      <span className="text-xs font-bold text-ink">{label}</span>
    </Link>
  );
}

function MenuRow({
  label,
  description,
  href,
  icon: Icon,
  badge,
}: {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-muted active:bg-muted"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-soft text-primary">
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-ink">{label}</span>
        <span className="block truncate text-xs text-sub">{description}</span>
      </span>
      {badge}
      <ChevronRight className="size-4 shrink-0 text-faint" />
    </Link>
  );
}

/* --------------------------------------------------------------------- */
/* Page                                                                  */
/* --------------------------------------------------------------------- */

/**
 * /account is viewport-split: phones get an app-style hub (the sidebar is
 * hidden there), while desktop — which already shows the sidebar — goes
 * straight to personal information, mirroring the sidebar's first item.
 */
export default function AccountOverviewPage() {
  const isDesktop = React.useSyncExternalStore(
    React.useCallback((notify) => {
      const mq = window.matchMedia("(min-width: 1024px)");
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    }, []),
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );

  if (isDesktop) return <ProfileOverview />;
  return <MobileAccountHub />;
}

function MobileAccountHub() {
  const { user, logout } = useAuth();
  const { data: unread } = useUnreadCount();
  const unreadCount = unread?.count ?? 0;

  if (!user) return null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">My account</h1>

      {/* Profile hero */}
      <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-blue-deep to-navy text-white shadow-[var(--shadow-card)]">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full bg-white/[0.07]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-16 right-14 size-32 rounded-full bg-amber/15"
        />
        <div className="relative flex items-center gap-4 p-5 sm:p-6">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-amber font-display text-lg font-extrabold text-blue-deep ring-2 ring-white/20 sm:size-16 sm:text-xl">
            {initials(user.fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-extrabold sm:text-lg">
              {user.fullName}
            </p>
            <p className="truncate text-xs text-white/70 sm:text-sm">
              {user.email}
            </p>
          </div>
          <Link
            href="/account/profile"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20 active:bg-white/25"
          >
            <Pencil className="size-3.5" />
            Edit
          </Link>
        </div>
      </section>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3">
        {QUICK_LINKS.map((link) => (
          <QuickTile key={link.href} {...link} />
        ))}
      </div>

      {/* Account settings */}
      <section>
        <h2 className="mb-2 px-1 text-[11px] font-extrabold uppercase tracking-wide text-faint">
          Account settings
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="divide-y divide-border">
            {SETTINGS_LINKS.map((link) => (
              <MenuRow
                key={link.href}
                {...link}
                badge={
                  link.href === "/account/notifications" && unreadCount > 0 ? (
                    <span className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-red px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : undefined
                }
              />
            ))}
          </div>
        </div>
      </section>

      {/* Log out */}
      <button
        type="button"
        onClick={() => void logout()}
        className="flex w-full items-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-3.5 text-sm font-bold text-red shadow-[var(--shadow-card)] transition-colors hover:bg-red/5 active:bg-red/10"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red/10">
          <LogOut className="size-[18px]" />
        </span>
        Log out
        <ChevronRight className="ml-auto size-4 shrink-0 text-faint" />
      </button>
    </div>
  );
}
