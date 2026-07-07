"use client";

/**
 * Buffered REST calls for the assistant widget — history hydrate + the
 * confirm endpoint for two-phase actions. Rides the shared http client
 * (Bearer + refresh handling); guests additionally pass x-guest-id so the
 * backend can scope their conversations.
 */

import { http } from "@/lib/api/http";
import { getAccessToken } from "@/lib/auth/tokens";
import { getCartSessionToken } from "@/lib/cart/cart-session";

import type { ConfirmResponse, ConversationResponse } from "./types";

/** Guest header for reads — never mints a token (reads shouldn't create identity). */
function guestHeaders(): Record<string, string> {
  if (getAccessToken()) return {};
  const token = getCartSessionToken();
  return token ? { "x-guest-id": token } : {};
}

/** Load a conversation + its recent messages (oldest→newest). */
export function getAssistantConversation(
  conversationId: string,
  limit = 50,
): Promise<ConversationResponse> {
  return http.get<ConversationResponse>(`/chat/conversations/${conversationId}`, {
    params: { limit },
    headers: guestHeaders(),
  });
}

/** Resolve a pending two-phase action (Confirm / decline button press). */
export function confirmAssistantAction(
  conversationId: string,
  confirmId: string,
  decision: "confirm" | "cancel",
): Promise<ConfirmResponse> {
  return http.post<ConfirmResponse>(
    `/chat/conversations/${conversationId}/confirm`,
    { confirmId, decision },
  );
}
