import {
  Armchair,
  Baby,
  type LucideIcon,
  Footprints,
  Gem,
  Headphones,
  Laptop,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sofa,
  Sparkles,
  Tag,
  Utensils,
  Watch,
  Zap,
} from "lucide-react";

/** Map a category slug/name to a representative icon (seed catalog + fallback). */
const ICON_MAP: Record<string, LucideIcon> = {
  electronics: Zap,
  phones: Smartphone,
  smartphones: Smartphone,
  "feature-phones": Smartphone,
  laptops: Laptop,
  audio: Headphones,
  accessories: Sparkles,
  fashion: Shirt,
  men: Shirt,
  women: Gem,
  kids: Baby,
  shoes: Footprints,
  watches: Watch,
  jewellery: Gem,
  "home-living": Sofa,
  home: Sofa,
  furniture: Armchair,
  kitchen: Utensils,
  grocery: ShoppingBasket,
  beauty: Sparkles,
};

export function categoryIcon(slugOrName: string): LucideIcon {
  const key = slugOrName.toLowerCase().replace(/\s+/g, "-");
  return ICON_MAP[key] ?? Tag;
}
