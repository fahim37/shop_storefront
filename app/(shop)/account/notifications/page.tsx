"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, BellOff, CheckCheck, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import { notificationHref } from "@/lib/notification-link";
import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllRead,
  useNotificationPrefs,
  useUpdateNotificationPrefs,
} from "@/lib/api/account";
import { useOrders } from "@/lib/api/orders";
import { ApiError } from "@/lib/api/http";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Notification, NotificationPrefs } from "@/lib/api/types";

/* -------------------------------------------------------------------------- */
/* Category classification + date grouping                                    */
/* -------------------------------------------------------------------------- */

type NotifCategory = "orders" | "replies" | "other";
type NotifFilter = "all" | "orders" | "replies";

function categoryOf(n: Notification): NotifCategory {
  const k = n.templateKey;
  if (
    k.startsWith("order.") ||
    k.startsWith("sub_order.") ||
    k.startsWith("shipment.") ||
    k.startsWith("payment.") ||
    k.startsWith("return.")
  )
    return "orders";
  if (k.startsWith("review.")) return "replies";
  return "other";
}

const FILTERS: { key: NotifFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "orders", label: "Orders" },
  { key: "replies", label: "Replies" },
];

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function NotificationsPage() {
  const list = useNotifications(false);
  const unread = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();
  const [filter, setFilter] = React.useState<NotifFilter>("all");

  // Order/shipment alerts deep-link to a specific order, but the notification
  // payload only carries the orderNumber — resolve it to the order's id so the
  // row can point at /account/orders/[id].
  const orders = useOrders({ limit: 50 });
  const resolveOrderId = React.useMemo(() => {
    const byNumber = new Map<string, string>();
    for (const o of orders.data ?? []) byNumber.set(o.orderNumber, o.id);
    return (orderNumber: string) => byNumber.get(orderNumber);
  }, [orders.data]);

  const notifications = React.useMemo<Notification[]>(
    () => list.data?.pages.flatMap((p) => p.data) ?? [],
    [list.data],
  );

  const visible = React.useMemo(() => {
    if (filter === "all") return notifications;
    return notifications.filter((n) => categoryOf(n) === filter);
  }, [notifications, filter]);

  const unreadCount = unread.data?.count ?? 0;

  // Opening this page reads the inbox, so reset the badge counter once the
  // unread count is known — same mutation as the manual button, just silent.
  const autoMarkedRef = React.useRef(false);
  React.useEffect(() => {
    if (autoMarkedRef.current || !unread.isSuccess || unreadCount === 0) return;
    autoMarkedRef.current = true;
    markAll.mutate();
  }, [unread.isSuccess, unreadCount, markAll]);

  const handleMarkAll = () => {
    markAll.mutate(undefined, {
      onSuccess: (res) =>
        toast.success("All notifications marked as read", {
          description: res.count > 0 ? `${res.count} updated.` : undefined,
        }),
      onError: (err) =>
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Could not update notifications.",
        ),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="font-display text-xl font-extrabold sm:text-2xl">
            Notifications
          </h1>
          {unreadCount > 0 && (
            <Badge variant="primary" size="sm" aria-label={`${unreadCount} unread`}>
              {unreadCount} new
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAll}
          loading={markAll.isPending}
          disabled={unreadCount === 0 || markAll.isPending}
        >
          <CheckCheck className="size-4" />
          Mark all read
        </Button>
      </div>

      {/* Filter tabs -------------------------------------------------------- */}
      {!list.isLoading && !list.isError && notifications.length > 0 && (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-2 text-13 font-bold transition-colors",
                  active
                    ? "border-blue-deep bg-blue-deep text-white"
                    : "border-border bg-card text-sub hover:bg-muted",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      )}

      {/* List --------------------------------------------------------------- */}
      <NotificationList
        items={visible}
        totalLoaded={notifications.length}
        isLoading={list.isLoading}
        isError={list.isError}
        error={list.error}
        onRetry={() => void list.refetch()}
        onMarkRead={(id) => markRead.mutate(id)}
        markingId={markRead.isPending ? markRead.variables : undefined}
        resolveOrderId={resolveOrderId}
        hasNextPage={Boolean(list.hasNextPage)}
        isFetchingNextPage={list.isFetchingNextPage}
        onLoadMore={() => void list.fetchNextPage()}
      />

      {/* Preferences -------------------------------------------------------- */}
      <PreferencesCard />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Notification list                                                          */
/* -------------------------------------------------------------------------- */

interface NotificationListProps {
  items: Notification[];
  /** Raw count before the category filter — distinguishes "empty inbox" from
   *  "nothing in this filter". */
  totalLoaded: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  onMarkRead: (id: string) => void;
  markingId?: string;
  resolveOrderId: (orderNumber: string) => string | undefined;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

function NotificationList({
  items,
  totalLoaded,
  isLoading,
  isError,
  error,
  onRetry,
  onMarkRead,
  markingId,
  resolveOrderId,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: NotificationListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <NotificationSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-border bg-card">
        <EmptyState
          icon={<BellOff className="size-7 text-faint" />}
          title="Couldn’t load notifications"
          description={
            error instanceof ApiError
              ? error.message
              : "Something went wrong. Please try again."
          }
          action={
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (totalLoaded === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card">
        <EmptyState
          icon={<Bell className="size-7 text-faint" />}
          title="You’re all caught up"
          description="Order updates, offers and replies will show up here."
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card">
        <EmptyState
          icon={<Bell className="size-7 text-faint" />}
          title="Nothing here yet"
          description="No notifications match this filter."
        />
      </div>
    );
  }

  const today = items.filter((n) => isToday(n.createdAt));
  const earlier = items.filter((n) => !isToday(n.createdAt));

  const renderGroup = (label: string, group: Notification[]) =>
    group.length > 0 ? (
      <section key={label} className="flex flex-col gap-2.5">
        <h2 className="px-1 text-11 font-extrabold uppercase tracking-wide text-faint">
          {label}
        </h2>
        {group.map((n) => (
          <NotificationRow
            key={n.id}
            notification={n}
            onMarkRead={onMarkRead}
            isMarking={markingId === n.id}
            resolveOrderId={resolveOrderId}
          />
        ))}
      </section>
    ) : null;

  return (
    <div className="flex flex-col gap-4">
      {renderGroup("Today", today)}
      {renderGroup("Earlier", earlier)}

      {hasNextPage && (
        <div className="flex justify-center pt-1">
          <Button
            variant="soft"
            size="sm"
            onClick={onLoadMore}
            loading={isFetchingNextPage}
            disabled={isFetchingNextPage}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Notification row                                                           */
/* -------------------------------------------------------------------------- */

interface NotificationRowProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  isMarking: boolean;
  resolveOrderId: (orderNumber: string) => string | undefined;
}

function NotificationRow({
  notification,
  onMarkRead,
  isMarking,
  resolveOrderId,
}: NotificationRowProps) {
  const isUnread = notification.readAt === null;
  const title = notification.payload?.subject ?? notification.templateKey;
  const body = notification.payload?.body;
  const href = notificationHref(notification, resolveOrderId);

  return (
    <Link
      href={href}
      // Marking read is fire-and-forget; navigation happens regardless.
      onClick={() => {
        if (isUnread && !isMarking) onMarkRead(notification.id);
      }}
      className={cn(
        "group flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors sm:p-4",
        isUnread
          ? "border-primary/15 bg-blue-soft hover:bg-blue-soft/70"
          : "border-border bg-card hover:bg-muted/50",
      )}
    >
      {/* unread dot / icon */}
      <span className="mt-0.5 flex shrink-0 items-center justify-center">
        {isUnread ? (
          <span className="size-2.5 rounded-full bg-primary" aria-label="Unread" />
        ) : (
          <Bell className="size-4 text-faint" aria-hidden />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p
            className={cn(
              "min-w-0 break-words text-sm",
              isUnread ? "font-bold text-ink" : "font-semibold text-sub",
            )}
          >
            {title}
          </p>
          <time
            className="shrink-0 whitespace-nowrap text-xs text-faint"
            dateTime={notification.createdAt}
          >
            {formatRelative(notification.createdAt)}
          </time>
        </div>

        {body && <p className="mt-1 break-words text-sm text-sub">{body}</p>}

        {isMarking && (
          <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-faint">
            <Spinner className="size-3" /> Marking as read…
          </span>
        )}
      </div>

      <ChevronRight className="size-4 shrink-0 self-center text-faint transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 sm:p-4">
      <Skeleton className="mt-0.5 size-2.5 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-14" />
        </div>
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Preferences card                                                           */
/* -------------------------------------------------------------------------- */

interface PrefRow {
  key: keyof Pick<
    NotificationPrefs,
    "emailMarketing" | "smsMarketing" | "pushMarketing" | "pushChatReplies"
  >;
  label: string;
  description: string;
}

const PREF_ROWS: PrefRow[] = [
  {
    key: "emailMarketing",
    label: "Email offers",
    description: "Deals, promotions and product news by email.",
  },
  {
    key: "smsMarketing",
    label: "SMS offers",
    description: "Time-sensitive offers and reminders by text message.",
  },
  {
    key: "pushMarketing",
    label: "Push offers",
    description: "Promotions delivered as app push notifications.",
  },
  {
    key: "pushChatReplies",
    label: "Chat replies",
    description: "Get notified when a seller replies to your messages.",
  },
];

function PreferencesCard() {
  const prefs = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();

  // Track which row is mid-flight so only that toggle shows a busy state.
  const [pendingKey, setPendingKey] = React.useState<PrefRow["key"] | null>(null);

  const data = prefs.data;

  const handleToggle = (key: PrefRow["key"], next: boolean) => {
    if (!data) return;
    setPendingKey(key);
    update.mutate(
      { [key]: next },
      {
        onSuccess: () => toast.success("Preferences updated"),
        onError: (err) =>
          toast.error(
            err instanceof ApiError
              ? err.message
              : "Could not save your preferences.",
          ),
        onSettled: () => setPendingKey(null),
      },
    );
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="font-display text-base font-extrabold">
          Preferences
        </CardTitle>
        <p className="text-sm text-sub">Choose how GCL keeps you up to date.</p>
      </CardHeader>

      <CardContent>
        {prefs.isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: PREF_ROWS.length }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 py-1.5"
              >
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-5 w-5 rounded-md" />
              </div>
            ))}
          </div>
        ) : prefs.isError || !data ? (
          <div className="flex flex-col items-start gap-3 py-2">
            <p className="text-sm text-sub">
              {prefs.error instanceof ApiError
                ? prefs.error.message
                : "We couldn’t load your preferences."}
            </p>
            <Button variant="outline" size="sm" onClick={() => void prefs.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {PREF_ROWS.map((row) => {
              const id = `pref-${row.key}`;
              const busy = pendingKey === row.key && update.isPending;
              return (
                <label
                  key={row.key}
                  htmlFor={id}
                  className="flex cursor-pointer items-start justify-between gap-4 py-3.5 first:pt-1 last:pb-1"
                >
                  <div className="min-w-0">
                    <span className="block text-sm font-bold text-ink">
                      {row.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-sub">
                      {row.description}
                    </span>
                  </div>
                  <span className="flex shrink-0 items-center gap-2 pt-0.5">
                    {busy && <Spinner className="size-3.5 text-faint" />}
                    <Checkbox
                      id={id}
                      checked={data[row.key]}
                      disabled={busy}
                      onCheckedChange={(c) => handleToggle(row.key, c === true)}
                    />
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
