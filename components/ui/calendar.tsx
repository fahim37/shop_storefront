"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DropdownProps } from "react-day-picker";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Brand-skinned DayPicker (shadcn pattern). Month/year dropdown navigation
 * (`captionLayout="dropdown"`) renders through our Select so the calendar
 * matches every other menu in the app.
 */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("select-none", className)}
      classNames={{
        root: "rdp-root",
        months: "relative flex flex-col gap-4",
        month: "flex w-full flex-col gap-3",
        month_caption:
          "flex h-9 items-center justify-center font-display text-sm font-extrabold text-ink",
        caption_label: "flex items-center gap-1",
        dropdowns: "flex items-center justify-center gap-1.5",
        dropdown_root: "relative",
        nav: "absolute inset-x-0 top-0 z-10 flex h-9 items-center justify-between",
        button_previous:
          "inline-flex size-8 items-center justify-center rounded-lg border border-border bg-muted/60 text-sub transition-colors hover:bg-muted hover:text-ink active:scale-95 disabled:pointer-events-none disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        button_next:
          "inline-flex size-8 items-center justify-center rounded-lg border border-border bg-muted/60 text-sub transition-colors hover:bg-muted hover:text-ink active:scale-95 disabled:pointer-events-none disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 pb-1 text-center text-11 font-extrabold uppercase tracking-wide text-faint",
        week: "mt-1 flex w-full",
        day: cn(
          "relative p-0 text-center text-13 font-semibold",
          "[&:has([data-selected])]:rounded-lg",
        ),
        day_button: cn(
          "inline-flex size-9 items-center justify-center rounded-lg transition-colors",
          "hover:bg-blue-soft hover:text-primary active:scale-95",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        ),
        selected:
          "[&>button]:bg-primary [&>button]:font-extrabold [&>button]:text-white [&>button]:hover:bg-primary [&>button]:hover:text-white",
        today:
          "[&>button]:font-extrabold [&>button]:text-primary [&>button:not([data-selected])]:bg-blue-soft/60",
        outside: "text-faint/60 [&>button]:font-normal",
        disabled: "text-faint/40 [&>button]:pointer-events-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: c }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("size-4", c)} />
          ) : (
            <ChevronRight className={cn("size-4", c)} />
          ),
        Dropdown: CalendarDropdown,
      }}
      {...props}
    />
  );
}

/** Maps DayPicker's native-select dropdown contract onto our shadcn Select. */
function CalendarDropdown({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
}: DropdownProps) {
  const handleChange = (next: string) => {
    // DayPicker expects a native select change event; synthesize the shape.
    onChange?.({
      target: { value: next },
    } as unknown as React.ChangeEvent<HTMLSelectElement>);
  };
  const selected = options?.find((o) => String(o.value) === String(value));

  return (
    <Select value={String(value)} onValueChange={handleChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className="h-8 gap-1 rounded-lg border-border bg-muted/60 px-2.5 text-13 font-bold hover:bg-muted"
      >
        <SelectValue>{selected?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-64 min-w-[7rem]">
        {options?.map((o) => (
          <SelectItem
            key={o.value}
            value={String(o.value)}
            disabled={o.disabled}
            className="py-1.5 text-13"
          >
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
