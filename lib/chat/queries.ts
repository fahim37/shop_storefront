"use client";

import * as React from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";

import {
  getConversation,
  listConversations,
  markConversationRead,
  sendMessage,
  startConversation,
  type ChatMessage,
  type Conversation,
  type ConversationThread,
  type ConversationsPage,
} from "@/lib/api/messaging";

/* ----------------------------------------------------------------------------
 * TanStack Query hooks for the chat surface. The socket layer (useChatSocket)
 * mutates these caches directly for instant delivery; REST is the source of
 * truth on (re)fetch.
 * ------------------------------------------------------------------------- */

export const chatKeys = {
  all: ["chat"] as const,
  conversations: () => [...chatKeys.all, "conversations"] as const,
  thread: (id: string) => [...chatKeys.all, "thread", id] as const,
};

const THREAD_PAGE = 30;

// ── Inbox list ───────────────────────────────────────────────────────────────

export function useConversations(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: chatKeys.conversations(),
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listConversations({ cursor: pageParam, limit: 20 }),
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor ?? undefined : undefined),
  });
}

/** Flatten the paginated inbox into a single newest-first list. */
export function useConversationList(enabled: boolean) {
  const query = useConversations(enabled);
  const items = React.useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );
  return { ...query, items };
}

/** Sum of unread messages across loaded conversations (drives the badge). */
export function useUnreadTotal(enabled: boolean): number {
  const { items } = useConversationList(enabled);
  return React.useMemo(
    () => items.reduce((n, c) => n + (c.customerUnread ?? 0), 0),
    [items],
  );
}

// ── Thread ───────────────────────────────────────────────────────────────────

export function useThread(conversationId: string | null) {
  return useInfiniteQuery({
    queryKey: chatKeys.thread(conversationId ?? "none"),
    enabled: Boolean(conversationId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      getConversation(conversationId as string, { cursor: pageParam, limit: THREAD_PAGE }),
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor ?? undefined : undefined),
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useStartConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: startConversation,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function useSendMessage(conversationId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { body: string; productId?: string }) =>
      sendMessage(conversationId as string, input),
    onSuccess: (msg) => {
      if (conversationId) prependMessage(qc, conversationId, msg);
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => markConversationRead(conversationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

/* ----------------------------------------------------------------------------
 * Cache helpers used by both mutations and the socket layer.
 * ------------------------------------------------------------------------- */

type ThreadData = InfiniteData<ConversationThread, string | undefined>;
type InboxData = InfiniteData<ConversationsPage, string | undefined>;

/** Insert a message at the head (newest) of a thread cache, de-duplicated. */
export function prependMessage(
  qc: ReturnType<typeof useQueryClient>,
  conversationId: string,
  message: ChatMessage,
): void {
  qc.setQueryData<ThreadData>(chatKeys.thread(conversationId), (prev) => {
    if (!prev) return prev;
    const first = prev.pages[0];
    if (!first) return prev;
    if (first.messages.some((m) => m.id === message.id)) return prev;
    const pages = prev.pages.slice();
    pages[0] = { ...first, messages: [message, ...first.messages] };
    return { ...prev, pages };
  });
}

/** Stamp readAt on the counterpart's messages in a thread cache. */
export function markThreadRead(
  qc: ReturnType<typeof useQueryClient>,
  conversationId: string,
  readerRole: "customer" | "vendor",
  readAt: string,
): void {
  qc.setQueryData<ThreadData>(chatKeys.thread(conversationId), (prev) => {
    if (!prev) return prev;
    const pages = prev.pages.map((page) => ({
      ...page,
      messages: page.messages.map((m) =>
        m.senderRole !== readerRole && !m.readAt ? { ...m, readAt } : m,
      ),
    }));
    return { ...prev, pages };
  });
}

export type { Conversation, InboxData, ThreadData };
