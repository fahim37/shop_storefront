"use client";

/**
 * Fetch-based SSE client for POST /chat/turn/stream. EventSource can't POST
 * or set Authorization, so we read `response.body` ourselves and parse the
 * event-stream frames (`event: <name>\ndata: <json>\n\n`, `:` = heartbeat).
 *
 * Auth mirrors lib/api/http.ts: Bearer from the in-memory token when signed
 * in, else the guest id header (the SAME token the cart uses for
 * X-Cart-Session, so assistant cart writes land in the visible cart). A 401
 * with a token goes through the shared single-flight refresh + one retry.
 */

import { API_BASE_URL } from "@/lib/config";
import { ApiError, runSingleFlightRefresh } from "@/lib/api/http";
import { getAccessToken } from "@/lib/auth/tokens";
import { ensureCartSessionToken } from "@/lib/cart/cart-session";

import type { RichContent, StreamHandlers, TurnDoneEvent } from "./types";

export interface StreamTurnOptions {
  message: string;
  conversationId?: string | null;
  signal: AbortSignal;
  on: StreamHandlers;
}

/** Header bag for assistant calls — Bearer when signed in, else guest id. */
export function assistantAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  if (token) return { Authorization: `Bearer ${token}` };
  return { "x-guest-id": ensureCartSessionToken() };
}

/**
 * Run one streamed turn. Resolves with the `done` payload after the stream
 * ends, or throws ApiError (HTTP error before the stream) / DOMException
 * ("AbortError") when the caller aborts / Error for a mid-stream `error`
 * event or a stream that ends without `done`.
 */
export async function streamAssistantTurn(
  opts: StreamTurnOptions,
): Promise<TurnDoneEvent> {
  const response = await startRequest(opts, false);
  return consumeStream(response, opts);
}

async function startRequest(
  opts: StreamTurnOptions,
  isRetry: boolean,
): Promise<Response> {
  const hadToken = Boolean(getAccessToken());
  const response = await fetch(`${API_BASE_URL}/chat/turn/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...assistantAuthHeaders(),
    },
    body: JSON.stringify({
      message: opts.message,
      ...(opts.conversationId ? { conversationId: opts.conversationId } : {}),
    }),
    credentials: "include",
    signal: opts.signal,
  });

  if (response.ok) return response;

  // Expired access token: refresh once, then retry with the new one.
  if (response.status === 401 && hadToken && !isRetry) {
    const refreshed = await runSingleFlightRefresh();
    if (refreshed) return startRequest(opts, true);
  }

  // Pre-stream failures use the normal JSON error envelope.
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  const err =
    typeof body === "object" && body !== null && "error" in body
      ? (body as { error: { code?: string; message?: string } }).error
      : undefined;
  throw new ApiError({
    code: err?.code ?? "UNKNOWN",
    message:
      response.status === 429
        ? "You're sending messages too quickly — give it a minute."
        : (err?.message ?? `Request failed with status ${response.status}`),
    status: response.status,
  });
}

async function consumeStream(
  response: Response,
  opts: StreamTurnOptions,
): Promise<TurnDoneEvent> {
  if (!response.body) throw new Error("Streaming not supported by this browser");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done: TurnDoneEvent | null = null;
  let streamError: { code: string; message: string } | null = null;

  const handleFrame = (frame: string): void => {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of frame.split("\n")) {
      if (line.startsWith(":")) continue; // heartbeat/comment
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) return;
    let data: unknown;
    try {
      data = JSON.parse(dataLines.join("\n"));
    } catch {
      return;
    }
    switch (event) {
      case "meta":
        opts.on.onMeta?.(data as { conversationId: string });
        break;
      case "status":
        opts.on.onStatus?.(data as { tool: string; label: string });
        break;
      case "token":
        opts.on.onToken?.((data as { delta: string }).delta);
        break;
      case "rich":
        opts.on.onRich?.(data as RichContent);
        break;
      case "done":
        done = data as TurnDoneEvent;
        break;
      case "error":
        streamError = data as { code: string; message: string };
        break;
    }
  };

  try {
    for (;;) {
      const { value, done: readerDone } = await reader.read();
      if (readerDone) break;
      buffer += decoder.decode(value, { stream: true });
      // Frames are separated by a blank line.
      for (;;) {
        const idx = buffer.indexOf("\n\n");
        if (idx === -1) break;
        const frame = buffer.slice(0, idx).replace(/\r/g, "");
        buffer = buffer.slice(idx + 2);
        if (frame.trim()) handleFrame(frame);
      }
      if (streamError || done) break;
    }
  } finally {
    reader.cancel().catch(() => undefined);
  }

  if (streamError) {
    const e = streamError as { code: string; message: string };
    throw new ApiError({ code: e.code, message: e.message, status: 200 });
  }
  if (!done) throw new Error("The assistant stream ended unexpectedly");
  opts.on.onDone?.(done);
  return done;
}
