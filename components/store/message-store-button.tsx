"use client";

import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { useChatStore } from "@/lib/chat/use-chat-store";

/**
 * Store-page entry into chat with the vendor — same flow as the PDP's
 * ChatWithSellerButton but without a product attached.
 */
export function MessageStoreButton({
  vendorId,
  vendorName,
  variant = "outline",
  className,
}: {
  vendorId: string;
  vendorName: string | null;
  variant?: "outline" | "ghost" | "primary";
  className?: string;
}) {
  const { requireAuth } = useAuth();
  const startWithVendor = useChatStore((s) => s.startWithVendor);

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={className}
      onClick={() => requireAuth(() => startWithVendor({ vendorId, vendorName }))}
    >
      <MessageCircle className="size-4" strokeWidth={2.2} /> Message
    </Button>
  );
}
