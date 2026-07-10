import { Suspense } from "react";
import type { Metadata } from "next";
import { PaymentResult } from "@/components/checkout/payment-result";

export const metadata: Metadata = {
  title: "Payment cancelled",
  robots: { index: false, follow: false },
};

/** bKash cancellation landing (PAYMENT_CANCEL_URL). */
export default function CheckoutCancelledPage() {
  return (
    <Suspense fallback={null}>
      <PaymentResult defaultOutcome="cancelled" />
    </Suspense>
  );
}
