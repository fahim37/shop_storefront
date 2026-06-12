import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional class names (clsx) and resolve conflicting Tailwind
 * utilities (tailwind-merge) so later classes win.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
