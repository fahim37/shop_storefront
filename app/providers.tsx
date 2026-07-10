"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";
import { ChatDock } from "@/components/chat/chat-dock";
import { AssistantDock } from "@/components/assistant/assistant-dock";
import { useCartMergeOnAuth } from "@/lib/api/cart";
import { API_BASE_URL } from "@/lib/config";

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
  // Warm the TCP connection to the (cross-origin) API before the first fetch —
  // otherwise the first assistant message pays DNS+connection setup inline
  // before its SSE stream can start. use-credentials matches the credentialed
  // fetches the assistant stream and API client make. React dedupes this hint.
  ReactDOM.preconnect(new URL(API_BASE_URL).origin, {
    crossOrigin: "use-credentials",
  });

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
