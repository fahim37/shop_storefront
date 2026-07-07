"use client";

import * as React from "react";
import { RotateCcw, Sparkles, X } from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth/auth-context";
import { useAssistantStore } from "@/lib/assistant/use-assistant-store";

import { AssistantComposer } from "./assistant-composer";
import { AssistantThread } from "./assistant-thread";

/**
 * Global AI shopping-assistant surface: a floating launcher (FAB) plus a
 * Sheet dock — bottom sheet on mobile, right slide-over on md+ (the
 * storefront's viewport-split pattern). Works logged-out (guest identity =
 * the cart session token); signing in unlocks order/return/account help.
 * Mounted once in app providers, peer of ChatDock.
 */

/** md breakpoint switch, SSR-safe (defaults to mobile until mounted). */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

/**
 * Drops the stored conversation when the auth identity flips — a guest
 * thread is never adopted into the account, and an account thread must not
 * leak to the next guest. Skips the initial auth bootstrap.
 */
function useAuthIdentityBridge() {
  const { status } = useAuth();
  const onAuthChange = useAssistantStore((s) => s.onAuthChange);
  const prevRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (status === "loading") return;
    const prev = prevRef.current;
    prevRef.current = status;
    if (prev !== null && prev !== status) {
      onAuthChange(status === "authenticated");
    }
  }, [status, onAuthChange]);
}

function AssistantFab() {
  const open = useAssistantStore((s) => s.open);
  const setOpen = useAssistantStore((s) => s.setOpen);
  if (open) return null;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open shopping assistant"
      className="fixed right-4 z-40 grid size-13 place-items-center rounded-full bg-primary text-white shadow-[var(--shadow-pop)] transition-transform duration-150 hover:scale-105 active:scale-95 bottom-[calc(var(--bottom-nav-h,0px)+16px)] md:bottom-6"
    >
      <Sparkles className="size-6" />
    </button>
  );
}

export function AssistantDock() {
  useAuthIdentityBridge();
  const isDesktop = useIsDesktop();

  const open = useAssistantStore((s) => s.open);
  const setOpen = useAssistantStore((s) => s.setOpen);
  const reset = useAssistantStore((s) => s.reset);
  const hasMessages = useAssistantStore((s) => s.messages.length > 0);

  return (
    <>
      <AssistantFab />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isDesktop ? "right" : "bottom"}
          hideClose
          className={isDesktop ? "p-0 sm:max-w-md" : "h-[85dvh] p-0"}
        >
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-border bg-navy px-3 py-3 text-white">
              <SheetTitle className="flex items-center gap-2 text-base font-extrabold text-white">
                <Sparkles className="size-5" /> Shopping Assistant
              </SheetTitle>
              <div className="ml-auto flex items-center gap-0.5">
                {hasMessages ? (
                  <button
                    type="button"
                    onClick={reset}
                    aria-label="Start a new chat"
                    title="New chat"
                    className="rounded-full p-1.5 hover:bg-white/10"
                  >
                    <RotateCcw className="size-4.5" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close assistant"
                  className="rounded-full p-1.5 hover:bg-white/10"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex min-h-0 flex-1 flex-col">
              <AssistantThread />
              <AssistantComposer />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
