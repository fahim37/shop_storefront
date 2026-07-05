import { http } from "@/lib/api/http";

/* ----------------------------------------------------------------------------
 * Customer ↔ vendor direct messaging API.
 *
 * Writes go over REST; live delivery (new messages, read receipts, typing)
 * arrives over Socket.io — see lib/realtime/socket.ts. The backend keeps the
 * denormalized unread counters + last-message preview on the conversation row
 * so the inbox renders without an N+1 over messages.
 * ------------------------------------------------------------------------- */

export type ChatRole = "customer" | "vendor";

export interface ChatVendorInfo {
  storeName: string;
  storeSlug: string;
  storeLogoUrl: string | null;
}

/** A row in the customer inbox list. */
export interface Conversation {
  id: string;
  customerId: string;
  vendorId: string;
  lastProductId: string | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  lastMessageSenderRole: ChatRole | null;
  customerUnread: number;
  vendorUnread: number;
  createdAt: string;
  updatedAt: string;
  vendor: ChatVendorInfo;
}

export interface ChatProductCard {
  id: string;
  title: string;
  slug: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderRole: ChatRole;
  senderUserId: string | null;
  body: string;
  productId: string | null;
  readAt: string | null;
  createdAt: string;
  product?: ChatProductCard | null;
}

export interface ConversationThread {
  conversation: Conversation;
  vendor: { id: string; storeName: string; storeSlug: string; storeLogoUrl: string | null } | null;
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface StartConversationResult {
  conversation: Conversation;
  message: ChatMessage | null;
}

export interface CursorMeta {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface ConversationsPage {
  items: Conversation[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Open (or reopen) a thread with a vendor, optionally sending a first line. */
export function startConversation(input: {
  vendorId: string;
  productId?: string;
  body?: string;
}): Promise<StartConversationResult> {
  return http.post<StartConversationResult>("/conversations", input);
}

export async function listConversations(params: {
  cursor?: string;
  limit?: number;
}): Promise<ConversationsPage> {
  const res = await http.getList<Conversation>("/conversations", {
    params: { cursor: params.cursor, limit: params.limit ?? 20 },
  });
  return {
    items: res.data,
    nextCursor: res.meta?.nextCursor ?? null,
    hasMore: res.meta?.hasMore ?? false,
  };
}

export function getConversation(
  id: string,
  params: { cursor?: string; limit?: number } = {},
): Promise<ConversationThread> {
  return http.get<ConversationThread>(`/conversations/${id}`, {
    params: { cursor: params.cursor, limit: params.limit ?? 30 },
  });
}

export function sendMessage(
  id: string,
  input: { body: string; productId?: string },
): Promise<ChatMessage> {
  return http.post<ChatMessage>(`/conversations/${id}/messages`, input);
}

export function markConversationRead(
  id: string,
): Promise<{ conversationId: string; readAt: string }> {
  return http.post<{ conversationId: string; readAt: string }>(
    `/conversations/${id}/read`,
  );
}
