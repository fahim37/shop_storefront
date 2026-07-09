/**
 * Why-are-you-cancelling questionnaire, shared by every cancel surface
 * (account order page dialog + the AI assistant's confirm card). Mirrors
 * CANCEL_REASONS in store_backend/src/modules/chatbot/tools.ts — keep the
 * two lists in sync. The chosen label is stored on orders.cancelled_reason
 * (varchar(100)) and shows in the admin order detail sheet.
 */
export const CANCEL_REASONS = [
  { code: "already_bought", label: "Already bought it elsewhere" },
  { code: "ordered_by_mistake", label: "Ordered by mistake" },
  { code: "delivery_too_slow", label: "Delivery is taking too long" },
  { code: "found_better_price", label: "Found a better price" },
  { code: "changed_mind", label: "Changed my mind" },
  { code: "other", label: "Other reason" },
] as const;

export type CancelReasonCode = (typeof CANCEL_REASONS)[number]["code"];

/** Final reason string for the cancel API (≤100 chars, backend-validated). */
export function cancelReasonText(
  code: CancelReasonCode,
  otherText: string,
): string {
  if (code === "other" && otherText.trim()) {
    return otherText.trim().slice(0, 100);
  }
  return CANCEL_REASONS.find((r) => r.code === code)?.label ?? "Other reason";
}
