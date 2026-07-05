"use client";

import * as React from "react";
import { ArrowLeft, MessageCircle, X } from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth/auth-context";
import { useChatStore } from "@/lib/chat/use-chat-store";
import { useChatSocket } from "@/lib/chat/use-chat-socket";
import { ConversationList } from "@/components/chat/conversation-list";
import { ChatThread } from "@/components/chat/chat-thread";

/**
 * Global chat surface: a right-side slide-over that hosts either the inbox list
 * or an active thread. Opened from the product "Chat" buttons (via
 * startWithVendor) — there is no persistent floating launcher. From an open
 * thread the header back arrow reveals the full inbox list. Mounted once in the
 * app providers; real-time updates flow through useChatSocket. Renders nothing
 * for logged-out visitors (chat requires an account).
 */
export function ChatDock() {
  const { isAuthenticated } = useAuth();
  useChatSocket();

  const open = useChatStore((s) => s.open);
  const view = useChatStore((s) => s.view);
  const setOpen = useChatStore((s) => s.setOpen);
  const back = useChatStore((s) => s.back);
  const close = useChatStore((s) => s.close);

  if (!isAuthenticated) return null;

  return (
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
  );
}
