"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth/auth-context";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  type ChatMessageEvent,
  type ChatReadEvent,
  type ChatTypingEvent,
} from "@/lib/realtime/socket";
import { chatKeys, markThreadRead, prependMessage } from "@/lib/chat/queries";
import { useChatStore } from "@/lib/chat/use-chat-store";

/* ----------------------------------------------------------------------------
 * Bridges the live socket into the chat query caches + UI store. Mounted once
 * (in the ChatDock). Connects when authenticated, tears down on logout.
 * ------------------------------------------------------------------------- */

export function useChatSocket(): void {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const setPeerTyping = useChatStore((s) => s.setPeerTyping);
  const typingTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      return;
    }
    const socket = connectSocket();
    if (!socket) return;

    const onMessage = (evt: ChatMessageEvent) => {
      prependMessage(qc, evt.conversationId, evt.message);
      // Refresh the inbox (preview + unread + ordering).
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    };
    const onRead = (evt: ChatReadEvent) => {
      markThreadRead(qc, evt.conversationId, evt.readerRole, evt.readAt);
    };
    const onTyping = (evt: ChatTypingEvent) => {
      if (evt.role === "customer") return; // ignore our own echo
      if (evt.typing) {
        setPeerTyping(evt.conversationId);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setPeerTyping(null), 4000);
      } else {
        setPeerTyping(null);
      }
    };

    socket.on("chat:message", onMessage);
    socket.on("chat:read", onRead);
    socket.on("chat:typing", onTyping);

    return () => {
      const s = getSocket();
      s.off("chat:message", onMessage);
      s.off("chat:read", onRead);
      s.off("chat:typing", onTyping);
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [isAuthenticated, qc, setPeerTyping]);
}
