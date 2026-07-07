"use client";

import * as React from "react";
import { CalendarDays, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** "YYYY-MM-DD" ⇄ local Date, immune to timezone shifting. */
function parseISODate(value: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toISODate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

const DISPLAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export interface DatePickerProps {
  id?: string;
  /** ISO date string ("YYYY-MM-DD") or "" for empty. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Latest selectable day (e.g. today for a date of birth). */
  max?: Date;
  /** Earliest selectable day. */
  min?: Date;
  /** Month shown when opened with no value (e.g. a sensible DOB year). */
  defaultMonth?: Date;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
}

/**
 * Input-shaped trigger + popover calendar with month/year dropdowns.
 * Field-sized to match `Input` so it drops into any `Field` untouched.
 */
export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  max,
  min,
  defaultMonth,
  disabled,
  clearable = true,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseISODate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("relative", className)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            className={cn(
              "flex h-10 w-full items-center gap-2.5 rounded-md border border-input bg-card px-3.5 text-left text-sm font-bold text-foreground outline-none transition-colors",
              "hover:border-hairline focus:border-ring focus:ring-2 focus:ring-ring data-[state=open]:border-ring data-[state=open]:ring-2 data-[state=open]:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              clearable && selected && "pr-10",
            )}
          >
            <CalendarDays className="size-4 shrink-0 text-faint" />
            {selected ? (
              <span className="truncate">{DISPLAY.format(selected)}</span>
            ) : (
              <span className="truncate font-semibold text-faint">
                {placeholder}
              </span>
            )}
          </button>
        </PopoverTrigger>
        {clearable && selected && !disabled && (
          <button
            type="button"
            aria-label="Clear date"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-faint transition-colors hover:bg-muted hover:text-ink"
          >
            <X className="size-3.5" strokeWidth={2.5} />
          </button>
        )}
      </div>
      <PopoverContent align="start" className="w-auto p-3">
        <Calendar
          mode="single"
          required
          captionLayout="dropdown"
          selected={selected}
          defaultMonth={selected ?? defaultMonth ?? max ?? new Date()}
          startMonth={min ?? new Date(1900, 0)}
          endMonth={max ?? new Date(new Date().getFullYear() + 5, 11)}
          disabled={[
            ...(max ? [{ after: max }] : []),
            ...(min ? [{ before: min }] : []),
          ]}
          onSelect={(day) => {
            onChange(day ? toISODate(day) : "");
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
