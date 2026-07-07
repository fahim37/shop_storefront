"use client";

import * as React from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { CloseButton } from "@/components/ui/close-button";
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
          {/* Header — brand blue, matches the assistant dock */}
          <div className="flex items-center gap-2 bg-linear-to-r from-blue-strong via-blue to-[oklch(0.58_0.19_255)] px-3.5 py-3 text-white">
            {view === "thread" ? (
              <button
                type="button"
                onClick={back}
                aria-label="Back to inbox"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-[transform,background-color,border-color] duration-200 ease-out hover:border-white/30 hover:bg-white/20 active:scale-[0.85] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <ArrowLeft className="size-4.5" />
              </button>
            ) : null}
            <SheetTitle className="flex items-center gap-2 text-base font-extrabold text-white">
              <MessageCircle className="size-5" /> Messages
            </SheetTitle>
            <CloseButton
              tone="overlay"
              onClick={close}
              aria-label="Close messages"
              className="ml-auto"
            />
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
