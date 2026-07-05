"use client";

import * as React from "react";
import { MessagesSquare } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { formatRelative, initials } from "@/lib/format";
import { useConversationList } from "@/lib/chat/queries";
import { useChatStore } from "@/lib/chat/use-chat-store";
import type { Conversation } from "@/lib/api/messaging";

function Row({ c, onOpen }: { c: Conversation; onOpen: (id: string) => void }) {
  const unread = c.customerUnread > 0;
  const preview =
    (c.lastMessageSenderRole === "customer" ? "You: " : "") +
    (c.lastMessagePreview ?? "No messages yet");
  return (
    <button
      type="button"
      onClick={() => onOpen(c.id)}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
    >
      <Avatar className="size-11">
        {c.vendor.storeLogoUrl ? (
          <AvatarImage src={c.vendor.storeLogoUrl} alt={c.vendor.storeName} />
        ) : null}
        <AvatarFallback>{initials(c.vendor.storeName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cn("truncate text-sm", unread ? "font-extrabold text-ink" : "font-bold text-ink")}>
            {c.vendor.storeName}
          </p>
          <span className="ml-auto shrink-0 text-[10.5px] font-semibold text-faint">
            {formatRelative(c.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "truncate text-xs",
              unread ? "font-bold text-ink" : "font-medium text-sub",
            )}
          >
            {preview}
          </p>
          {unread ? (
            <span className="ml-auto grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-extrabold text-white">
              {c.customerUnread > 9 ? "9+" : c.customerUnread}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function ConversationList() {
  const openThread = useChatStore((s) => s.openThread);
  const { items, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useConversationList(true);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sub">
        <MessagesSquare className="size-10 text-faint" />
        <p className="text-sm font-bold text-ink">No messages yet</p>
        <p className="max-w-60 text-xs">
          Start a conversation with a seller from any product page to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 divide-y divide-border overflow-y-auto">
      {items.map((c) => (
        <Row key={c.id} c={c} onOpen={openThread} />
      ))}
      {hasNextPage ? (
        <div className="p-3">
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-full rounded-lg border border-border py-2 text-xs font-bold text-sub hover:border-primary disabled:opacity-60"
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
