/**
 * Shared types for the AI shopping assistant. Mirrors the backend contract:
 *   - RichContent — renderable attachments collected server-side from tool
 *     results (store_backend/src/modules/chatbot/chatbot.rich.ts)
 *   - SSE events emitted by POST /chat/turn/stream
 *   - REST payloads for history + confirm
 * Plain module (no "use client") so both the store and components share it.
 */

export interface RichProductCard {
  productId: string;
  slug: string;
  title: string;
  pricePaisa: string;
  comparePaisa?: string | null;
  thumbnailMediaId: string | null;
  ratingAverage?: number | string | null;
}

export interface RichOrderSummary {
  orderId: string;
  orderNumber: string;
  status: string;
  subOrderStatuses?: string[];
  totalPaisa: string;
  placedAt: string;
  itemCount?: number;
}

export type RichAction =
  | { type: "link"; label: string; href: string }
  | { type: "signin"; label: string }
  | {
      type: "confirm";
      label: string;
      confirmId: string;
      action: "cancel_order" | "initiate_return";
      summary: string;
      expiresAt: string;
    };

export interface RichContent {
  products?: RichProductCard[];
  orders?: RichOrderSummary[];
  actions?: RichAction[];
}

/** One bubble in the assistant thread (client-side shape). */
export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  richContent?: RichContent | null;
  createdAt: string;
}

/* --- SSE events (POST /chat/turn/stream) --- */

export interface TurnDoneEvent {
  conversationId: string;
  assistantMessage: string;
  richContent: RichContent | null;
  toolCallCount: number;
  escalated: boolean;
  escalatedToTicketId?: string;
}

export interface StreamHandlers {
  onMeta?: (meta: { conversationId: string }) => void;
  onStatus?: (status: { tool: string; label: string }) => void;
  onToken?: (delta: string) => void;
  onRich?: (rich: RichContent) => void;
  onDone?: (done: TurnDoneEvent) => void;
}

/* --- REST payloads --- */

/** Row shape from GET /chat/conversations/:id (subset the widget needs). */
export interface ChatHistoryRow {
  id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string | null;
  richContent?: RichContent | null;
  createdAt: string;
}

export interface ConversationResponse {
  conversation: { id: string; status: "active" | "escalated" | "closed" };
  items: ChatHistoryRow[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ConfirmResponse {
  conversationId: string;
  decision: "confirm" | "cancel";
  assistantMessage: string;
  richContent: RichContent | null;
}
