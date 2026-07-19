"use client";

import * as React from "react";
import { SendHorizontal, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAssistantStore } from "@/lib/assistant/use-assistant-store";

import { useMascotUi } from "./mascot";

/**
 * Message composer for the assistant dock. Mirrors the vendor-chat composer
 * (auto-grow textarea, Enter submits); while a reply is streaming the send
 * button flips into a Stop button that aborts the stream.
 */
export function AssistantComposer() {
  const isStreaming = useAssistantStore((s) => s.isStreaming);
  const send = useAssistantStore((s) => s.send);
  const stop = useAssistantStore((s) => s.stop);
  const setComposerFocused = useMascotUi((s) => s.setComposerFocused);

  const [text, setText] = React.useState("");

  // Leaving the field mid-conversation should drop the "listening" mood too.
  React.useEffect(() => () => setComposerFocused(false), [setComposerFocused]);

  const submit = () => {
    const body = text.trim();
    if (!body || isStreaming) return;
    setText("");
    void send(body);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-line bg-card px-2.5 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
      <div className="flex items-end gap-1.5 rounded-[22px] border border-border bg-surface p-1.5 pl-4 transition-[border-color,box-shadow] focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setComposerFocused(true)}
          onBlur={() => setComposerFocused(false)}
          rows={1}
          placeholder="Ask Nova anything…"
          aria-label="Message Nova, the shopping assistant"
          className="max-h-28 min-h-8 flex-1 resize-none self-center bg-transparent py-1 text-13 font-medium outline-none placeholder:text-faint"
        />
        {isStreaming ? (
          <Button
            type="button"
            size="icon"
            variant="soft"
            onClick={stop}
            aria-label="Stop generating"
            className="size-9 shrink-0 rounded-full"
          >
            <Square className="size-3.5 fill-current" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            onClick={submit}
            disabled={!text.trim()}
            aria-label="Send message"
            className="size-9 shrink-0 rounded-full bg-linear-to-br from-blue to-blue-strong transition-transform hover:scale-105 active:scale-95 disabled:from-transparent disabled:to-transparent disabled:bg-muted disabled:text-faint"
          >
            <SendHorizontal className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
