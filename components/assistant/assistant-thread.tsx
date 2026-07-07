"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw, Sparkles } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { useAssistantStore } from "@/lib/assistant/use-assistant-store";
import { cn } from "@/lib/utils";
import type { AssistantMessage } from "@/lib/assistant/types";

import { MarkdownLite } from "./markdown-lite";
import { RichContentBlock } from "./rich-content";

/** Prompt chips shown on the empty thread. */
const SUGGESTIONS = [
  "Show me today's best deals",
  "Where is my order?",
  "Any discount coupons right now?",
];

/** Small sparkles avatar shown beside assistant replies. */
function BotAvatar() {
  return (
    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-linear-to-br from-blue to-blue-strong text-white shadow-xs">
      <Sparkles className="size-3.5" />
    </span>
  );
}

function Bubble({ message }: { message: AssistantMessage }) {
  const isMine = message.role === "user";

  if (isMine) {
    return (
      <div className="flex flex-col items-end">
        {message.text ? (
          <div className="max-w-[82%] whitespace-pre-wrap wrap-break-word rounded-2xl rounded-br-md bg-linear-to-br from-blue to-blue-strong px-3.5 py-2 text-13 font-medium leading-relaxed text-white shadow-xs">
            {message.text}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex w-full items-start gap-2">
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

/** The in-flight assistant bubble: streamed tokens + a pulsing caret. */
function StreamingBubble() {
  const streamText = useAssistantStore((s) => s.streamText);
  const streamRich = useAssistantStore((s) => s.streamRich);
  const statusLabel = useAssistantStore((s) => s.statusLabel);

  return (
    <div className="flex w-full items-start gap-2">
      <BotAvatar />
      <div className="flex min-w-0 flex-1 flex-col items-start">
        {streamText ? (
          <div className="max-w-[92%] rounded-2xl rounded-tl-md border border-line bg-card px-3.5 py-2 text-13 font-medium leading-relaxed text-ink shadow-xs">
            <MarkdownLite text={streamText} />
            <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse rounded-full bg-primary align-middle" />
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-line bg-card px-3.5 py-2.5 shadow-xs">
            <Spinner className="size-3.5 text-primary" />
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

  const bottomRef = React.useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1];

  // The last thing the customer said — offered back as a one-tap retry when
  // a turn fails.
  const lastUserText = React.useMemo(
    () => [...messages].reverse().find((m) => m.role === "user")?.text ?? null,
    [messages],
  );

  // Follow the stream: new message, fresh tokens, or a status flip.
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [last?.id, streamText, statusLabel, isStreaming]);

  if (isHydrating) {
    return (
      <div className="flex h-full items-center justify-center bg-surface">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto bg-surface px-3 py-3.5">
      {messages.length === 0 && !isStreaming ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-linear-to-br from-blue to-blue-strong text-white shadow-[var(--shadow-card)]">
            <Sparkles className="size-7" />
          </div>
          <div>
            <p className="text-15 font-extrabold text-ink">
              Hi! I&apos;m your shopping assistant
            </p>
            <p className="mx-auto mt-1 max-w-64 text-xs font-medium text-sub">
              Ask me about products, deals, orders, returns — anything in the store.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
                className="rounded-full border border-border bg-card px-4 py-2 text-13 font-semibold text-sub shadow-xs transition-all duration-150 hover:-translate-y-px hover:border-primary/40 hover:text-primary hover:shadow-[var(--shadow-card)] active:translate-y-0 active:scale-[0.98]"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {messages.map((m) => (
            <Bubble key={m.id} message={m} />
          ))}
          {isStreaming ? <StreamingBubble /> : null}
          {error ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-red/25 bg-red/5 px-3.5 py-3">
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
      <div ref={bottomRef} />
    </div>
  );
}
