import { Suspense } from "react";
import type { Metadata } from "next";
import { PaymentResult } from "@/components/checkout/payment-result";

export const metadata: Metadata = {
  title: "Payment failed",
  robots: { index: false, follow: false },
};

/** bKash failure landing (PAYMENT_FAIL_URL). */
export default function CheckoutFailedPage() {
  return (
    <Suspense fallback={null}>
      <PaymentResult defaultOutcome="failed" />
    </Suspense>
  );
}
