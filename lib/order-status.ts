import type { SubOrderStatus } from "@/lib/api/types";

/** Human label + chip tone for a sub-order status. */
export const SUBORDER_STATUS: Record<
  SubOrderStatus,
  { label: string; tone: "proc" | "transit" | "done" | "cancel" }
> = {
  placed: { label: "Placed", tone: "proc" },
  vendor_confirmed: { label: "Confirmed", tone: "proc" },
  packed: { label: "Packed", tone: "proc" },
  at_hub: { label: "At hub", tone: "transit" },
  dispatched: { label: "Dispatched", tone: "transit" },
  out_for_delivery: { label: "Out for delivery", tone: "transit" },
  delivered: { label: "Delivered", tone: "done" },
  cancelled: { label: "Cancelled", tone: "cancel" },
  returned: { label: "Returned", tone: "cancel" },
};

/** Tailwind text color per tone (for the status dot + label). */
export const STATUS_TONE_CLASS: Record<string, string> = {
  proc: "text-amber-deep",
  transit: "text-primary",
  done: "text-green",
  cancel: "text-red",
};

/**
 * The 5-step customer tracking timeline. Internal logistics states collapse onto
 * one visible milestone so the stepper stays legible (esp. on mobile) — the exact
 * status is still shown per-vendor via SUBORDER_STATUS and the shipment event log.
 * "Shipped" covers at_hub → dispatched.
 */
export const TRACKING_STEPS: {
  key: string;
  label: string;
  states: SubOrderStatus[];
}[] = [
  { key: "placed", label: "Placed", states: ["placed"] },
  { key: "preparing", label: "Preparing", states: ["vendor_confirmed", "packed"] },
  {
    key: "shipped",
    label: "Shipped",
    states: ["at_hub", "dispatched"],
  },
  { key: "ofd", label: "Out for delivery", states: ["out_for_delivery"] },
  { key: "delivered", label: "Delivered", states: ["delivered"] },
];

/** Index of the current step in TRACKING_STEPS for a given status (-1 if exited). */
export function currentStepIndex(status: SubOrderStatus): number {
  if (status === "cancelled" || status === "returned") return -1;
  return TRACKING_STEPS.findIndex((s) => s.states.includes(status));
}

/** Can the customer still cancel? Only before packing. */
export function canCustomerCancel(status: SubOrderStatus): boolean {
  return status === "placed" || status === "vendor_confirmed";
}
