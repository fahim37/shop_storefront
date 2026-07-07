"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";
import { ChatDock } from "@/components/chat/chat-dock";
import { AssistantDock } from "@/components/assistant/assistant-dock";
import { useCartMergeOnAuth } from "@/lib/api/cart";

/** Folds a guest cart into the user cart once authenticated. Renders nothing. */
function CartMergeBridge() {
  useCartMergeOnAuth();
  return null;
}

/**
 * App-wide client providers: React Query + Auth + Tooltip + Toaster. The auth verceltriggering
 * modal is mounted here so any component can open it via useAuth().openAuth().
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>
          <CartMergeBridge />
          {children}
          <ChatDock />
          <AssistantDock />
          <AuthModal />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
