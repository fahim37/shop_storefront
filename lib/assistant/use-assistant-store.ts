"use client";

import { create } from "zustand";

import { ApiError } from "@/lib/api/http";
import { uuid } from "@/lib/cart/cart-session";

import { confirmAssistantAction, getAssistantConversation } from "./api";
import { streamAssistantTurn } from "./stream";
import type { AssistantMessage, RichContent } from "./types";

/* ----------------------------------------------------------------------------
 * AI shopping assistant state (ephemeral UI → Zustand, per the stack rules;
 * the transcript is server-owned, this mirrors just enough to render).
 *
 * Streaming protocol (matches the backend TurnEmitter contract):
 *   - `token` deltas accumulate into streamText (rAF-batched so a fast
 *     stream doesn't re-render per word)
 *   - `status` means the model went off to run a tool — the accumulated
 *     pre-tool prose was transient thinking, so streamText resets
 *   - `done` carries the authoritative final text + richContent
 *
 * The conversation id is persisted in localStorage so a reload resumes the
 * thread (guests included — their id rides the x-guest-id header). On a
 * guest→signed-in flip the stored id is dropped (the server never adopts
 * guest conversations) but the transcript stays visible until reload.
 * ------------------------------------------------------------------------- */

const STORAGE_KEY = "gcl.assistant.conv";

function readStoredConversationId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeConversationId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — resume just won't work */
  }
}

/** Abort handle + rAF token batch live outside React state. */
let abortController: AbortController | null = null;
let pendingTokens: string[] = [];
let rafId: number | null = null;

interface AssistantState {
  open: boolean;
  conversationId: string | null;
  /** Completed bubbles, oldest→newest. */
  messages: AssistantMessage[];
  /** In-progress assistant bubble (token deltas). */
  streamText: string;
  /** Rich attachments received mid-stream (rendered under the live bubble). */
  streamRich: RichContent | null;
  /** "Searching products…" style progress line, when a tool is running. */
  statusLabel: string | null;
  isStreaming: boolean;
  /** History hydration for the stored conversation id. */
  hydrated: boolean;
  isHydrating: boolean;
  error: string | null;
  /** Confirm buttons already pressed (disables them across re-renders). */
  consumedConfirmIds: string[];

  setOpen: (open: boolean) => void;
  hydrate: () => Promise<void>;
  send: (text: string) => Promise<void>;
  stop: () => void;
  confirmAction: (
    confirmId: string,
    decision: "confirm" | "cancel",
    reasonCode?: string,
  ) => Promise<void>;
  /** Start a brand-new conversation (new-chat button). */
  reset: () => void;
  /** Auth flips: drop the stored conversation (it belongs to the other identity). */
  onAuthChange: (isAuthenticated: boolean) => void;
}

function makeMessage(
  role: AssistantMessage["role"],
  text: string,
  richContent?: RichContent | null,
): AssistantMessage {
  return { id: uuid(), role, text, richContent: richContent ?? null, createdAt: new Date().toISOString() };
}

export const useAssistantStore = create<AssistantState>((set, get) => {
  const flushTokens = (): void => {
    if (rafId !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (pendingTokens.length === 0) return;
    const chunk = pendingTokens.join("");
    pendingTokens = [];
    set((s) => ({ streamText: s.streamText + chunk, statusLabel: null }));
  };

  const queueToken = (delta: string): void => {
    pendingTokens.push(delta);
    if (rafId !== null || typeof window === "undefined") return;
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      flushTokens();
    });
  };

  const runTurn = async (text: string, isRetry: boolean): Promise<void> => {
    const controller = new AbortController();
    abortController = controller;
    set({
      isStreaming: true,
      streamText: "",
      streamRich: null,
      statusLabel: null,
      error: null,
    });

    try {
      const done = await streamAssistantTurn({
        message: text,
        conversationId: get().conversationId,
        signal: controller.signal,
        on: {
          onMeta: ({ conversationId }) => {
            storeConversationId(conversationId);
            set({ conversationId });
          },
          // The model went to work — pre-tool prose was transient thinking.
          onStatus: ({ label }) => {
            pendingTokens = [];
            set({ statusLabel: label, streamText: "" });
          },
          onToken: queueToken,
          onRich: (rich) => set({ streamRich: rich }),
        },
      });
      flushTokens();
      set((s) => ({
        messages: [
          ...s.messages,
          makeMessage("assistant", done.assistantMessage, done.richContent),
        ],
        streamText: "",
        streamRich: null,
        statusLabel: null,
        isStreaming: false,
      }));
    } catch (err) {
      flushTokens();
      if (err instanceof DOMException && err.name === "AbortError") {
        // Stop button: keep whatever streamed as a truncated bubble.
        set((s) => ({
          isStreaming: false,
          statusLabel: null,
          streamText: "",
          streamRich: null,
          messages: s.streamText
            ? [...s.messages, makeMessage("assistant", `${s.streamText} …`)]
            : s.messages,
        }));
        return;
      }
      // Stale conversation (escalated/closed, or a guest id that no longer
      // matches): drop it and retry ONCE on a fresh thread.
      const stale =
        err instanceof ApiError &&
        (err.code === "RESOURCE_STATE_RACE" || err.status === 404);
      if (stale && !isRetry) {
        storeConversationId(null);
        set({ conversationId: null });
        await runTurn(text, true);
        return;
      }
      set({
        isStreaming: false,
        statusLabel: null,
        streamText: "",
        streamRich: null,
        error:
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      if (abortController === controller) abortController = null;
    }
  };

  return {
    open: false,
    conversationId: null,
    messages: [],
    streamText: "",
    streamRich: null,
    statusLabel: null,
    isStreaming: false,
    hydrated: false,
    isHydrating: false,
    error: null,
    consumedConfirmIds: [],

    setOpen: (open) => {
      set({ open });
      if (open && !get().hydrated && !get().isHydrating) void get().hydrate();
    },

    hydrate: async () => {
      const stored = readStoredConversationId();
      if (!stored) {
        set({ hydrated: true });
        return;
      }
      set({ isHydrating: true });
      try {
        const res = await getAssistantConversation(stored);
        const messages: AssistantMessage[] = res.items
          .filter(
            (row) =>
              (row.role === "user" || row.role === "assistant") &&
              Boolean(row.content),
          )
          .map((row) => ({
            id: row.id,
            role: row.role as "user" | "assistant",
            text: row.content ?? "",
            richContent: row.richContent ?? null,
            createdAt: row.createdAt,
          }));
        set({
          conversationId: stored,
          messages,
          hydrated: true,
          isHydrating: false,
        });
      } catch {
        // Gone (guest token rotated, deleted, cross-identity) — start fresh.
        storeConversationId(null);
        set({ conversationId: null, hydrated: true, isHydrating: false });
      }
    },

    send: async (text) => {
      const trimmed = text.trim();
      if (!trimmed || get().isStreaming) return;
      set((s) => ({ messages: [...s.messages, makeMessage("user", trimmed)] }));
      await runTurn(trimmed, false);
    },

    stop: () => {
      abortController?.abort();
    },

    confirmAction: async (confirmId, decision, reasonCode) => {
      const { conversationId, consumedConfirmIds } = get();
      if (!conversationId || consumedConfirmIds.includes(confirmId)) return;
      // Disable the buttons immediately — the token is single-use server-side.
      set({ consumedConfirmIds: [...consumedConfirmIds, confirmId] });
      try {
        const res = await confirmAssistantAction(
          conversationId,
          confirmId,
          decision,
          reasonCode,
        );
        set((s) => ({
          messages: [
            ...s.messages,
            makeMessage("assistant", res.assistantMessage, res.richContent),
          ],
        }));
      } catch (err) {
        const expired = err instanceof ApiError && err.status === 404;
        set((s) => ({
          messages: [
            ...s.messages,
            makeMessage(
              "assistant",
              expired
                ? "That confirmation has expired — ask me again and I'll set it up fresh."
                : "I couldn't complete that action. Please try again.",
            ),
          ],
        }));
      }
    },

    reset: () => {
      abortController?.abort();
      storeConversationId(null);
      pendingTokens = [];
      set({
        conversationId: null,
        messages: [],
        streamText: "",
        streamRich: null,
        statusLabel: null,
        isStreaming: false,
        hydrated: true,
        error: null,
        consumedConfirmIds: [],
      });
    },

    onAuthChange: (isAuthenticated) => {
      // Guest → signed in: keep the visible transcript, but the next turn
      // must start a fresh user-owned conversation. Signed in → out: the
      // thread belongs to the account — clear it entirely.
      abortController?.abort();
      storeConversationId(null);
      if (isAuthenticated) {
        set({ conversationId: null });
      } else {
        get().reset();
      }
    },
  };
});
