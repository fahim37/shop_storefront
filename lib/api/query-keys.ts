/**
 * Centralized TanStack Query key factory. Keeping every key in one place makes
 * invalidation predictable (e.g. cart mutations invalidate `qk.cart()`).
 */

export type ProductListParams = {
  categoryId?: string;
  /** Single-brand (legacy); still honored alongside `brandIds`. */
  brandId?: string;
  /** Multi-brand selection -> brandIds CSV on the wire. */
  brandIds?: string[];
  minPricePaisa?: string;
  maxPricePaisa?: string;
  rating?: number;
  inStock?: boolean;
  onSale?: boolean;
  /** Dynamic option filter: { Color: ["Red","Blue"], Size: ["M"] } -> opt[<Key>]=csv. */
  options?: Record<string, string[]>;
  sort?: string;
  limit?: number;
};

export type SearchParams = {
  q: string;
  sort?: string;
  categoryId?: string;
  /** Single-brand (legacy); still honored alongside `brandIds`. */
  brandId?: string;
  /** Multi-brand selection -> brandIds CSV on the wire. */
  brandIds?: string[];
  priceMinPaisa?: string;
  priceMaxPaisa?: string;
  rating?: number;
  inStock?: boolean;
  onSale?: boolean;
  /** Dynamic option filter: { Color: ["Red","Blue"], Size: ["M"] } -> opt[<Key>]=csv. */
  options?: Record<string, string[]>;
  limit?: number;
};

export const qk = {
  // catalog
  products: (params: ProductListParams = {}) => ["products", params] as const,
  listingFacets: (params: ProductListParams = {}) =>
    ["facets", "products", params] as const,
  searchFacets: (params: SearchParams) => ["facets", "search", params] as const,
  categories: () => ["categories"] as const,

  // search
  search: (params: SearchParams) => ["search", params] as const,
  autocomplete: (q: string) => ["autocomplete", q] as const,
  trending: () => ["search", "trending"] as const,
  recommendationsHome: () => ["recommendations", "home"] as const,
  cartRecommendations: () => ["recommendations", "cart"] as const,

  // cart
  cart: () => ["cart"] as const,

  // orders
  orders: (params: { limit?: number; placedAfter?: string } = {}) =>
    ["orders", params] as const,
  order: (id: string) => ["order", id] as const,
  orderTracking: (id: string) => ["order", id, "tracking"] as const,

  // reviews & qa
  reviews: (productId: string) => ["reviews", productId] as const,
  /** Paged/sorted/filtered PDP list — prefix-invalidated by `reviews(id)`. */
  reviewsList: (productId: string, params: { sort: string; rating?: number }) =>
    ["reviews", productId, params] as const,
  myReviews: () => ["reviews", "mine"] as const,
  /** PDP verified-purchase state — prefix-invalidated by `reviews(id)`. */
  reviewEligibility: (productId: string) =>
    ["reviews", productId, "eligibility"] as const,
  questions: (productId: string) => ["questions", productId] as const,

  // engagement
  wishlist: () => ["wishlist"] as const,
  followedStores: () => ["followed-stores"] as const,

  // account
  me: () => ["me"] as const,
  addresses: () => ["addresses"] as const,
  notifications: (unreadOnly?: boolean) =>
    ["notifications", { unreadOnly: !!unreadOnly }] as const,
  unreadCount: () => ["notifications", "unread-count"] as const,
  notificationPrefs: () => ["notification-preferences"] as const,
  wallet: () => ["wallet"] as const,

  // content
  homepage: () => ["homepage"] as const,
  page: (slug: string) => ["page", slug] as const,
} as const;
