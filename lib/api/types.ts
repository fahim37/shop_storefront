/**
 * Hand-authored API types mirroring the verified store_backend contract
 * (see API_CONTRACT.md). All `*Paisa` are BDT paisa strings; all timestamps
 * are ISO strings; image refs are media ids resolved via `lib/media`.
 */

/* ----------------------------------------------------------------------- */
/* Pagination                                                              */
/* ----------------------------------------------------------------------- */

export interface CursorMeta {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

/** Raw envelope with `meta` (used by endpoints that truly paginate). */
export interface Paginated<T> {
  data: T[];
  meta: CursorMeta;
}

/* ----------------------------------------------------------------------- */
/* Catalog                                                                 */
/* ----------------------------------------------------------------------- */

export interface ProductCardRow {
  id: string;
  vendorId: string;
  categoryId: string;
  brandId: string | null;
  title: string;
  slug: string;
  description: string | null;
  attributes: Record<string, unknown>;
  status: string;
  ratingAverage: string | null;
  ratingCount: number;
  salesCount: number;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  thumbnailMediaId: string | null;
  minPricePaisa: string | null;
  brandName: string | null;
  vendorName: string | null;
  vendorSlug: string | null;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  optionValues: Record<string, string>;
  pricePaisa: string;
  compareAtPricePaisa: string | null;
  currency: string;
  weightGrams: number | null;
  dimensions: { l: number; w: number; h: number } | null;
  isActive: boolean;
  /** Units available to add = on_hand - reserved (server-computed). */
  availableStock: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  variantId: string | null;
  mediaId: string;
  altText: string | null;
  position: number;
  isPrimary: boolean;
  createdAt: string;
  /** "image" | "video" — video slots render an inline player. */
  mediaType: "image" | "video";
  /** Seconds; only set once a video is transcoded. */
  durationSeconds: number | null;
  /** Videos only become playable at "ready"; images are always "ready". */
  processingStatus: "ready" | "processing" | "failed";
}

export interface ProductDetail {
  product: ProductCardRow;
  variants: ProductVariant[];
  images: ProductImage[];
}

/** Recommendation card (home, cart upsell, pdp related). */
export interface RecHit {
  productId: string;
  title: string;
  slug: string;
  thumbnailMediaId: string | null;
  pricePaisa: string;
  ratingAverage: number;
  vendorName: string | null;
  vendorSlug: string | null;
}

export interface RecResponse {
  items: RecHit[];
  placement: string;
  modelVersion: string;
}

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  path: string;
  parentId: string | null;
  iconUrl: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  children: CategoryNode[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  path: string;
  iconUrl: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AttributeOption {
  id: string;
  attributeId: string;
  value: string;
  displayLabel: string | null;
  hexColor: string | null;
  sortOrder: number;
}

export interface CategoryAttribute {
  categoryId: string;
  attributeId: string;
  attributeName: string;
  attributeSlug: string;
  attributeDataType: "string" | "number" | "boolean" | "color" | "dimension";
  isVariantDefining: boolean;
  isRequired: boolean;
  sortOrder: number;
  options: AttributeOption[];
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ----------------------------------------------------------------------- */
/* Search                                                                  */
/* ----------------------------------------------------------------------- */

export type SearchSort =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "rating_desc"
  | "newest";

export interface SearchHit {
  productId: string;
  title: string;
  slug: string;
  thumbnailMediaId: string | null;
  pricePaisa: string;
  ratingAverage: number;
  vendorId: string;
  vendorName: string | null;
  vendorSlug: string | null;
  categoryId: string;
  brandId: string | null;
  score: number;
}

/** Store (vendor) whose name matched the search query. */
export interface SearchStoreHit {
  vendorId: string;
  storeName: string;
  storeSlug: string;
  storeLogoUrl: string | null;
  ratingAverage: number | null;
  productCount: number;
}

export interface SearchResponse {
  items: SearchHit[];
  nextCursor: string | null;
  hasMore: boolean;
  searchQueryId: string;
  semanticEnabled: boolean;
  /** "Did you mean" — closest product title when the query returns nothing. */
  suggestion: string | null;
  /** Set when the backend auto-corrected a typo'd query ("hedphones" →
   *  "headphones") and the results include matches for the corrected term. */
  correctedQuery?: string | null;
  /** Stores whose name matched the query — first page only. */
  stores?: SearchStoreHit[];
}

export interface AutocompleteItem {
  id: string;
  title: string;
  slug: string;
  thumbnailMediaId: string | null;
  /** Cheapest active variant price (paisa string) — null when no variant. */
  minPricePaisa: string | null;
  brandName: string | null;
}

export interface AutocompleteResponse {
  items: AutocompleteItem[];
  /** "Did you mean" — closest product title when the prefix matched nothing. */
  suggestion: string | null;
}

/* ----------------------------------------------------------------------- */
/* Facets (faceted filtering — /v1/products/facets & /v1/search/facets)    */
/* ----------------------------------------------------------------------- */

export interface FacetBrand {
  id: string;
  name: string;
  count: number;
}

export interface FacetOptionValue {
  value: string;
  hex: string | null;
  count: number;
}

export interface FacetOption {
  key: string;
  kind: "color" | "text";
  values: FacetOptionValue[];
}

export interface FacetRatingCount {
  /** Minimum average rating bucket (one of 4, 3, 2, 1; descending). */
  min: number;
  count: number;
}

/** Exact shape of the `data` payload from the *facets endpoints. */
export interface Facets {
  /** Products in the BASE SET (not narrowed by the user's selections). */
  total: number;
  priceRange: { minPaisa: string; maxPaisa: string } | null;
  brands: FacetBrand[];
  options: FacetOption[];
  ratingCounts: FacetRatingCount[];
  onSaleCount: number;
  inStockCount: number;
}

/* ----------------------------------------------------------------------- */
/* Cart                                                                    */
/* ----------------------------------------------------------------------- */

export interface CartLine {
  itemId: string;
  variantId: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  vendorId: string;
  sku: string;
  optionValues: Record<string, string>;
  quantity: number;
  unitPricePaisa: string;
  lineTotalPaisa: string;
  livePricePaisa: string;
  priceChanged: boolean;
  imageMediaId: string | null;
  reservationId: string | null;
  savedForLater: boolean;
  /** Largest quantity this line can be raised to given current stock
   *  (current quantity + still-available units). The stepper clamps to it. */
  maxQuantity: number;
}

export interface CartVendorGroup {
  vendorId: string;
  subtotalPaisa: string;
  items: CartLine[];
}

export interface AppliedCoupon {
  couponId: string;
  code: string;
  discountPaisa: string;
}

export interface CartSnapshot {
  cartId: string;
  currency: "BDT";
  items: CartLine[];
  savedForLater: CartLine[];
  vendorGroups: CartVendorGroup[];
  appliedCoupon: AppliedCoupon | null;
  subtotalPaisa: string;
  discountPaisa: string;
  shippingTotalPaisa: string;
  vatPaisa: string;
  grandTotalPaisa: string;
  expiresAt: string;
}

export interface CartMergeResult {
  mergedItems: number;
  movedItems: number;
  cart: CartSnapshot;
}

/* ----------------------------------------------------------------------- */
/* Orders & checkout                                                       */
/* ----------------------------------------------------------------------- */

export type PaymentMethod = "cod" | "bkash" | "sslcommerz";

export type SubOrderStatus =
  | "placed"
  | "vendor_confirmed"
  | "packed"
  | "at_hub"
  | "dispatched"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned";

export interface Order {
  id: string;
  userId: string;
  orderNumber: string;
  subtotalPaisa: string;
  vatPaisa: string;
  shippingTotalPaisa: string;
  discountPaisa: string;
  grandTotalPaisa: string;
  currency: string;
  shippingAddressId: string;
  customerNote: string | null;
  placedAt: string;
  cancelledAt: string | null;
  cancelledReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubOrder {
  id: string;
  orderId: string;
  vendorId: string;
  subOrderNumber: string;
  status: SubOrderStatus;
  vendorSubtotalPaisa: string;
  shippingPaisa: string;
  commissionRate: string;
  commissionPaisa: string;
  vendorPayoutPaisa: string;
  settledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  subOrderId: string;
  variantId: string;
  productId: string;
  titleSnapshot: string;
  imageUrlSnapshot: string | null;
  attributesSnapshot: Record<string, string> | null;
  skuSnapshot: string | null;
  quantity: number;
  unitPricePaisa: string;
  lineTotalPaisa: string;
  createdAt: string;
  productSlug: string | null;
  productStatus: string | null;
  thumbnailMediaId: string | null;
}

export interface HydratedSubOrder extends SubOrder {
  items: OrderItem[];
  vendorName: string | null;
  vendorSlug: string | null;
}

export interface OrderView extends Order {
  subOrders: HydratedSubOrder[];
}

export interface OrderSummary {
  itemCount: number;
  subOrderCount: number;
  vendorNames: string[];
  vendors: Array<{ name: string; slug: string | null }>;
  firstThumbnailMediaId: string | null;
  /** Sub-order `status` values for this order (list rows only). */
  subOrderStatuses: SubOrderStatus[];
}

export interface OrderListItem extends Order {
  summary: OrderSummary;
}

export interface CheckoutResponse {
  order: Order;
  subOrders: SubOrder[];
  paymentSessionUrl: string | null;
  paymentStatus: "pending" | "pending_verification";
}

export interface ShipmentEvent {
  at: string;
  eventType: string;
  actorType: string | null;
  notes: string | null;
}

export interface ShipmentLeg {
  legType: string;
  courier: string | null;
  status: string;
  trackingNumber: string | null;
}

export interface TrackingSubOrder {
  subOrderNumber: string;
  vendorId: string;
  status: SubOrderStatus;
  itemsCount: number;
  vendorPayoutPaisa: string;
  shipment: {
    shipmentId: string;
    status: string;
    arrivedAtHub: string | null;
    dispatchedAt: string | null;
    deliveredAt: string | null;
    events: ShipmentEvent[];
    legs: ShipmentLeg[];
  } | null;
}

export interface OrderTracking {
  orderNumber: string;
  subOrders: TrackingSubOrder[];
}

/* ----------------------------------------------------------------------- */
/* Returns & refunds                                                       */
/* ----------------------------------------------------------------------- */

/** Mirrors ReturnReasonCodes in store_backend/src/modules/return/return.policy.ts. */
export type ReturnReasonCode =
  | "damaged_in_transit"
  | "wrong_item"
  | "defective"
  | "not_as_described"
  | "changed_mind"
  | "better_price_elsewhere";

/** requested → approved → in_transit → at_hub → refunded (or rejected/disputed). */
export type ReturnStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "in_transit"
  | "at_hub"
  | "refunded"
  | "disputed";

export type RefundPreference = "original_method" | "wallet";

/** GET /orders/:id/items/:itemId/return — can this line still be returned? */
export interface ReturnEligibility {
  eligible: boolean;
  /** Machine reason when ineligible, e.g. "return_window_expired". */
  reason?: string;
  windowDaysRemaining: number;
}

export interface ReturnRequest {
  id: string;
  subOrderId: string;
  customerId: string;
  reasonCode: ReturnReasonCode;
  description: string | null;
  /** Media-asset ids of the customer's evidence photos. */
  photos: string[] | null;
  refundPreference: RefundPreference;
  status: ReturnStatus;
  approvalPath: "auto" | "manual" | null;
  approverId: string | null;
  /** Admin notes — shown to the customer when the return is rejected. */
  approvalNotes: string | null;
  approvedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** /me/returns list rows — the request plus a one-line display summary. */
export interface ReturnListItem extends ReturnRequest {
  vendorName: string | null;
  itemCount: number;
  firstThumbnailMediaId: string | null;
  firstProductTitle: string | null;
}

/** One returned line, hydrated with product info for display. */
export interface ReturnLineItem {
  id: string;
  returnRequestId: string;
  orderItemId: string;
  quantity: number;
  reasonCode: ReturnReasonCode | null;
  terminalAt: string | null;
  createdAt: string;
  productId: string | null;
  productSlug: string | null;
  productTitle: string | null;
  thumbnailMediaId: string | null;
}

/** Reverse (customer → hub) shipment for an approved return. */
export interface ReturnShipmentInfo {
  id: string;
  returnRequestId: string;
  courier: string;
  trackingNumber: string | null;
  status:
    | "scheduled"
    | "picked_up"
    | "in_transit"
    | "at_hub"
    | "qc_passed"
    | "qc_failed";
  qcOutcome: "pass" | "fail" | null;
  qcNotes: string | null;
  qcAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /me/returns/:id */
export interface ReturnView {
  request: ReturnRequest;
  items: ReturnLineItem[];
  shipment: ReturnShipmentInfo | null;
}

/* ----------------------------------------------------------------------- */
/* Reviews & Q&A                                                           */
/* ----------------------------------------------------------------------- */

export interface ReviewMedia {
  id: string;
  reviewId: string;
  url: string;
  mediaType: "image" | "video";
  position: number;
  createdAt: string;
}

export interface ReviewResponse {
  reviewId: string;
  vendorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * A follow-up message in a review conversation — after the seller's first
 * `response`, the buyer and seller can keep replying. `authorRole` says who
 * wrote it.
 */
export interface ReviewReplyMessage {
  id: string;
  reviewId: string;
  authorRole: "customer" | "vendor";
  authorUserId: string | null;
  authorVendorId: string | null;
  body: string;
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  productId: string;
  subOrderId: string;
  rating: number;
  title: string | null;
  body: string | null;
  recommend: boolean | null;
  status: string;
  helpfulCount: number;
  /** Set when the author has edited the review; null if never edited. */
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reviewerName: string | null;
  /** Reviewer's profile photo (usable URL or /v1 media path); null if none. */
  reviewerPhotoUrl: string | null;
  media: ReviewMedia[];
  response: ReviewResponse | null;
  /** Seller reply + follow-up conversation, oldest first. */
  replies: ReviewReplyMessage[];
}

/**
 * A review as returned by `GET /reviews/mine` — the caller's own reviews across
 * all statuses, joined with the product they belong to. Drives the "already
 * reviewed / edit" state on the account order pages.
 */
export interface MyReview {
  id: string;
  userId: string;
  productId: string;
  subOrderId: string;
  rating: number;
  title: string | null;
  body: string | null;
  recommend: boolean | null;
  status: string;
  helpfulCount: number;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
  productTitle: string | null;
  productSlug: string | null;
  thumbnailMediaId: string | null;
  /** Photos already attached to this review (shown + removable when editing). */
  media: ReviewMedia[];
  /** The seller's reply to this review, if any. */
  response: ReviewResponse | null;
  /** Follow-up conversation after the seller's reply, oldest first. */
  replies: ReviewReplyMessage[];
}

/**
 * The subset of a review the write/edit dialog seeds its fields from. Satisfied
 * structurally by both `MyReview` (account order pages) and `Review` (the PDP
 * eligibility payload), so either can be passed as `existingReview`.
 */
export interface EditableReview {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  recommend: boolean | null;
  media: ReviewMedia[];
}

/**
 * Payload of `GET /reviews/eligibility/:productId` — the signed-in caller's
 * verified-purchase review state for one product, driving the PDP CTA:
 *   - `review`   — their existing review (any status), hydrated like a public
 *     list item, so the PDP can pin it first and open it for editing.
 *   - `subOrderId` — a delivered sub-order to attach a *new* review to; null
 *     once they've reviewed or when they never received the product.
 *   - `canReview` — true when they may write a review or already own one.
 */
export interface ReviewEligibility {
  canReview: boolean;
  subOrderId: string | null;
  review: Review | null;
}

export type ReviewSort = "recent" | "helpful" | "rating_desc" | "rating_asc";

/** Payload of `GET /products/:id/reviews` — one page + summary metadata. */
export interface ReviewListResponse {
  reviews: Review[];
  /** Published-review count per star, keys "1".."5" (always unfiltered). */
  distribution: Record<string, number>;
  /** Total published reviews (sum of distribution). */
  total: number;
  hasMore: boolean;
  limit: number;
  offset: number;
}

export interface Answer {
  id: string;
  questionId: string;
  responderId: string;
  responderRole: "vendor" | "customer" | "admin" | null;
  body: string;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  productId: string;
  askerId: string;
  body: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  answers: Answer[];
}

export interface VendorReview {
  id: string;
  vendorId: string;
  userId: string;
  rating: number;
  body: string | null;
  status: string;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
  reviewerName: string | null;
}

/* ----------------------------------------------------------------------- */
/* Engagement                                                              */
/* ----------------------------------------------------------------------- */

export interface WishlistItem {
  userId: string;
  productId: string;
  addedAt: string;
  productTitle: string;
  productSlug: string;
  productStatus: string;
  vendorId: string;
  thumbnailMediaId: string | null;
  minPricePaisa: string | null;
  brandName: string | null;
  vendorName: string | null;
  vendorSlug: string | null;
}

export interface FollowedStore {
  userId: string;
  vendorId: string;
  followedAt: string;
  notificationsEnabled: boolean;
  storeName: string;
  storeSlug: string;
  storeLogoUrl: string | null;
  ratingAverage: string | null;
}

export interface RecentlyViewedItem {
  userId: string;
  productId: string;
  lastViewedAt: string;
  productTitle: string;
  productSlug: string;
  productStatus: string;
  vendorId: string;
  thumbnailMediaId: string | null;
  minPricePaisa: string | null;
  brandName: string | null;
  vendorName: string | null;
  vendorSlug: string | null;
}

/* ----------------------------------------------------------------------- */
/* Account / me                                                            */
/* ----------------------------------------------------------------------- */

export interface MeProfile {
  fullName: string;
  dateOfBirth: string | null;
  gender: string | null;
  photoUrl: string | null;
  defaultAddressId: string | null;
  twoFactorEnabled: boolean;
}

export interface Me {
  id: string;
  email: string;
  phone: string;
  userType: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  status: string;
  lastLoginAt: string | null;
  profile: MeProfile | null;
}

export interface Address {
  id: string;
  ownerId: string;
  ownerType: string;
  label: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  division: string;
  district: string;
  upazila: string;
  unionName: string | null;
  postcode: string;
  streetAddress: string;
  latitude: string | null;
  longitude: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddressInput {
  label?: string;
  recipientName: string;
  recipientPhone: string;
  // Simplified customer form: only district + street are required. Division,
  // upazila, union and postcode are auto-filled from the map picker when used,
  // and optional otherwise.
  division?: string;
  district: string;
  upazila?: string;
  unionName?: string;
  postcode?: string;
  streetAddress: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  channel: string;
  category: string | null;
  templateKey: string;
  payload: {
    subject?: string;
    body?: string;
    [k: string]: unknown;
  } | null;
  status: string;
  readAt: string | null;
  sentAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface NotificationPrefs {
  userId: string;
  emailMarketing: boolean;
  smsMarketing: boolean;
  pushMarketing: boolean;
  pushChatReplies: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  deltaPaisa: string;
  balanceAfterPaisa: string;
  kind: string;
  referenceType: string | null;
  referenceId: string | null;
  note: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface Wallet {
  userId: string;
  balancePaisa: string;
  currency: string;
  isFrozen: boolean;
  frozenReason: string | null;
  recentTransactions: WalletTransaction[];
}

export interface UploadedMedia {
  id: string;
  ownerType: string;
  ownerId: string | null;
  status: string;
  urls: {
    original: string;
    thumbnail: string | null;
    card: string | null;
    hero: string | null;
  };
  dedupedFromExisting: boolean;
}

/* ----------------------------------------------------------------------- */
/* Content                                                                 */
/* ----------------------------------------------------------------------- */

export type HomepageBlockKind =
  | "banner"
  | "carousel"
  | "curated_collection"
  | "category_grid"
  | "vendor_spotlight"
  | "product_rail"
  | "campaign_panel"
  | "usp_strip"
  | "promo_grid"
  | "category_circles";

/** How a dynamic product section picks its products. */
export type ProductSource =
  | "bestsellers"
  | "newest"
  | "recommendations"
  | "manual";

export interface HomepageBlock {
  id: string;
  kind: HomepageBlockKind;
  sortOrder: number;
  title: string | null;
  config: Record<string, unknown>;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** `config` shape for `kind: "banner"` blocks (admin-uploaded artwork). */
export interface HomepageBannerConfig {
  imageMediaId: string;
  /** Absolute URL or app-relative path ("/category/..."). */
  linkUrl?: string;
  altText?: string;
  headline?: string;
  subheadline?: string;
}

export interface HomepageCarouselSlide {
  imageMediaId: string;
  /** Absolute URL or app-relative path ("/category/..."). */
  linkUrl?: string;
  caption?: string;
}

/** `config` shape for `kind: "carousel"` blocks (1–10 slides). */
export interface HomepageCarouselConfig {
  slides: HomepageCarouselSlide[];
}

/** `config` for `kind: "product_rail"` — a titled row of product cards. */
export interface HomepageProductRailConfig {
  source?: ProductSource;
  /** Pinned, ordered ids when `source === "manual"`. */
  productIds?: string[];
  limit?: number;
  subtitle?: string;
  linkLabel?: string;
  linkUrl?: string;
}

/** `config` for `kind: "campaign_panel"` — the branded "bazar" board. */
export interface HomepageCampaignPanelConfig {
  source?: ProductSource;
  productIds?: string[];
  limit?: number;
  subtitle?: string;
  couponCode?: string;
  ctaHref?: string;
}

/** `config` for `kind: "curated_collection"` (productIds + optional subtitle). */
export interface HomepageCuratedCollectionConfig {
  productIds: string[];
  subtitle?: string;
  ctaUrl?: string;
}

export interface HomepageUspItem {
  /** Icon key mapped to a lucide icon on the storefront. */
  icon?: string;
  title: string;
  subtitle?: string;
}

/** `config` for `kind: "usp_strip"` — a trust/benefits row (1–8 cells). */
export interface HomepageUspStripConfig {
  items: HomepageUspItem[];
}

export interface HomepagePromoCard {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  tone?: "navy" | "amber" | "primary";
  icon?: string;
}

/** `config` for `kind: "promo_grid"` — 1–4 promo cards. */
export interface HomepagePromoGridConfig {
  cards: HomepagePromoCard[];
}

/** `config` for `kind: "category_circles"` — the round category shortcuts. */
export interface HomepageCategoryCirclesConfig {
  subtitle?: string;
  /** Pinned, ordered category ids; empty = auto-fill from the tree. */
  categoryIds?: string[];
  limit?: number;
}

export interface CmsPage {
  slug: string;
  title: string;
  body: string;
  isPublished: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/* ----------------------------------------------------------------------- */
/* Vendor store pages (the vendor-designed store website)                   */
/* ----------------------------------------------------------------------- */
/*
 * TypeScript mirror of the backend contract in
 * store_backend/src/modules/storePage/storePage.dto.ts — change it there
 * first, then keep this (and the vendor app's lib/store-page/types.ts) in
 * sync. Documents are validated server-side; the storefront can trust these
 * shapes.
 */

export interface StoreTheme {
  accent: string;
  background: string;
  foreground: string;
  font: "sans" | "serif" | "mono";
  radius: "none" | "sm" | "md" | "xl";
  buttonStyle: "solid" | "outline" | "soft";
  /** Legacy pre-`header` flag — only read when `document.header` is absent. */
  headerBanner: boolean;
  backgroundImageMediaId: string | null;
  /** Readability veil (% of page color) over the background image. */
  backgroundOverlay: number;
}

export interface StoreHeader {
  background: "banner" | "custom" | "gradient";
  imageMediaId: string | null;
  overlay: number;
  height: "compact" | "normal" | "tall";
  align: "left" | "center";
  showTagline: boolean;
  showStats: boolean;
}

export interface StoreSectionStyle {
  paddingTop: number;
  paddingBottom: number;
  background: "page" | "surface" | "accent" | "custom";
  customBackground?: string;
  fullBleed: boolean;
  hideOnMobile: boolean;
  hideOnDesktop: boolean;
}

export interface StoreButton {
  id: string;
  label: string;
  href: string;
  variant: "primary" | "ghost";
}

interface StoreSectionBase {
  id: string;
  hidden: boolean;
  style: StoreSectionStyle;
}

export interface StoreHeroSection extends StoreSectionBase {
  type: "hero";
  heading: string;
  subheading: string;
  align: "left" | "center" | "right";
  height: number;
  imageMediaId: string | null;
  overlay: number;
  textTone: "auto" | "light" | "dark";
  buttons: StoreButton[];
}

export interface StoreBannerSection extends StoreSectionBase {
  type: "banner";
  heading: string;
  subheading: string;
  align: "left" | "center" | "right";
  height: number;
  imageMediaId: string | null;
  overlay: number;
  textTone: "auto" | "light" | "dark";
  button: StoreButton | null;
}

export interface StoreRichTextSection extends StoreSectionBase {
  type: "rich_text";
  html: string;
  maxWidth: "narrow" | "normal" | "full";
  align: "left" | "center" | "right";
}

export interface StoreImageWithTextSection extends StoreSectionBase {
  type: "image_with_text";
  imageMediaId: string | null;
  imageSide: "left" | "right";
  imageSpan: number;
  heading: string;
  html: string;
  button: StoreButton | null;
}

export interface StoreGalleryItem {
  id: string;
  imageMediaId: string;
  caption: string;
  href: string | null;
}

export interface StoreGallerySection extends StoreSectionBase {
  type: "gallery";
  title: string;
  items: StoreGalleryItem[];
  columns: number;
  gap: "sm" | "md" | "lg";
  aspect: "square" | "portrait" | "landscape" | "auto";
}

export interface StoreProductsSection extends StoreSectionBase {
  type: "products";
  title: string;
  subtitle: string;
  source: "newest" | "best_selling" | "manual";
  productIds: string[];
  layout: "grid" | "carousel";
  columns: number;
  limit: number;
}

export interface StoreVideoSection extends StoreSectionBase {
  type: "video";
  url: string;
  title: string;
  maxWidth: "narrow" | "normal" | "full";
}

export interface StoreDividerSection extends StoreSectionBase {
  type: "divider";
  height: number;
  line: boolean;
}

export interface StoreInfoSection extends StoreSectionBase {
  type: "store_info";
  heading: string;
  showAbout: boolean;
  showReturnPolicy: boolean;
  showContact: boolean;
}

export interface StoreFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface StoreFaqSection extends StoreSectionBase {
  type: "faq";
  heading: string;
  items: StoreFaqItem[];
}

export interface StoreTestimonialItem {
  id: string;
  name: string;
  quote: string;
  rating: number | null;
}

export interface StoreTestimonialsSection extends StoreSectionBase {
  type: "testimonials";
  heading: string;
  items: StoreTestimonialItem[];
}

export interface StoreCountdownSection extends StoreSectionBase {
  type: "countdown";
  heading: string;
  subheading: string;
  endsAt: string;
  expiredText: string;
  button: StoreButton | null;
}

export type StoreSocialPlatform =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "whatsapp"
  | "x"
  | "website";

export interface StoreSocialLink {
  id: string;
  platform: StoreSocialPlatform;
  url: string;
  label: string;
}

export interface StoreSocialLinksSection extends StoreSectionBase {
  type: "social_links";
  heading: string;
  links: StoreSocialLink[];
}

export type StoreFeatureIcon =
  | "truck"
  | "shield"
  | "medal"
  | "sparkles"
  | "refresh"
  | "headphones"
  | "gift"
  | "leaf"
  | "zap"
  | "heart";

export interface StoreFeatureItem {
  id: string;
  icon: StoreFeatureIcon;
  title: string;
  text: string;
}

export interface StoreFeaturesSection extends StoreSectionBase {
  type: "features";
  heading: string;
  items: StoreFeatureItem[];
}

export type StoreSection =
  | StoreHeroSection
  | StoreBannerSection
  | StoreRichTextSection
  | StoreImageWithTextSection
  | StoreGallerySection
  | StoreProductsSection
  | StoreVideoSection
  | StoreDividerSection
  | StoreInfoSection
  | StoreFaqSection
  | StoreTestimonialsSection
  | StoreCountdownSection
  | StoreSocialLinksSection
  | StoreFeaturesSection;

export interface StorePageDocument {
  version: 1;
  theme: StoreTheme;
  /** Absent on documents published before header customization shipped. */
  header?: StoreHeader;
  sections: StoreSection[];
}

/** Public payload of GET /store-pages/:slug. */
export interface StorePagePayload {
  vendor: {
    id: string;
    storeName: string;
    storeSlug: string;
    storeLogoUrl: string | null;
    storeBannerUrl: string | null;
    tagline: string | null;
    about: string | null;
    returnPolicy: string | null;
    ratingAverage: string | null;
    vacationMode: boolean;
    joinedAt: string;
    followerCount: number;
    productCount: number;
  };
  page: StorePageDocument | null;
  publishedAt: string | null;
}
