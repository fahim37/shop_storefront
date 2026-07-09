"use client";

import * as React from "react";
import { RotateCcw, Sparkles } from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { CloseButton } from "@/components/ui/close-button";
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
      className="group fixed right-4 z-40 grid size-13 animate-pop place-items-center rounded-full bg-linear-to-br from-blue to-blue-strong text-white shadow-[var(--shadow-pop)] ring-1 ring-white/20 transition-transform duration-150 hover:scale-105 active:scale-95 bottom-[calc(var(--bottom-nav-h,0px)+16px)] md:bottom-6 motion-reduce:animate-none"
    >
      {/* Soft attention ring — one slow ping every few seconds, honours
          prefers-reduced-motion. */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 animate-ping rounded-full bg-blue/40 [animation-duration:3.2s] group-hover:hidden motion-reduce:hidden"
      />
      <Sparkles className="size-6 transition-transform duration-200 group-hover:rotate-12" />
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

  // The dock is a modal Sheet, so a link clicked inside it (product card,
  // order row, markdown link, action chip) navigates the page UNDERNEATH the
  // overlay. Close the dock on any internal-link click so the customer lands
  // on the page they asked for; modifier/middle clicks (new tab) keep it
  // open. The thread lives in the store, so reopening resumes the chat.
  const closeOnNavigate = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // No e.defaultPrevented guard: Next's <Link> preventDefaults every
      // internal click as part of client-side routing, so it's always true
      // here. Modifier/middle clicks open a new tab — keep the dock then.
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement).closest("a[href]");
      if (anchor?.getAttribute("href")?.startsWith("/")) setOpen(false);
    },
    [setOpen],
  );

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
            {/* Header — brand blue (not navy) with a soft radial glow */}
            <div className="relative flex items-center gap-3 overflow-hidden bg-linear-to-r from-blue-strong via-blue to-[oklch(0.58_0.19_255)] px-3.5 py-3 text-white">
              <span
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-white/10"
              />
              <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <Sparkles className="size-4.5" />
              </span>
              <SheetTitle className="relative flex flex-col text-15 font-extrabold leading-tight text-white">
                Shopping Assistant
                <span className="flex items-center gap-1.5 text-11 font-semibold text-white/75">
                  <span className="size-1.5 animate-badge-pulse rounded-full bg-green-soft shadow-[0_0_6px_2px_oklch(0.86_0.12_160/0.55)] motion-reduce:animate-none" />
                  Online — ask anything
                </span>
              </SheetTitle>
              <div className="relative ml-auto flex items-center gap-1.5">
                {hasMessages ? (
                  <button
                    type="button"
                    onClick={reset}
                    aria-label="Start a new chat"
                    title="New chat"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-[transform,background-color,border-color] duration-200 ease-out hover:border-white/30 hover:bg-white/20 active:scale-[0.85] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  >
                    <RotateCcw className="size-4" />
                  </button>
                ) : null}
                <CloseButton
                  tone="overlay"
                  onClick={() => setOpen(false)}
                  aria-label="Close assistant"
                />
              </div>
            </div>

            {/* Body — closeOnNavigate is click delegation on child links,
                not an interaction of this container itself */}
            <div className="flex min-h-0 flex-1 flex-col" onClick={closeOnNavigate}>
              <AssistantThread />
              <AssistantComposer />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
