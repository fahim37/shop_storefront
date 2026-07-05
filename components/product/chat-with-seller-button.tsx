"use client";

import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { useChatStore } from "@/lib/chat/use-chat-store";

/**
 * Product-page entry point into chat. Requires auth (opens the auth modal for
 * guests), then opens the chat dock straight into a thread with this seller,
 * pre-attaching the product as context for the first message.
 */
export function ChatWithSellerButton({
  vendorId,
  vendorName,
  productId,
  productTitle,
}: {
  vendorId: string;
  vendorName: string | null;
  productId: string;
  productTitle: string;
}) {
  const { requireAuth } = useAuth();
  const startWithVendor = useChatStore((s) => s.startWithVendor);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0"
      onClick={() =>
        requireAuth(() =>
          startWithVendor({ vendorId, vendorName, productId, productTitle }),
        )
      }
    >
      <MessageCircle className="size-4" strokeWidth={2.2} /> Chat
    </Button>
  );
}
