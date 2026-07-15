"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth/auth-context";
import { connectSocket, getSocket } from "@/lib/realtime/socket";
import { qk } from "@/lib/api/query-keys";
import { notificationHref } from "@/lib/notification-link";
import { toast } from "@/components/ui/sonner";

/* ----------------------------------------------------------------------------
 * Bridges the live socket into the notification caches. The backend emits
 * `notification:new` to the user's room whenever an in-app notification lands
 * (see notification.service.ts). We refresh the unread badge + feed so they
 * update instantly instead of waiting for the 60s poll, and surface a toast so
 * the arrival is actually seen. Mounted once, globally (alongside the chat
 * bridge). Does NOT own the socket lifecycle — the chat bridge connects and
 * disconnects; we only attach a listener while authenticated.
 * ------------------------------------------------------------------------- */

/** Payload of `notification:new` (see emitInAppEvent in the backend). */
interface NotificationNewEvent {
  id: string;
  subject: string | null;
  body: string;
  templateKey: string;
}

export function useNotificationSocket(): void {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();

  React.useEffect(() => {
    if (!isAuthenticated) return;
    const socket = connectSocket();
    if (!socket) return;

    const onNew = (evt: NotificationNewEvent) => {
      // Live-refresh the bell badge + the notifications list.
      void qc.invalidateQueries({ queryKey: qk.unreadCount() });
      void qc.invalidateQueries({ queryKey: ["notifications"] });

      // Surface it. No order-id resolver here, so order alerts route to the
      // orders list rather than a specific order — good enough for a toast.
      const title = evt.subject?.trim() || evt.body || "New notification";
      const href = notificationHref({ templateKey: evt.templateKey, payload: null });
      toast(title, {
        description: evt.subject && evt.body ? evt.body : undefined,
        action: { label: "View", onClick: () => router.push(href) },
      });
    };

    socket.on("notification:new", onNew);
    return () => {
      getSocket().off("notification:new", onNew);
    };
  }, [isAuthenticated, qc, router]);
}
