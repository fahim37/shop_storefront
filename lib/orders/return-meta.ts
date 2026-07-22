import type { ReturnReasonCode, ReturnStatus } from "@/lib/api/types";

/**
 * Why-are-you-returning options shown in the request-return dialog. Mirrors
 * ReturnReasonCodes in store_backend/src/modules/return/return.policy.ts —
 * keep the two lists in sync. Reasons flagged `auto` are platform-fault
 * reasons the backend approves instantly (no manual review).
 */
export const RETURN_REASONS: ReadonlyArray<{
  code: ReturnReasonCode;
  label: string;
  auto?: boolean;
}> = [
  { code: "damaged_in_transit", label: "Arrived damaged", auto: true },
  { code: "wrong_item", label: "Received the wrong item", auto: true },
  { code: "defective", label: "Defective / doesn't work" },
  { code: "not_as_described", label: "Not as described" },
  { code: "changed_mind", label: "Changed my mind" },
  { code: "better_price_elsewhere", label: "Found a better price" },
];

export function returnReasonLabel(code: string | null | undefined): string {
  return RETURN_REASONS.find((r) => r.code === code)?.label ?? "Other reason";
}

/**
 * Human label, badge variant and a customer-facing explainer per return
 * status. `tone` keys into STATUS_TONE_CLASS (lib/order-status) for the
 * dot-and-label treatment used on sub-order chips.
 */
export const RETURN_STATUS: Record<
  ReturnStatus,
  {
    label: string;
    variant: "primary" | "success" | "sale" | "muted";
    tone: "proc" | "transit" | "done" | "cancel";
    blurb: string;
  }
> = {
  requested: {
    label: "Under review",
    variant: "muted",
    tone: "proc",
    blurb:
      "We're reviewing your request — most reviews finish within a couple of days.",
  },
  approved: {
    label: "Approved",
    variant: "primary",
    tone: "proc",
    blurb:
      "Your return is approved. A courier will contact you to pick up the item.",
  },
  in_transit: {
    label: "Pickup in transit",
    variant: "primary",
    tone: "transit",
    blurb: "Your item is on its way back to our hub.",
  },
  at_hub: {
    label: "Being inspected",
    variant: "primary",
    tone: "transit",
    blurb:
      "The item arrived at our hub and is being checked. Your refund is issued once it passes inspection.",
  },
  refunded: {
    label: "Refunded",
    variant: "success",
    tone: "done",
    blurb: "Your refund has been issued.",
  },
  rejected: {
    label: "Rejected",
    variant: "sale",
    tone: "cancel",
    blurb: "This return couldn't be accepted.",
  },
  disputed: {
    label: "Disputed",
    variant: "sale",
    tone: "cancel",
    blurb: "This return is under dispute — our support team will reach out.",
  },
};

/**
 * The happy-path return timeline for the detail page stepper. Rejected /
 * disputed exit the rail and render as a banner instead.
 */
export const RETURN_STEPS: ReadonlyArray<{
  key: string;
  label: string;
  states: ReturnStatus[];
}> = [
  { key: "requested", label: "Requested", states: ["requested"] },
  { key: "approved", label: "Approved", states: ["approved"] },
  { key: "pickup", label: "Picked up", states: ["in_transit"] },
  { key: "at_hub", label: "At hub", states: ["at_hub"] },
  { key: "refunded", label: "Refunded", states: ["refunded"] },
];

/** Index of the current step in RETURN_STEPS (-1 when rejected/disputed). */
export function returnStepIndex(status: ReturnStatus): number {
  if (status === "rejected" || status === "disputed") return -1;
  return RETURN_STEPS.findIndex((s) => s.states.includes(status));
}

/** Friendly copy for the machine `reason` an ineligible item comes back with. */
export function returnBlockedMessage(reason: string | undefined): string {
  switch (reason) {
    case "return_window_expired":
      return "The return window for this item has closed.";
    case "return_already_in_progress":
      return "A return is already in progress for this item.";
    case "sub_order_not_delivered":
      return "Items can be returned once they're delivered.";
    default:
      return "This item isn't eligible for a return.";
  }
}
