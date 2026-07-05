"use client";

import { create } from "zustand";

/* ----------------------------------------------------------------------------
 * Ephemeral chat UI state (per the stack rules: server data → TanStack Query,
 * ephemeral UI → Zustand). Holds the dock open/closed state, which view is
 * showing, the active conversation, and the "start a chat with this vendor"
 * draft fired from a product page.
 * ------------------------------------------------------------------------- */

export interface ChatDraft {
  vendorId: string;
  vendorName?: string | null;
  /** Product the chat was started from — attached to the first message. */
  productId?: string;
  productTitle?: string;
}

interface ChatUiState {
  open: boolean;
  view: "list" | "thread";
  activeConversationId: string | null;
  /** Pending "start with vendor" intent, resolved to a conversation on open. */
  draft: ChatDraft | null;
  /** Product to attach to the next message sent (cleared after send). */
  attachProductId: string | null;
  /** Conversation in which the peer is currently typing (or null). */
  peerTypingConvId: string | null;
  setPeerTyping: (conversationId: string | null) => void;

  /** Open the inbox list. */
  openInbox: () => void;
  /** Open an existing conversation thread. */
  openThread: (id: string) => void;
  /** Start (or resume) a chat with a vendor from a product page. */
  startWithVendor: (draft: ChatDraft) => void;
  /** Called once the draft has been resolved into a real conversation. */
  resolveDraft: (conversationId: string) => void;
  clearAttachment: () => void;
  back: () => void;
  close: () => void;
  setOpen: (open: boolean) => void;
}

export const useChatStore = create<ChatUiState>((set) => ({
  open: false,
  view: "list",
  activeConversationId: null,
  draft: null,
  attachProductId: null,
  peerTypingConvId: null,
  setPeerTyping: (conversationId) => set({ peerTypingConvId: conversationId }),

  openInbox: () => set({ open: true, view: "list", draft: null }),
  openThread: (id) =>
    set({ open: true, view: "thread", activeConversationId: id, draft: null }),
  startWithVendor: (draft) =>
    set({
      open: true,
      view: "thread",
      activeConversationId: null,
      draft,
      attachProductId: draft.productId ?? null,
    }),
  resolveDraft: (conversationId) =>
    set({ activeConversationId: conversationId, draft: null }),
  clearAttachment: () => set({ attachProductId: null }),
  back: () => set({ view: "list", activeConversationId: null, draft: null }),
  close: () => set({ open: false }),
  setOpen: (open) => set({ open }),
}));
