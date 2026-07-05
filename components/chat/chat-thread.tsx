"use client";

import * as React from "react";
import Link from "next/link";
import { Package, SendHorizontal, Store, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelative, initials } from "@/lib/format";
import { emitTyping } from "@/lib/realtime/socket";
import {
  useMarkRead,
  useSendMessage,
  useStartConversation,
  useThread,
} from "@/lib/chat/queries";
import { useChatStore } from "@/lib/chat/use-chat-store";
import type { ChatMessage } from "@/lib/api/messaging";

/** Sticky store header for the active thread. */
function ThreadHeader({
  name,
  logoUrl,
  slug,
}: {
  name: string | null;
  logoUrl: string | null;
  slug: string | null;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border bg-card/95 px-3 py-2.5 backdrop-blur">
      <Avatar className="size-9">
        {logoUrl ? <AvatarImage src={logoUrl} alt={name ?? "Store"} /> : null}
        <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-ink">{name ?? "Store"}</p>
        {slug ? (
          <Link
            href={`/search?q=${encodeURIComponent(name ?? slug)}`}
            className="flex items-center gap-1 text-[11px] font-semibold text-sub hover:text-primary"
          >
            <Store className="size-3" /> Visit store
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function ProductChip({ product }: { product: ChatMessage["product"] }) {
  if (!product) return null;
  return (
    <Link
      href={`/product/${product.slug}`}
      className="mb-1 flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-2 py-1 text-[11px] font-semibold text-sub hover:border-primary"
    >
      <Package className="size-3 shrink-0" />
      <span className="line-clamp-1">{product.title}</span>
    </Link>
  );
}

function MessageBubble({ message, isMine }: { message: ChatMessage; isMine: boolean }) {
  return (
    <div className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
      <div className={cn("max-w-[82%]", isMine ? "items-end" : "items-start")}>
        {message.product ? <ProductChip product={message.product} /> : null}
        <div
          className={cn(
            "whitespace-pre-wrap wrap-break-word rounded-2xl px-3 py-2 text-[13px] font-medium leading-relaxed",
            isMine
              ? "rounded-br-md bg-primary text-white"
              : "rounded-bl-md bg-muted text-ink",
          )}
        >
          {message.body}
        </div>
      </div>
      <span className="mt-0.5 px-1 text-[10px] font-semibold text-faint">
        {formatRelative(message.createdAt)}
        {isMine && message.readAt ? " · Seen" : ""}
      </span>
    </div>
  );
}

export function ChatThread() {
  const activeId = useChatStore((s) => s.activeConversationId);
  const draft = useChatStore((s) => s.draft);
  const attachProductId = useChatStore((s) => s.attachProductId);
  const clearAttachment = useChatStore((s) => s.clearAttachment);
  const resolveDraft = useChatStore((s) => s.resolveDraft);
  const peerTypingConvId = useChatStore((s) => s.peerTypingConvId);

  const start = useStartConversation();
  const startedRef = React.useRef(false);

  // Resolve a "chat with vendor" draft into a real conversation once.
  React.useEffect(() => {
    if (activeId || !draft || startedRef.current) return;
    startedRef.current = true;
    start.mutate(
      { vendorId: draft.vendorId, productId: draft.productId },
      { onSuccess: (res) => resolveDraft(res.conversation.id) },
    );
  }, [activeId, draft, start, resolveDraft]);

  React.useEffect(() => {
    startedRef.current = false;
  }, [draft?.vendorId]);

  const thread = useThread(activeId);
  const send = useSendMessage(activeId);
  const markRead = useMarkRead();

  const meta = thread.data?.pages[0];
  // Messages arrive newest-first across pages → flatten then reverse to chrono.
  const messages = React.useMemo(
    () => (thread.data?.pages ?? []).flatMap((p) => p.messages).slice().reverse(),
    [thread.data?.pages],
  );

  const [text, setText] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const lastMarkedRef = React.useRef<string | null>(null);

  // Auto-scroll to newest on message change.
  const newest = messages[messages.length - 1];
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [newest?.id, activeId]);

  // Mark read when an incoming (vendor) message is the newest & unread.
  React.useEffect(() => {
    if (!activeId || !newest) return;
    if (newest.senderRole === "vendor" && lastMarkedRef.current !== newest.id) {
      lastMarkedRef.current = newest.id;
      markRead.mutate(activeId);
    }
  }, [activeId, newest, markRead]);

  // Typing signal (throttled to ~1/2s).
  const lastTypingRef = React.useRef(0);
  const onChange = (v: string) => {
    setText(v);
    if (!activeId) return;
    const now = Date.now();
    if (now - lastTypingRef.current > 2000) {
      lastTypingRef.current = now;
      emitTyping(activeId, true);
    }
  };

  const submit = () => {
    const body = text.trim();
    if (!body || !activeId || send.isPending) return;
    send.mutate(
      { body, productId: attachProductId ?? undefined },
      {
        onSuccess: () => {
          clearAttachment();
          if (activeId) emitTyping(activeId, false);
        },
      },
    );
    setText("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const attachedTitle = attachProductId ? draft?.productTitle : null;
  const resolving = !activeId && (start.isPending || Boolean(draft));
  const isTyping = Boolean(activeId) && peerTypingConvId === activeId;

  return (
    <div className="flex h-full flex-col">
      <ThreadHeader
        name={meta?.vendor?.storeName ?? draft?.vendorName ?? null}
        logoUrl={meta?.vendor?.storeLogoUrl ?? null}
        slug={meta?.vendor?.storeSlug ?? null}
      />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
        {resolving || (thread.isLoading && messages.length === 0) ? (
          <div className="flex h-full items-center justify-center">
            <Spinner className="size-6 text-primary" />
          </div>
        ) : (
          <>
            {thread.hasNextPage ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => void thread.fetchNextPage()}
                  disabled={thread.isFetchingNextPage}
                  className="rounded-full border border-border px-3 py-1 text-[11px] font-bold text-sub hover:border-primary disabled:opacity-60"
                >
                  {thread.isFetchingNextPage ? "Loading…" : "Load earlier messages"}
                </button>
              </div>
            ) : null}

            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sub">
                <Store className="size-9 text-faint" />
                <p className="text-sm font-bold text-ink">Say hello 👋</p>
                <p className="max-w-60 text-xs">
                  Ask about pricing, delivery, sizes, or anything about the product.
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <MessageBubble key={m.id} message={m} isMine={m.senderRole === "customer"} />
              ))
            )}
            {isTyping ? (
              <div className="flex items-center gap-1 px-1 text-[11px] font-semibold text-faint">
                <span className="inline-flex gap-0.5">
                  <span className="size-1.5 animate-bounce rounded-full bg-faint [animation-delay:-0.2s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-faint [animation-delay:-0.1s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-faint" />
                </span>
                typing…
              </div>
            ) : null}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-card px-2.5 py-2">
        {attachedTitle ? (
          <div className="mb-1.5 flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-2 py-1 text-[11px] font-semibold text-sub">
            <Package className="size-3 shrink-0" />
            <span className="line-clamp-1 flex-1">About: {attachedTitle}</span>
            <button type="button" onClick={clearAttachment} aria-label="Remove product">
              <X className="size-3.5 hover:text-red" />
            </button>
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Write a message…"
            className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-[13px] font-medium outline-none focus:border-primary"
          />
          <Button
            type="button"
            size="icon"
            onClick={submit}
            disabled={!text.trim() || !activeId || send.isPending}
            aria-label="Send message"
            className="size-10 shrink-0 rounded-xl"
          >
            {send.isPending ? (
              <Spinner className="size-4" />
            ) : (
              <SendHorizontal className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
