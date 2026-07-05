import { io, type Socket } from "socket.io-client";

import { API_BASE_URL } from "@/lib/config";
import { getAccessToken } from "@/lib/auth/tokens";
import type { ChatMessage, ChatRole, Conversation } from "@/lib/api/messaging";

/* ----------------------------------------------------------------------------
 * Socket.io client — the live channel for chat (new messages, read receipts,
 * typing). One shared connection per tab.
 *
 * The backend mounts Socket.io at `/realtime` on the API origin (NOT the BFF
 * proxy) and only accepts the `websocket` transport. Auth is the in-memory
 * access token, re-read on every (re)connect via the `auth` callback so a
 * token rotation after a silent refresh doesn't drop the socket.
 * ------------------------------------------------------------------------- */

/** API origin without the trailing `/v1` (the socket lives at the root). */
const SOCKET_ORIGIN = API_BASE_URL.replace(/\/v1\/?$/, "");

/** Server → client event payloads. */
export interface ChatMessageEvent {
  conversationId: string;
  message: ChatMessage;
  conversation: Pick<
    Conversation,
    | "id"
    | "customerId"
    | "vendorId"
    | "lastMessageAt"
    | "lastMessagePreview"
    | "lastMessageSenderRole"
    | "customerUnread"
    | "vendorUnread"
  >;
}
export interface ChatReadEvent {
  conversationId: string;
  readerRole: ChatRole;
  readAt: string;
}
export interface ChatTypingEvent {
  conversationId: string;
  role: ChatRole;
  typing: boolean;
}

let socket: Socket | null = null;

/** Get (lazily creating) the shared socket. Does not auto-connect. */
export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(SOCKET_ORIGIN, {
    path: "/realtime",
    transports: ["websocket"],
    autoConnect: false,
    auth: (cb: (data: Record<string, unknown>) => void) =>
      cb({ token: getAccessToken() ?? "" }),
  });
  return socket;
}

/** Connect if a token is present and we're not already connected. */
export function connectSocket(): Socket | null {
  if (!getAccessToken()) return null;
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

/** Drop the connection (e.g. on logout). */
export function disconnectSocket(): void {
  socket?.disconnect();
}

/** Emit a throttled typing signal for a conversation (best-effort). */
export function emitTyping(conversationId: string, typing: boolean): void {
  const s = socket;
  if (s?.connected) s.emit("chat:typing", { conversationId, typing });
}
