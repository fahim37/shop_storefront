"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface OtpInputProps {
  /** Controlled value (the assembled code, up to `length` digits). */
  value: string;
  /** Called with the new assembled value on every change. */
  onChange: (value: string) => void;
  /** Number of digit boxes. Defaults to 6. */
  length?: number;
  disabled?: boolean;
  /** Auto-focus the first empty box on mount. */
  autoFocus?: boolean;
  /** Fired when all boxes are filled. */
  onComplete?: (value: string) => void;
  className?: string;
  /** Accessible label for the group. */
  "aria-label"?: string;
  /** id of an external element describing/erroring this input group. */
  "aria-describedby"?: string;
  /** Marks the group invalid for assistive tech. */
  "aria-invalid"?: boolean;
  /** Stable id prefix for the individual boxes. */
  id?: string;
}

const DIGIT_RE = /\d/g;

/**
 * Six (configurable) single-character boxes with auto-advance, backspace
 * navigation, and paste-to-fill. Fully controlled via value/onChange.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = false,
  onComplete,
  className,
  id,
  "aria-label": ariaLabel = "One-time code",
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: OtpInputProps) {
  const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);
  const digits = React.useMemo(() => {
    const chars = value.slice(0, length).split("");
    return Array.from({ length }, (_, i) => chars[i] ?? "");
  }, [value, length]);

  const focusBox = (index: number) => {
    const clamped = Math.max(0, Math.min(length - 1, index));
    inputsRef.current[clamped]?.focus();
    inputsRef.current[clamped]?.select();
  };

  const emit = (next: string) => {
    onChange(next);
    if (next.length === length && DIGIT_RE.test(next) && next.replace(/\D/g, "").length === length) {
      onComplete?.(next);
    }
  };

  const setDigitAt = (index: number, digit: string) => {
    const arr = digits.slice();
    arr[index] = digit;
    return arr.join("").replace(/\D/g, "").slice(0, length);
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const raw = event.target.value.replace(/\D/g, "");
    if (!raw) {
      // Cleared the box.
      emit(setDigitAt(index, ""));
      return;
    }
    if (raw.length === 1) {
      emit(setDigitAt(index, raw));
      if (index < length - 1) focusBox(index + 1);
      return;
    }
    // Multiple chars typed/inserted into one box: spread across boxes.
    const arr = digits.slice();
    let cursor = index;
    for (const ch of raw.split("")) {
      if (cursor >= length) break;
      arr[cursor] = ch;
      cursor += 1;
    }
    const next = arr.join("").replace(/\D/g, "").slice(0, length);
    emit(next);
    focusBox(Math.min(cursor, length - 1));
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (digits[index]) {
        emit(setDigitAt(index, ""));
      } else if (index > 0) {
        emit(setDigitAt(index - 1, ""));
        focusBox(index - 1);
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (
    event: React.ClipboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length - index);
    if (!pasted) return;
    const arr = digits.slice();
    let cursor = index;
    for (const ch of pasted.split("")) {
      arr[cursor] = ch;
      cursor += 1;
    }
    const next = arr.join("").replace(/\D/g, "").slice(0, length);
    emit(next);
    focusBox(Math.min(cursor, length - 1));
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={cn("flex items-center gap-2", className)}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          id={id ? `${id}-${index}` : undefined}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          pattern="\d*"
          maxLength={1}
          disabled={disabled}
          value={digit}
          aria-label={`Digit ${index + 1}`}
          aria-invalid={ariaInvalid || undefined}
          autoFocus={autoFocus && index === 0}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={(e) => handlePaste(e, index)}
          onFocus={(e) => e.currentTarget.select()}
          className={cn(
            "h-12 w-11 rounded-[var(--radius)] border border-input bg-muted text-center text-lg font-semibold text-foreground",
            "transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-background",
            "disabled:cursor-not-allowed disabled:opacity-50",
            ariaInvalid && "border-destructive focus-visible:ring-destructive",
          )}
        />
      ))}
    </div>
  );
}
