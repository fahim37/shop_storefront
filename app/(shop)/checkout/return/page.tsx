import { Suspense } from "react";
import type { Metadata } from "next";
import { PaymentResult } from "@/components/checkout/payment-result";

export const metadata: Metadata = {
  title: "Payment result",
  robots: { index: false, follow: false },
};

/** bKash success/pending landing (PAYMENT_RETURN_URL). */
export default function CheckoutReturnPage() {
  return (
    <Suspense fallback={null}>
      <PaymentResult defaultOutcome="success" />
    </Suspense>
  );
}
