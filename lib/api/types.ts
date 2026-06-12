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
  categoryId: string;
  brandId: string | null;
  score: number;
}

export interface SearchResponse {
  items: SearchHit[];
  nextCursor: string | null;
  hasMore: boolean;
  searchQueryId: string;
  semanticEnabled: boolean;
}

export interface AutocompleteItem {
  id: string;
  title: string;
  slug: string;
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
  | "ready_to_dispatch"
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
}

export interface OrderView extends Order {
  subOrders: HydratedSubOrder[];
}

export interface OrderSummary {
  itemCount: number;
  subOrderCount: number;
  vendorNames: string[];
  firstThumbnailMediaId: string | null;
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
  createdAt: string;
  updatedAt: string;
  reviewerName: string | null;
  media: ReviewMedia[];
  response: ReviewResponse | null;
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
  recipientName?: string;
  recipientPhone?: string;
  division: string;
  district: string;
  upazila: string;
  unionName?: string;
  postcode: string;
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
  | "vendor_spotlight";

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

export interface CmsPage {
  slug: string;
  title: string;
  body: string;
  isPublished: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}
