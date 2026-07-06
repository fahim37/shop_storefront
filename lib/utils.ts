import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge, taught about our custom type-scale utilities. The design
 * system adds numeric font-size steps (text-2xs/11/13/15/22/28) via @theme in
 * globals.css. Stock tailwind-merge doesn't recognise these as font sizes, so
 * it treated e.g. `text-13` as a *text color* and, when a class list carried
 * both a size and a color (every `size="sm"`/`"xl"` Button — `text-13`/`text-15`
 * alongside `text-white`/`text-*-foreground`), it dropped the color as a
 * "conflict", leaving solid buttons with dark, inherited text. Registering the
 * steps in the font-size group lets size and colour coexist.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["2xs", "11", "13", "15", "22", "28"] }],
    },
  },
});

/**
 * Merge conditional class names (clsx) and resolve conflicting Tailwind
 * utilities (tailwind-merge) so later classes win.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * True on a product detail page (`/product/[slug]`). Mobile swaps the global
 * chrome (site header, bottom tab bar, chat launcher) for the immersive PDP
 * chrome — floating top bar + sticky action bar. Desktop is unaffected.
 */
export function isProductPath(pathname: string): boolean {
  return pathname.startsWith("/product/");
}
