/**
 * Icon registry for admin-authored homepage sections (USP strip, promo cards).
 * The admin stores a short string key in `config`; the storefront maps it to a
 * lucide icon here. Unknown / missing keys fall back to a neutral default so a
 * typo never breaks the render.
 */
import {
  Wallet,
  ShieldCheck,
  Truck,
  RotateCcw,
  Tag,
  Store,
  Gift,
  Percent,
  Ticket,
  Star,
  Sparkles,
  Heart,
  Package,
  BadgeCheck,
  Clock,
  Headphones,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  wallet: Wallet,
  shield: ShieldCheck,
  truck: Truck,
  returns: RotateCcw,
  tag: Tag,
  store: Store,
  gift: Gift,
  percent: Percent,
  ticket: Ticket,
  star: Star,
  sparkles: Sparkles,
  heart: Heart,
  package: Package,
  verified: BadgeCheck,
  clock: Clock,
  support: Headphones,
};

/** All icon keys an admin can choose from (used to build the editor dropdown). */
export const SECTION_ICON_KEYS = Object.keys(ICONS);

/** Resolve an admin icon key to a lucide component (Sparkles fallback). */
export function sectionIcon(key?: string | null): LucideIcon {
  if (key && ICONS[key]) return ICONS[key];
  return Sparkles;
}
