"use client";

import { create } from "zustand";

import { ApiError } from "@/lib/api/http";
import { uuid } from "@/lib/cart/cart-session";

import { confirmAssistantAction, getAssistantConversation } from "./api";
import { streamAssistantTurn, warmAssistantAuth } from "./stream";
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

// Legacy persistence keys preserve shoppers' conversation history on rebrand.
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

/**
 * Local transcript snapshot so reopening the dock paints instantly instead of
 * hiding history behind a spinner while GET /chat/conversations/:id resolves.
 * Server truth still replaces it in the background. Bounded, keyed to the
 * conversation id, and dropped whenever the stored conversation is dropped.
 */
const SNAPSHOT_KEY = "gcl.assistant.snapshot";
const SNAPSHOT_LIMIT = 30;

function readSnapshot(conversationId: string): AssistantMessage[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      conversationId?: string;
      messages?: AssistantMessage[];
    };
    if (parsed.conversationId !== conversationId || !Array.isArray(parsed.messages)) {
      return null;
    }
    return parsed.messages;
  } catch {
    return null;
  }
}

function writeSnapshot(
  conversationId: string | null,
  messages: AssistantMessage[],
): void {
  if (typeof window === "undefined") return;
  try {
    if (!conversationId) {
      window.localStorage.removeItem(SNAPSHOT_KEY);
      return;
    }
    window.localStorage.setItem(
      SNAPSHOT_KEY,
      JSON.stringify({ conversationId, messages: messages.slice(-SNAPSHOT_LIMIT) }),
    );
  } catch {
    /* storage unavailable/full — reopening just pays the fetch again */
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
  /**
   * True while streamText is pre-tool prose kept on screen during a tool run
   * (rendered dimmed). The next round's first token replaces it — clearing it
   * outright made already-read text vanish into a spinner, which read as a
   * stall.
   */
  streamStale: boolean;
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
    // A fresh round's tokens REPLACE stale pre-tool prose (kept visible while
    // the tool ran), preserving the contract that the accumulated stream
    // equals the final `done` text.
    set((s) => ({
      streamText: s.streamStale ? chunk : s.streamText + chunk,
      streamStale: false,
      statusLabel: null,
    }));
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
      streamStale: false,
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
          // The model went to work — keep any pre-tool prose on screen
          // (dimmed) instead of blanking it into a spinner; the next round's
          // tokens replace it (see flushTokens).
          onStatus: ({ label }) => {
            pendingTokens = [];
            set((s) => ({
              statusLabel: label,
              streamStale: s.streamText.length > 0,
            }));
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
        streamStale: false,
        streamRich: null,
        statusLabel: null,
        isStreaming: false,
      }));
      writeSnapshot(get().conversationId, get().messages);
    } catch (err) {
      flushTokens();
      if (err instanceof DOMException && err.name === "AbortError") {
        // Stop button: keep whatever streamed as a truncated bubble (stale
        // pre-tool prose is discarded — it was never going to be the answer).
        set((s) => ({
          isStreaming: false,
          statusLabel: null,
          streamText: "",
          streamStale: false,
          streamRich: null,
          messages:
            s.streamText && !s.streamStale
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
        streamStale: false,
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
    streamStale: false,
    streamRich: null,
    statusLabel: null,
    isStreaming: false,
    hydrated: false,
    isHydrating: false,
    error: null,
    consumedConfirmIds: [],

    setOpen: (open) => {
      set({ open });
      if (!open) return;
      // Refresh a nearly-expired token while the user is still typing, so the
      // first message doesn't pay a 401 → refresh → re-POST round trip.
      warmAssistantAuth();
      if (!get().hydrated && !get().isHydrating) void get().hydrate();
    },

    hydrate: async () => {
      const stored = readStoredConversationId();
      if (!stored) {
        set({ hydrated: true });
        return;
      }
      // Paint instantly from the local snapshot when one exists; the server
      // fetch below replaces it in the background. The full-screen spinner
      // only shows on a genuinely cold open (stored id, no snapshot).
      const snapshot = readSnapshot(stored);
      if (snapshot && snapshot.length > 0) {
        set({ conversationId: stored, messages: snapshot, hydrated: true });
      } else {
        set({ isHydrating: true });
      }
      const seededCount = get().messages.length;
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
        // Don't clobber a turn the user started while we were fetching.
        if (get().isStreaming || get().messages.length !== seededCount) {
          writeSnapshot(stored, messages);
          set({ hydrated: true, isHydrating: false });
          return;
        }
        set({
          conversationId: stored,
          messages,
          hydrated: true,
          isHydrating: false,
        });
        writeSnapshot(stored, messages);
      } catch {
        // Gone (guest token rotated, deleted, cross-identity) — start fresh.
        storeConversationId(null);
        writeSnapshot(null, []);
        if (get().isStreaming || get().messages.length !== seededCount) {
          // A turn is already running on a fresh thread — leave its bubbles.
          set({ hydrated: true, isHydrating: false });
          return;
        }
        set({
          conversationId: null,
          messages: [],
          hydrated: true,
          isHydrating: false,
        });
      }
    },

    send: async (text) => {
      const trimmed = text.trim();
      if (!trimmed || get().isStreaming) return;
      set((s) => ({ messages: [...s.messages, makeMessage("user", trimmed)] }));
      writeSnapshot(get().conversationId, get().messages);
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
      writeSnapshot(get().conversationId, get().messages);
    },

    reset: () => {
      abortController?.abort();
      storeConversationId(null);
      writeSnapshot(null, []);
      pendingTokens = [];
      set({
        conversationId: null,
        messages: [],
        streamText: "",
        streamStale: false,
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
      writeSnapshot(null, []);
      if (isAuthenticated) {
        set({ conversationId: null });
      } else {
        get().reset();
      }
    },
  };
});
