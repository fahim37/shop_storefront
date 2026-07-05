"use client";

import * as React from "react";
import { Smile } from "lucide-react";

import { cn } from "@/lib/utils";

/* ----------------------------------------------------------------------------
 * Reusable emoji picker: a trigger button + a lightweight popover with a
 * categorized, scrollable emoji grid. Self-contained (no popover dependency);
 * closes on outside-click, Escape, or blur. Emits the chosen glyph via
 * `onSelect` — the caller decides how to insert it (append, at-cursor, …).
 * ------------------------------------------------------------------------- */

interface EmojiCategory {
  /** Short id, also the aria-label for its tab. */
  id: string;
  /** Representative glyph shown on the category tab. */
  tab: string;
  emojis: readonly string[];
}

const CATEGORIES: readonly EmojiCategory[] = [
  {
    id: "Smileys",
    tab: "😀",
    emojis: [
      "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰",
      "😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🥳","😏","😒",
      "😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬",
      "🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🤭","🤫","🤥","😶","😐",
      "😑","😬","🙄","😯","😲","🥱","😴","🤤","😪","🤐","🥴","🤢","🤮","🤧","😷","🤒",
      "🤕","🤑","🤠",
    ],
  },
  {
    id: "Gestures",
    tab: "👍",
    emojis: [
      "👍","👎","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝️","✋",
      "🤚","🖐️","🖖","👋","🤝","🙏","✍️","💪","🙌","👏","🤲","🫶","🫡","🤗","🫰","👐",
    ],
  },
  {
    id: "Hearts",
    tab: "❤️",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","💕","💞","💓","💗","💖",
      "💘","💝","💟","❣️","💯","💢","💥","💫","💦","💨","🔥","⭐","🌟","✨","🎉","🎊",
    ],
  },
  {
    id: "Animals",
    tab: "🐶",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔",
      "🐧","🐦","🐤","🦄","🐝","🦋","🌸","🌼","🌻","🌹","🌷","🌵","🌴","🍀","🍁","🌈",
    ],
  },
  {
    id: "Food",
    tab: "🍔",
    emojis: [
      "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍒","🍑","🥭","🍍","🥝","🍅",
      "🥑","🍔","🍟","🍕","🌭","🍿","🥓","🍳","🥞","🍞","🧀","🍗","🍖","🍤","🍣","🍦",
      "🍩","🍪","🎂","🍰","🧁","🍫","🍬","🍭","☕","🍵","🧋","🍺","🍻","🥂","🍷",
    ],
  },
  {
    id: "Activity",
    tab: "⚽",
    emojis: [
      "⚽","🏀","🏈","⚾","🎾","🏐","🎱","🏓","🏸","🎯","🎮","🕹️","🎲","🎸","🎧","🎤",
      "🚗","🚕","🚙","🚌","🏎️","🚑","✈️","🚀","🚁","⛵","🏝️","🗺️","🧳","🏆","🥇","🎁",
    ],
  },
  {
    id: "Objects",
    tab: "📦",
    emojis: [
      "📦","🛒","🛍️","💳","💰","💵","🏷️","📱","💻","⌚","📷","🔋","💡","🔑","🔒","📌",
      "📍","✅","❌","⚠️","❓","❗","➕","➖","💤","🔔","🎵","🎶","✔️","♻️","📢","🕐",
    ],
  },
];

export interface EmojiPickerProps {
  /** Called with the chosen glyph. */
  onSelect: (emoji: string) => void;
  /** Disable the trigger. */
  disabled?: boolean;
  /** Which horizontal edge the panel aligns to. */
  align?: "start" | "end";
  /** Which vertical side the panel opens toward the trigger. */
  side?: "top" | "bottom";
  /** Keep the panel open after a pick (lets users add several). Default true. */
  keepOpenOnSelect?: boolean;
  /** Extra classes for the trigger button. */
  className?: string;
  /** Accessible label for the trigger. */
  label?: string;
}

export function EmojiPicker({
  onSelect,
  disabled,
  align = "end",
  side = "top",
  keepOpenOnSelect = true,
  className,
  label = "Insert emoji",
}: EmojiPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Close on outside pointerdown / Escape while open.
  React.useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (emoji: string) => {
    onSelect(emoji);
    if (!keepOpenOnSelect) setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "grid place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          open && "bg-muted text-foreground",
          className,
        )}
      >
        <Smile className="size-5" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Emoji picker"
          className={cn(
            "absolute z-50 w-[17rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-border bg-card shadow-lg",
            side === "top" ? "bottom-full mb-2" : "top-full mt-2",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {/* Category tabs */}
          <div className="flex items-center gap-0.5 border-b border-border px-1.5 py-1.5">
            {CATEGORIES.map((cat, i) => (
              <button
                key={cat.id}
                type="button"
                aria-label={cat.id}
                aria-pressed={active === i}
                onClick={() => setActive(i)}
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg text-lg leading-none transition-colors hover:bg-muted",
                  active === i && "bg-muted ring-1 ring-border",
                )}
              >
                {cat.tab}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className="max-h-52 overflow-y-auto p-1.5">
            <div className="grid grid-cols-8 gap-0.5">
              {CATEGORIES[active].emojis.map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  type="button"
                  onClick={() => pick(emoji)}
                  className="grid size-8 place-items-center rounded-lg text-xl leading-none transition-transform hover:scale-110 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Emoji ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
