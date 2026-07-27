"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetGrabber,
  SheetTitle,
  sheetDragHandleProps,
} from "@/components/ui/sheet";
import { CloseButton } from "@/components/ui/close-button";
import { useAuth } from "@/lib/auth/auth-context";
import { useAssistantStore } from "@/lib/assistant/use-assistant-store";

import { AssistantComposer } from "./assistant-composer";
import { AssistantThread } from "./assistant-thread";
import {
  MASCOT_STATUS,
  MascotSvg,
  MascotZzz,
  useBlink,
  useMascotMood,
  useMascotUi,
  useSleepDriver,
} from "./mascot";

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
  const blink = useBlink();
  // After a while with no page input Nova dozes off right on the launcher.
  const sleepy = useMascotUi((s) => s.sleepy);
  // Smaller launcher on phones — 64px crowded the bottom nav corner.
  const isDesktop = useIsDesktop();
  if (open) return null;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open shopping assistant"
      className="group fixed right-4 z-40 animate-pop transition-transform duration-150 hover:scale-105 active:scale-95 bottom-[calc(var(--bottom-nav-h,0px)+16px)] md:bottom-6 motion-reduce:animate-none"
    >
      {/* Nova bobs gently while waiting to be opened (unless napping). */}
      <span
        aria-hidden
        className="relative block"
        style={{ animation: sleepy ? "none" : "mascot-floaty 3.6s .3s ease-in-out infinite" }}
      >
        <MascotSvg
          size={isDesktop ? 64 : 46}
          mood={sleepy ? "sleepy" : "idle"}
          blink={blink}
          glow
        />
        {sleepy ? (
          <span className="absolute -top-2 right-0">
            <MascotZzz small />
          </span>
        ) : null}
      </span>
    </button>
  );
}

/**
 * Header badge: a mini Nova that mirrors the live mood and relays boops to
 * the hero in the thread (plus its own little squash so the tap lands).
 */
function MascotBadge() {
  const mood = useMascotMood();
  const blink = useBlink();
  const boop = useMascotUi((s) => s.boop);
  const [squash, setSquash] = React.useState(false);

  return (
    <button
      type="button"
      aria-label="Nova"
      onClick={() => {
        boop();
        setSquash(true);
        window.setTimeout(() => setSquash(false), 620);
      }}
      className="relative grid size-12 shrink-0 place-items-center transition-transform hover:scale-108"
      style={{
        animation: squash ? "mascot-boing .6s cubic-bezier(.36,.07,.19,.97) both" : "none",
        transformOrigin: "50% 88%",
      }}
    >
      <MascotSvg size={44} mood={mood} blink={blink} halo headshot />
    </button>
  );
}

export function AssistantDock() {
  useAuthIdentityBridge();
  useSleepDriver();
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

  const mood = useMascotMood();

  return (
    <>
      <AssistantFab />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isDesktop ? "right" : "bottom"}
          hideClose
          // Mobile only: the thread carries a horizontal product-card scroller,
          // which a whole-panel horizontal swipe would fight — the bottom
          // sheet's gesture is scoped to its header instead.
          swipeToClose={!isDesktop}
          className={
            isDesktop
              ? "p-0 sm:max-w-md"
              : // overflow-hidden so the header clips to the sheet's rounded top
                // instead of squaring it off; border-t-0 kills the hairline that
                // read as a stray white line above the header.
                "h-[85dvh] overflow-hidden rounded-t-4xl border-t-0 p-0"
          }
        >
          <div className="flex h-full flex-col">
            {/* Header — brand blue (not navy) with a soft radial glow. On
                mobile it doubles as the sheet's drag handle. */}
            <div
              {...(isDesktop ? {} : sheetDragHandleProps)}
              className="relative flex flex-col overflow-hidden bg-linear-to-r from-blue-strong via-blue to-[oklch(0.58_0.19_255)] text-white"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-white/10"
              />
              {!isDesktop ? <SheetGrabber className="relative mt-2 bg-white/40" /> : null}
              <div className="relative flex items-center gap-2.5 px-3.5 py-2.5">
                <MascotBadge />
                <SheetTitle className="relative flex flex-col text-15 font-extrabold leading-tight text-white">
                  Nova — Shopping Assistant
                  <span className="flex items-center gap-1.5 text-11 font-semibold text-white/75">
                    {/* Status LED mirrors the mood: red on a snag, amber asleep,
                        green otherwise. */}
                    <span
                      className={`size-1.5 animate-badge-pulse rounded-full motion-reduce:animate-none ${
                        mood === "error"
                          ? "bg-red shadow-[0_0_6px_2px_oklch(0.6_0.19_25/0.5)]"
                          : mood === "sleepy"
                            ? "bg-amber shadow-[0_0_6px_2px_oklch(0.8_0.15_78/0.5)]"
                            : "bg-green-soft shadow-[0_0_6px_2px_oklch(0.86_0.12_160/0.55)]"
                      }`}
                    />
                    {MASCOT_STATUS[mood]}
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
