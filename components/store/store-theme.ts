/**
 * Store-page theming helpers. A vendor's StoreTheme becomes a set of scoped
 * CSS custom properties on the page root; every section renderer styles
 * itself from those vars so one theme flows through the whole page.
 *
 * Plain module (no "use client") — used by Server Components.
 */
import type { CSSProperties } from "react";
import type { StoreSectionStyle, StoreTheme } from "@/lib/api/types";

export const STORE_FONT_STACKS: Record<StoreTheme["font"], string> = {
  // "sans" inherits the site font so default pages feel native.
  sans: "inherit",
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
  mono: 'ui-monospace, "Cascadia Code", Menlo, Consolas, monospace',
};

export const STORE_RADIUS_PX: Record<StoreTheme["radius"], number> = {
  none: 0,
  sm: 6,
  md: 12,
  xl: 20,
};

/** Black or white — whichever reads better on the given hex background. */
export function readableOn(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const int = Number.parseInt(full, 16);
  if (Number.isNaN(int)) return "#ffffff";
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  // Perceived luminance (ITU-R BT.601), good enough for button text.
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return luma > 150 ? "#111111" : "#ffffff";
}

/** CSS vars applied to the store page root element. */
export function themeVars(theme: StoreTheme): CSSProperties {
  return {
    "--sp-accent": theme.accent,
    "--sp-on-accent": readableOn(theme.accent),
    "--sp-bg": theme.background,
    "--sp-fg": theme.foreground,
    "--sp-radius": `${STORE_RADIUS_PX[theme.radius]}px`,
    fontFamily: STORE_FONT_STACKS[theme.font],
    backgroundColor: "var(--sp-bg)",
    color: "var(--sp-fg)",
  } as CSSProperties;
}

/** Background color for a section, resolved from its style block. */
export function sectionBackground(style: StoreSectionStyle): string | undefined {
  switch (style.background) {
    case "surface":
      return "color-mix(in srgb, var(--sp-fg) 5%, var(--sp-bg))";
    case "accent":
      return "color-mix(in srgb, var(--sp-accent) 12%, var(--sp-bg))";
    case "custom":
      return style.customBackground ?? undefined;
    case "page":
    default:
      return undefined;
  }
}

/** Inline style for a themed CTA button. */
export function buttonStyles(
  theme: StoreTheme,
  variant: "primary" | "ghost",
): CSSProperties {
  const radius = `calc(var(--sp-radius) * 0.75)`;
  if (variant === "ghost") {
    return {
      borderRadius: radius,
      border: "1px solid currentColor",
      color: "inherit",
      background: "transparent",
    };
  }
  switch (theme.buttonStyle) {
    case "outline":
      return {
        borderRadius: radius,
        border: "1.5px solid var(--sp-accent)",
        color: "var(--sp-accent)",
        background: "transparent",
      };
    case "soft":
      return {
        borderRadius: radius,
        background: "color-mix(in srgb, var(--sp-accent) 14%, transparent)",
        color: "var(--sp-accent)",
      };
    case "solid":
    default:
      return {
        borderRadius: radius,
        background: "var(--sp-accent)",
        color: "var(--sp-on-accent)",
      };
  }
}
