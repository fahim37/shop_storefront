import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
