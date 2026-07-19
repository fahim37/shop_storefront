"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { useAssistantStore } from "@/lib/assistant/use-assistant-store";
import type { AssistantMessage } from "@/lib/assistant/types";

import { MarkdownLite } from "./markdown-lite";
import { OrbieAvatar, OrbieHero } from "./orbie";
import { RichContentBlock } from "./rich-content";

/** Prompt chips shown on the empty thread. */
const SUGGESTIONS = [
  "Show me today's best deals",
  "Where is my order?",
  "Any discount coupons right now?",
];

/** Mini Orbie beside assistant replies. */
function BotAvatar() {
  return <OrbieAvatar size={26} className="mt-0.5 shrink-0" />;
}

function Bubble({ message }: { message: AssistantMessage }) {
  const isMine = message.role === "user";

  if (isMine) {
    return (
      <div className="flex animate-fade-up flex-col items-end motion-reduce:animate-none">
        {message.text ? (
          <div className="max-w-[82%] whitespace-pre-wrap wrap-break-word rounded-2xl rounded-br-md bg-linear-to-br from-blue to-blue-strong px-3.5 py-2 text-13 font-medium leading-relaxed text-white shadow-xs">
            {message.text}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex w-full animate-fade-up items-start gap-2 motion-reduce:animate-none">
      <BotAvatar />
      <div className="flex min-w-0 flex-1 flex-col items-start">
        {message.text ? (
          <div className="max-w-[92%] wrap-break-word rounded-2xl rounded-tl-md border border-line bg-card px-3.5 py-2 text-13 font-medium leading-relaxed text-ink shadow-xs">
            <MarkdownLite text={message.text} />
          </div>
        ) : null}
        {message.richContent ? <RichContentBlock rich={message.richContent} /> : null}
      </div>
    </div>
  );
}

/** Three-dot typing indicator (Orbie's staggered bob). */
function TypingDots() {
  return (
    <span className="flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-primary/70"
          style={{ animation: `orbie-dotb 1.1s ${i * 0.15}s infinite` }}
        />
      ))}
    </span>
  );
}

/** The in-flight assistant bubble: streamed tokens + a pulsing caret. */
function StreamingBubble() {
  const streamText = useAssistantStore((s) => s.streamText);
  const streamStale = useAssistantStore((s) => s.streamStale);
  const streamRich = useAssistantStore((s) => s.streamRich);
  const statusLabel = useAssistantStore((s) => s.statusLabel);

  return (
    <div className="flex w-full animate-fade-up items-start gap-2 motion-reduce:animate-none">
      <OrbieAvatar size={26} mood="thinking" className="mt-0.5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col items-start">
        {streamText ? (
          <div className="max-w-[92%] rounded-2xl rounded-tl-md border border-line bg-card px-3.5 py-2 text-13 font-medium leading-relaxed text-ink shadow-xs">
            {/* While a tool runs, the pre-tool prose stays visible but dimmed
                with the progress line beneath — blanking it read as a stall. */}
            <div className={streamStale ? "opacity-55 transition-opacity" : undefined}>
              <MarkdownLite text={streamText} streaming />
              {!streamStale ? (
                <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse rounded-full bg-primary align-middle" />
              ) : null}
            </div>
            {streamStale ? (
              <div className="mt-1.5 flex items-center gap-2">
                <Spinner className="size-3.5 text-primary" />
                <span className="text-11 font-semibold text-sub">
                  {statusLabel ?? "Working on it…"}
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-md border border-line bg-card px-3.5 py-2.5 shadow-xs">
            {statusLabel ? (
              <Spinner className="size-3.5 text-primary" />
            ) : (
              <TypingDots />
            )}
            <span className="text-11 font-semibold text-sub">
              {statusLabel ?? "Thinking…"}
            </span>
          </div>
        )}
        {streamRich ? <RichContentBlock rich={streamRich} /> : null}
      </div>
    </div>
  );
}

export function AssistantThread() {
  const messages = useAssistantStore((s) => s.messages);
  const isStreaming = useAssistantStore((s) => s.isStreaming);
  const isHydrating = useAssistantStore((s) => s.isHydrating);
  const streamText = useAssistantStore((s) => s.streamText);
  const statusLabel = useAssistantStore((s) => s.statusLabel);
  const error = useAssistantStore((s) => s.error);
  const send = useAssistantStore((s) => s.send);

  const containerRef = React.useRef<HTMLDivElement>(null);
  // Whether the view is pinned to the bottom — scrolling up unpins so a long
  // streaming reply doesn't yank the customer back down every frame.
  const pinnedRef = React.useRef(true);
  const last = messages[messages.length - 1];

  // The last thing the customer said — offered back as a one-tap retry when
  // a turn fails.
  const lastUserText = React.useMemo(
    () => [...messages].reverse().find((m) => m.role === "user")?.text ?? null,
    [messages],
  );

  const onScroll = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  }, []);

  // Follow the stream: new message, fresh tokens, or a status flip. A direct
  // scrollTop write is cheaper than scrollIntoView (no scroll-anchoring work)
  // and skipped entirely while the customer reads scrolled-up history.
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || !pinnedRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [last?.id, streamText, statusLabel, isStreaming]);

  if (isHydrating) {
    return (
      <div className="flex h-full items-center justify-center bg-surface">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className="flex-1 space-y-3 overflow-y-auto bg-surface px-3 py-3.5"
    >
      {messages.length === 0 && !isStreaming ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <OrbieHero />
          <div className="animate-fade-up motion-reduce:animate-none">
            <p className="text-15 font-extrabold text-ink">
              Hi! I&apos;m Orbie — your shopping buddy
            </p>
            <p className="mx-auto mt-1 max-w-72 text-xs font-medium text-sub">
              Ask me about products, deals, orders, returns — anything in the
              store. Or grab me, I&apos;m squishy.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
                style={{ animationDelay: `${120 + i * 70}ms` }}
                className="animate-fade-up rounded-full border border-border bg-card px-4 py-2 text-13 font-semibold text-sub shadow-xs transition-all duration-150 hover:-translate-y-px hover:border-primary/40 hover:text-primary hover:shadow-[var(--shadow-card)] active:translate-y-0 active:scale-[0.98] motion-reduce:animate-none"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Compact Orbie rides at the top of the transcript (scrolls away
              with history, like the prototype) — still boopable/squishy. */}
          <div className="flex justify-center pb-1">
            <OrbieHero compact />
          </div>
          {messages.map((m) => (
            <Bubble key={m.id} message={m} />
          ))}
          {isStreaming ? <StreamingBubble /> : null}
          {error ? (
            <div className="flex animate-pop items-start gap-2.5 rounded-xl border border-red/25 bg-red/5 px-3.5 py-3 motion-reduce:animate-none">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red" />
              <div className="min-w-0 flex-1">
                <p className="text-13 font-semibold leading-snug text-red">{error}</p>
                {lastUserText ? (
                  <button
                    type="button"
                    onClick={() => void send(lastUserText)}
                    className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-red/25 bg-card px-3 py-1 text-11 font-bold text-red transition-colors hover:bg-red/10 active:scale-[0.97]"
                  >
                    <RotateCcw className="size-3" strokeWidth={2.5} />
                    Try again
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
