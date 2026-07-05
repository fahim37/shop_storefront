"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, MessageCircle, X } from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn, isProductPath } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-context";
import { useChatStore } from "@/lib/chat/use-chat-store";
import { useChatSocket } from "@/lib/chat/use-chat-socket";
import { useUnreadTotal } from "@/lib/chat/queries";
import { ConversationList } from "@/components/chat/conversation-list";
import { ChatThread } from "@/components/chat/chat-thread";

/**
 * Global chat dock: a floating launcher + a right-side slide-over that hosts
 * either the inbox list or an active thread. Mounted once in the app providers.
 * Real-time updates flow through useChatSocket. Renders nothing for logged-out
 * visitors (chat requires an account).
 */
export function ChatDock() {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  useChatSocket();

  const open = useChatStore((s) => s.open);
  const view = useChatStore((s) => s.view);
  const setOpen = useChatStore((s) => s.setOpen);
  const openInbox = useChatStore((s) => s.openInbox);
  const back = useChatStore((s) => s.back);
  const close = useChatStore((s) => s.close);

  const unread = useUnreadTotal(isAuthenticated);

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Floating launcher — sits above the mobile bottom nav. */}
      <button
        type="button"
        onClick={openInbox}
        aria-label="Open messages"
        className={cn(
          "fixed bottom-20 right-4 z-40 grid size-14 place-items-center rounded-full bg-primary text-white shadow-[var(--shadow-panel)] transition-transform hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6",
          open && "pointer-events-none opacity-0",
          // Mobile PDP has its own Chat button in the sticky action bar; the
          // floating launcher would crowd it.
          isProductPath(pathname) && "max-md:hidden",
        )}
      >
        <MessageCircle className="size-6" strokeWidth={2.2} />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-red px-1 text-[10px] font-extrabold text-white ring-2 ring-background">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" hideClose className="p-0 sm:max-w-md">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-border bg-navy px-3 py-3 text-white">
              {view === "thread" ? (
                <button type="button" onClick={back} aria-label="Back to inbox" className="rounded-full p-1 hover:bg-white/10">
                  <ArrowLeft className="size-5" />
                </button>
              ) : null}
              <SheetTitle className="flex items-center gap-2 text-base font-extrabold text-white">
                <MessageCircle className="size-5" /> Messages
              </SheetTitle>
              <button type="button" onClick={close} aria-label="Close messages" className="ml-auto rounded-full p-1 hover:bg-white/10">
                <X className="size-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden">
              {view === "thread" ? <ChatThread /> : <ConversationList />}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
