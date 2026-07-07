"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  ChevronRight,
  Heart,
  KeyRound,
  LogOut,
  MapPin,
  Package,
  ShoppingBag,
  Star,
  Store,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useOrders } from "@/lib/api/orders";
import { useWishlist } from "@/lib/api/engagement";
import { useNotifications, useUnreadCount } from "@/lib/api/account";
import { AccountAvatar } from "@/components/account/account-avatar";
import { MediaImage } from "@/components/ui/media-image";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPaisa, formatRelative } from "@/lib/format";
import { notificationHref } from "@/lib/notification-link";
import {
  TRACKING_STEPS,
  currentStepIndex,
  deriveOrderListStatus,
  ORDER_LIST_STATUS_BADGE,
} from "@/lib/order-status";
import { cn } from "@/lib/utils";
import type { Notification, OrderListItem, SubOrderStatus } from "@/lib/api/types";

const IN_TRANSIT_STATES: SubOrderStatus[] = [
  "at_hub",
  "dispatched",
  "out_for_delivery",
];

/** Least-progressed non-cancelled shipment as a TRACKING_STEPS index, or null. */
function minTrackingStep(order: OrderListItem): number | null {
  const steps = (order.summary.subOrderStatuses ?? [])
    .filter((s) => s !== "cancelled" && s !== "returned")
    .map((s) => currentStepIndex(s))
    .filter((i) => i >= 0);
  return steps.length > 0 ? Math.min(...steps) : null;
}

export default function AccountDashboardPage() {
  const { user } = useAuth();
  const orders = useOrders({ limit: 100 });
  const wishlist = useWishlist();
  const unread = useUnreadCount();
  const notifications = useNotifications(false);

  const list = React.useMemo(() => orders.data ?? [], [orders.data]);

  const stats = React.useMemo(() => {
    let active = 0;
    let delivered = 0;
    let inTransit = 0;
    for (const o of list) {
      const status = deriveOrderListStatus(o);
      if (status === "delivered") delivered += 1;
      else if (status === "placed" || status === "processing") active += 1;
      if ((o.summary.subOrderStatuses ?? []).some((s) => IN_TRANSIT_STATES.includes(s)))
        inTransit += 1;
    }
    return { active, delivered, inTransit };
  }, [list]);

  const savedCount = wishlist.data?.length ?? 0;
  const unreadCount = unread.data?.count ?? 0;

  // Resolve orderNumber → id so notification deep-links reach the order page.
  const resolveOrderId = React.useMemo(() => {
    const byNumber = new Map<string, string>();
    for (const o of list) byNumber.set(o.orderNumber, o.id);
    return (orderNumber: string) => byNumber.get(orderNumber);
  }, [list]);

  const recentOrders = list.slice(0, 3);
  const recentNotifications = React.useMemo<Notification[]>(
    () => notifications.data?.pages.flatMap((p) => p.data).slice(0, 4) ?? [],
    [notifications.data],
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Account dashboard</h1>

      {/* Welcome hero ------------------------------------------------------- */}
      <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-navy via-blue-deep to-[oklch(0.32_0.11_262)] text-white shadow-[var(--shadow-card)]">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full bg-amber/10"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-20 left-24 size-48 rounded-full bg-white/[0.05]"
        />
        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="flex items-center gap-4">
            <AccountAvatar
              fullName={user?.fullName ?? ""}
              photoUrl={user?.photoUrl ?? null}
              className="size-14 bg-amber font-display text-lg font-extrabold text-blue-deep ring-2 ring-white/20 sm:size-16 sm:text-xl lg:hidden"
            />
            <div className="min-w-0">
              <p className="text-13 font-semibold text-white/60">Welcome back,</p>
              <p className="truncate font-display text-22 font-extrabold leading-tight sm:text-28">
                {user?.fullName ?? "Your account"}
              </p>
              <p className="mt-1 text-13 text-white/70">
                <HeroSubline
                  loading={orders.isLoading}
                  inTransit={stats.inTransit}
                  unread={unreadCount}
                />
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <StatTile
              href="/account/orders"
              value={stats.active}
              label="Active"
              loading={orders.isLoading}
            />
            <StatTile
              href="/account/orders"
              value={stats.delivered}
              label="Delivered"
              loading={orders.isLoading}
            />
            <StatTile
              href="/account/wishlist"
              value={savedCount}
              label="Saved"
              accent
              loading={wishlist.isLoading}
            />
          </div>
        </div>
      </section>

      {/* Recent orders + notifications ------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* Recent orders */}
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
            <h2 className="font-display text-base font-extrabold text-ink">
              Recent orders
            </h2>
            <Link
              href="/account/orders"
              className="inline-flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary-hover"
            >
              View all
              <ArrowRight className="size-3.5" strokeWidth={2.4} />
            </Link>
          </header>

          {orders.isLoading ? (
            <div className="divide-y divide-line">
              {Array.from({ length: 3 }).map((_, i) => (
                <RecentOrderSkeleton key={i} />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-blue-soft text-primary">
                <ShoppingBag className="size-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">No orders yet</p>
                <p className="mt-0.5 text-13 text-sub">
                  Your recent purchases will appear here.
                </p>
              </div>
              <Link
                href="/"
                className="text-13 font-bold text-primary hover:text-primary-hover"
              >
                Start shopping →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {recentOrders.map((order) => (
                <RecentOrderRow key={order.id} order={order} />
              ))}
            </div>
          )}
        </section>

        {/* Notifications */}
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-extrabold text-ink">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <Badge variant="sale" size="sm">
                  {unreadCount > 99 ? "99+" : unreadCount} new
                </Badge>
              )}
            </div>
            <Link
              href="/account/notifications"
              className="inline-flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary-hover"
            >
              See all
              <ArrowRight className="size-3.5" strokeWidth={2.4} />
            </Link>
          </header>

          {notifications.isLoading ? (
            <div className="divide-y divide-line">
              {Array.from({ length: 3 }).map((_, i) => (
                <NotificationPreviewSkeleton key={i} />
              ))}
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-blue-soft text-primary">
                <Bell className="size-5" />
              </span>
              <p className="text-sm font-bold text-ink">You&apos;re all caught up</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {recentNotifications.map((n) => (
                <NotificationPreviewRow
                  key={n.id}
                  notification={n}
                  resolveOrderId={resolveOrderId}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Quick access ------------------------------------------------------- */}
      <section>
        <h2 className="mb-2.5 px-1 font-display text-15 font-extrabold text-ink">
          Quick access
        </h2>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 lg:grid-cols-6">
          {QUICK_TILES.map((tile) => (
            <QuickTile key={tile.href} {...tile} />
          ))}
        </div>
      </section>

      {/* Mobile-only settings + logout ------------------------------------- */}
      <section className="flex flex-col gap-3 lg:hidden">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <MenuRow
            href="/account/profile"
            icon={UserRound}
            label="Personal information"
          />
          <div className="h-px bg-line" />
          <MenuRow href="/account/password" icon={KeyRound} label="Change password" />
        </div>
        <LogoutButton />
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero pieces                                                                */
/* -------------------------------------------------------------------------- */

function HeroSubline({
  loading,
  inTransit,
  unread,
}: {
  loading: boolean;
  inTransit: number;
  unread: number;
}) {
  if (loading) return <>Here&apos;s what&apos;s happening with your account.</>;

  const parts: React.ReactNode[] = [];
  if (inTransit > 0) {
    parts.push(
      <React.Fragment key="transit">
        <b className="font-bold text-amber">
          {inTransit} order{inTransit === 1 ? "" : "s"}
        </b>{" "}
        on the way
      </React.Fragment>,
    );
  }
  if (unread > 0) {
    parts.push(
      <React.Fragment key="alerts">
        <b className="font-bold text-white">
          {unread} new alert{unread === 1 ? "" : "s"}
        </b>
      </React.Fragment>,
    );
  }

  if (parts.length === 0) {
    return <>You&apos;re all caught up — happy shopping!</>;
  }
  return (
    <>
      You have {parts[0]}
      {parts.length > 1 ? <> and {parts[1]}</> : null}.
    </>
  );
}

function StatTile({
  href,
  value,
  label,
  accent,
  loading,
}: {
  href: string;
  value: number;
  label: string;
  accent?: boolean;
  loading?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border px-3 py-3 text-center transition-colors",
        accent
          ? "border-amber/30 bg-amber/15 hover:bg-amber/20"
          : "border-white/12 bg-white/[0.08] hover:bg-white/[0.13]",
      )}
    >
      {loading ? (
        <span className="my-0.5 h-7 w-7 animate-pulse rounded bg-white/20" />
      ) : (
        <span
          className={cn(
            "font-display text-22 font-extrabold leading-none",
            accent ? "text-amber" : "text-white",
          )}
        >
          {value}
        </span>
      )}
      <span
        className={cn(
          "mt-1.5 text-11 font-bold",
          accent ? "text-amber/90" : "text-white/60",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Recent order row                                                           */
/* -------------------------------------------------------------------------- */

function RecentOrderRow({ order }: { order: OrderListItem }) {
  const href = `/account/orders/${order.id}`;
  const status = deriveOrderListStatus(order);
  const badge = ORDER_LIST_STATUS_BADGE[status];
  const step = status === "processing" ? minTrackingStep(order) : null;
  const vendor = order.summary.vendorNames.filter(Boolean)[0];

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50 sm:px-5"
    >
      <span className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
        <MediaImage
          mediaId={order.summary.firstThumbnailMediaId}
          variant="thumbnail"
          alt={`Order ${order.orderNumber}`}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-13 font-extrabold text-ink">
          {order.orderNumber}
        </p>
        <p className="mt-0.5 truncate text-xs text-sub">
          {order.summary.itemCount} {order.summary.itemCount === 1 ? "item" : "items"}
          {vendor ? ` · ${vendor}` : ""}
        </p>
        {step !== null && (
          <div className="mt-1.5 flex gap-1">
            {TRACKING_STEPS.map((s, i) => (
              <span
                key={s.key}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  i <= step ? "bg-amber" : "bg-line",
                )}
              />
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Badge variant={badge.variant} size="sm" className="gap-1">
          {badge.label}
        </Badge>
        <span className="font-display text-13 font-extrabold text-ink">
          {formatPaisa(order.grandTotalPaisa)}
        </span>
      </div>
    </Link>
  );
}

function RecentOrderSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
      <Skeleton className="size-12 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-3.5 w-14" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Notification preview row                                                   */
/* -------------------------------------------------------------------------- */

function NotificationPreviewRow({
  notification,
  resolveOrderId,
}: {
  notification: Notification;
  resolveOrderId: (orderNumber: string) => string | undefined;
}) {
  const isUnread = notification.readAt === null;
  const title = notification.payload?.subject ?? notification.templateKey;
  const href = notificationHref(notification, resolveOrderId);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 sm:px-5",
        isUnread && "bg-blue-soft/40",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
          isUnread ? "bg-blue-soft text-primary" : "bg-muted text-faint",
        )}
      >
        <Bell className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "line-clamp-2 text-13 leading-snug",
            isUnread ? "font-bold text-ink" : "font-semibold text-sub",
          )}
        >
          {title}
        </p>
        <p className="mt-0.5 text-11 text-faint">
          {formatRelative(notification.createdAt)}
        </p>
      </div>
      {isUnread && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
      )}
    </Link>
  );
}

function NotificationPreviewSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 sm:px-5">
      <Skeleton className="mt-0.5 size-8 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-full max-w-[180px]" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Quick access + mobile menu                                                 */
/* -------------------------------------------------------------------------- */

const QUICK_TILES: {
  href: string;
  label: string;
  icon: LucideIcon;
  tone: "primary" | "amber" | "red" | "green" | "navy";
}[] = [
  { href: "/account/orders", label: "Orders", icon: Package, tone: "primary" },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart, tone: "red" },
  { href: "/account/followed-stores", label: "Stores", icon: Store, tone: "navy" },
  { href: "/account/reviews", label: "Reviews", icon: Star, tone: "amber" },
  { href: "/account/addresses", label: "Addresses", icon: MapPin, tone: "primary" },
  { href: "/account/notifications", label: "Alerts", icon: Bell, tone: "green" },
  { href: "/account/profile", label: "Profile", icon: UserRound, tone: "navy" },
];

const TONE_CLASS: Record<string, string> = {
  primary: "bg-blue-soft text-primary",
  amber: "bg-amber-soft text-amber-deep",
  red: "bg-red/10 text-red",
  green: "bg-green-soft text-green",
  navy: "bg-navy/10 text-blue-deep",
};

function QuickTile({
  href,
  label,
  icon: Icon,
  tone,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-2 py-4 text-center shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-pop)] active:scale-[0.97]"
    >
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110",
          TONE_CLASS[tone],
        )}
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="text-xs font-bold text-ink">{label}</span>
    </Link>
  );
}

function MenuRow({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-muted active:bg-muted"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-soft text-primary">
        <Icon className="size-[18px]" />
      </span>
      <span className="flex-1 text-sm font-bold text-ink">{label}</span>
      <ChevronRight className="size-4 shrink-0 text-faint" />
    </Link>
  );
}

function LogoutButton() {
  const { logout } = useAuth();
  return (
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
  );
}
