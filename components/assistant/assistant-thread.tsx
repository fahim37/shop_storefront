"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";

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

function Bubble({ message }: { message: AssistantMessage }) {
  const isMine = message.role === "user";
  return (
    <div className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
      <div className={cn("flex flex-col", isMine ? "max-w-[82%] items-end" : "w-full items-start")}>
        {message.text ? (
          <div
            className={cn(
              "wrap-break-word rounded-2xl px-3 py-2 text-13 font-medium leading-relaxed",
              isMine
                ? "whitespace-pre-wrap rounded-br-md bg-primary text-white"
                : "max-w-[92%] rounded-bl-md bg-muted text-ink",
            )}
          >
            {isMine ? message.text : <MarkdownLite text={message.text} />}
          </div>
        ) : null}
        {!isMine && message.richContent ? (
          <RichContentBlock rich={message.richContent} />
        ) : null}
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
    <div className="flex w-full flex-col items-start">
      {streamText ? (
        <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-13 font-medium leading-relaxed text-ink">
          <MarkdownLite text={streamText} />
          <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse rounded-full bg-primary align-middle" />
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-3 py-2.5">
          <Spinner className="size-3.5 text-primary" />
          <span className="text-11 font-semibold text-sub">
            {statusLabel ?? "Thinking…"}
          </span>
        </div>
      )}
      {streamRich ? <RichContentBlock rich={streamRich} /> : null}
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

  // Follow the stream: new message, fresh tokens, or a status flip.
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [last?.id, streamText, statusLabel, isStreaming]);

  if (isHydrating) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
      {messages.length === 0 && !isStreaming ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <div className="grid size-12 place-items-center rounded-2xl bg-blue-soft">
            <Sparkles className="size-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-ink">Hi! I&apos;m your shopping assistant</p>
            <p className="mx-auto mt-1 max-w-64 text-xs font-medium text-sub">
              Ask me about products, deals, orders, returns — anything in the store.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
                className="rounded-full border border-border bg-card px-3.5 py-1.5 text-13 font-semibold text-sub transition-colors hover:border-primary hover:text-primary"
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
            <div className="rounded-xl border border-red/30 bg-red/5 px-3 py-2 text-13 font-medium text-red">
              {error}
            </div>
          ) : null}
        </>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
