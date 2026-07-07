"use client";

import * as React from "react";
import { SendHorizontal, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAssistantStore } from "@/lib/assistant/use-assistant-store";

/**
 * Message composer for the assistant dock. Mirrors the vendor-chat composer
 * (auto-grow textarea, Enter submits); while a reply is streaming the send
 * button flips into a Stop button that aborts the stream.
 */
export function AssistantComposer() {
  const isStreaming = useAssistantStore((s) => s.isStreaming);
  const send = useAssistantStore((s) => s.send);
  const stop = useAssistantStore((s) => s.stop);

  const [text, setText] = React.useState("");

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
    <div className="border-t border-border bg-card px-2.5 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-end gap-1.5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Ask me anything…"
          aria-label="Message the shopping assistant"
          className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-13 font-medium outline-none focus:border-primary"
        />
        {isStreaming ? (
          <Button
            type="button"
            size="icon"
            variant="soft"
            onClick={stop}
            aria-label="Stop generating"
            className="size-10 shrink-0 rounded-xl"
          >
            <Square className="size-4 fill-current" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            onClick={submit}
            disabled={!text.trim()}
            aria-label="Send message"
            className="size-10 shrink-0 rounded-xl"
          >
            <SendHorizontal className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
