# Storefront ⇄ store_backend API contract (verified against source)

Base URL `${API_BASE}/v1` (`http://localhost:4000/v1` in dev). Envelope: success `{ data, requestId }` or
paginated `{ data, meta:{ nextCursor, hasMore, limit }, requestId }`; error `{ error:{ code, message, details? } }`.
The http client already unwraps `.data`. **Most list endpoints here return a BARE ARRAY with NO `meta`** — only
notifications + wallet/transactions are truly cursor-paginated.

## Cross-cutting

- **Money**: every `*Paisa` field is a **string** (BDT paisa, 1 BDT = 100 paisa). Never `Number()` — format via `lib/format`.
- **Images**: products/cart/orders carry `mediaId`/`thumbnailMediaId`/`imageMediaId` (NOT URLs). Resolve to an
  image URL with `GET /v1/media/:id/:variant` (302 → presigned). variants: `original | thumbnail | card | hero`.
  `order_items.imageUrlSnapshot` is already a relative path like `/v1/media/<id>/card`.
- **Auth**: access token in memory → `Authorization: Bearer`. 401 → refresh once (already wired in `lib/api/http`).
- **Cart auth (dual)**: send `Authorization` (if logged in) AND/OR `X-Cart-Session: <uuid>` header (guest token in
  localStorage). On login → `POST /cart/merge { guestSessionToken }` then invalidate cart.

## Catalog

- `GET /products?categoryId&brandId&minPricePaisa&maxPricePaisa&limit(=20)&cursor` → **array** of product rows +
  `{ thumbnailMediaId, minPricePaisa, brandName, vendorName }`. Pagination in `meta.nextCursor/hasMore`.
  Key fields: `id, slug, title, description, categoryId, vendorId, brandId, attributes(bag), ratingAverage(string|null),
  ratingCount, salesCount`. categoryId expands to descendants.
- `GET /products/:slug` → `{ product, variants[], images[] }`. product = same flat row. variant = `{ id, sku,
  optionValues(Record), pricePaisa, compareAtPricePaisa(string|null), currency, isActive, ... }` (INCLUDES inactive).
  image = `{ id, variantId|null, mediaId, altText, position, isPrimary }`. No nested brand/vendor/category objects —
  only ids + `brandName`/`vendorName`. 404 if not published.
- `GET /products/:id/recommendations/related` → `{ items: RecHit[], placement, modelVersion }` (hydrated cards). USE THIS
  for PDP "you may also like" (not `/similar`, which is id+distance only).
- `GET /categories` → nested tree `CategoryNode[] { id,name,slug,path,parentId,iconUrl,description,sortOrder,children[] }`.
- `GET /categories/:slug` → raw category row. `GET /categories/:id/breadcrumbs` → ancestor chain incl self.
- `GET /categories/:id/attributes` → filter rail source: `[{ attributeName, attributeSlug, attributeDataType,
  isVariantDefining, options:[{ id,value,displayLabel,hexColor }] }]`.
- `GET /brands` → active brand rows `{ id,name,slug,logoUrl,description }`. `GET /brands/:slug`.

## Search (soft-auth)

- `GET /search?q&sort&limit(=20)&cursor&filters[categoryId]&filters[brandId]&filters[priceMinPaisa]&filters[priceMaxPaisa]&filters[rating]`
  → `{ items:[{ productId,title,slug,thumbnailMediaId,pricePaisa,ratingAverage(number),vendorId,categoryId,brandId,score }],
  nextCursor, hasMore, searchQueryId, semanticEnabled }`. sort ∈ `relevance|price_asc|price_desc|rating_desc|newest`.
  NO facets — build filter UI from catalog endpoints.
- `GET /search/autocomplete?q` (min 2) → `{ items:[{ id,title,slug,thumbnailMediaId }] }` (max 8).
- `POST /search/click { searchQueryId, productId, position }` → 201. Skip if searchQueryId === "".
- `GET /me/recommendations/home` → `{ items: RecHit[], placement:"home", modelVersion }` (popular feed).
  RecHit = `{ productId, title, slug, thumbnailMediaId, pricePaisa, ratingAverage(number) }`.
- `GET /cart/recommendations` (needs auth or X-Cart-Session) → `{ items: RecHit[], placement:"cart_upsell" }`.

## Cart (soft-auth; Bearer OR X-Cart-Session)

`GET /cart` → CartSnapshot:
```
{ cartId, currency:"BDT", items:CartLine[], savedForLater:CartLine[],
  vendorGroups:[{ vendorId, subtotalPaisa, items:CartLine[] }],
  appliedCoupon:{ couponId, code, discountPaisa }|null,
  subtotalPaisa, discountPaisa, shippingTotalPaisa, vatPaisa, grandTotalPaisa, expiresAt }
```
CartLine = `{ itemId, variantId, productId, productTitle, productSlug, vendorId, sku, optionValues,
quantity, maxQuantity, unitPricePaisa, lineTotalPaisa, livePricePaisa, priceChanged, imageMediaId, savedForLater }`.
`maxQuantity` = highest quantity this line can be raised to given live stock (current qty + available units); clamp the stepper to it.
- `POST /cart/items { variantId, quantity?(=1) }` →201 snapshot. `PATCH /cart/items/:itemId { quantity }` (absolute).
- `DELETE /cart/items/:itemId`. `POST /cart/coupon { couponCode }`. `DELETE /cart/coupon`.
- `POST /cart/save-for-later/:itemId` → snapshot + `{ moved:"wishlist"|"soft_flag" }`.
- `POST /cart/merge { guestSessionToken }` (hard auth) → `{ mergedItems, movedItems, cart }`.

## Checkout & Orders (customer auth)

- `POST /checkout` — header **`Idempotency-Key: <uuid>` required**. body `{ shippingAddressId, paymentMethod:
  "cod"|"bkash"|"sslcommerz", customerNote?, perVendorNotes? }`. → 201 `{ order, subOrders(raw), paymentSessionUrl|null,
  paymentStatus:"pending"|"pending_verification" }`. **Only `cod` works**; bkash/sslcommerz → NOT_IMPLEMENTED.
  Errors: `CART_EMPTY`, `CART_ITEM_OUT_OF_STOCK`, COD blocklist (409).
- `GET /orders?limit&placedAfter` → **array** of `Order & { summary:{ itemCount, subOrderCount, vendorNames[],
  firstThumbnailMediaId } }`. NOT meta-paginated.
- `GET /orders/:id` → `OrderView = Order & { subOrders:[ SubOrder & { items:HydratedOrderItem[], vendorName } ] }`.
  Order = `{ id, orderNumber, subtotalPaisa, vatPaisa, shippingTotalPaisa, discountPaisa, grandTotalPaisa, currency,
  shippingAddressId, customerNote, placedAt, cancelledAt, cancelledReason }`. item = `{ id, titleSnapshot,
  imageUrlSnapshot(/v1/media/..), attributesSnapshot, skuSnapshot, quantity, unitPricePaisa, lineTotalPaisa,
  productSlug, thumbnailMediaId }`.
- `GET /orders/:id/tracking` → `{ orderNumber, subOrders:[{ subOrderNumber, vendorId, status, itemsCount,
  shipment:{ status, arrivedAtHub, dispatchedAt, deliveredAt, events:[{at,eventType,actorType,notes}], legs:[...] }|null }] }`.
- `POST /orders/:id/cancel { reason }` → OrderView. Only while every sub-order is `placed`/`vendor_confirmed`.
- **SubOrder states (10)**: placed → vendor_confirmed → packed → at_hub → ready_to_dispatch → dispatched →
  out_for_delivery → delivered; exits cancelled / returned. No parent-order status column.

## Reviews & Q&A

- `GET /products/:id/reviews?limit` → `{ reviews:[{ id, userId, rating, title, body, recommend, helpfulCount,
  createdAt, reviewerName, media:[{ url, mediaType, position }], response:{ vendorId, body, createdAt }|null }] }`.
  No aggregate here — use product.ratingAverage/ratingCount.
- `POST /products/:id/reviews { productId, subOrderId, rating, title?, body?, recommend?, mediaIds? }` (verified purchase).
- `POST /reviews/:id/helpful { isHelpful }` → `{ helpfulCount }`.
- `GET /products/:id/questions?limit` → **array** `[{ id, body, createdAt, answers:[{ body, responderRole, helpfulCount,
  createdAt }] }]`. `POST /products/:id/questions { body }`. `POST /questions/:id/answers { body }`.
- `GET /vendors/:id/reviews` → array of store reviews `{ rating, body, helpfulCount, reviewerName }`.

## Engagement (customer auth)

- `GET /wishlist?limit(=50)` → array `{ productId, productTitle, productSlug, productStatus, vendorId, thumbnailMediaId,
  minPricePaisa, brandName, vendorName }`. `POST /wishlist/:productId` (201). `DELETE /wishlist/:productId` → `{ removed }`.
- `GET /follow` → array `{ vendorId, storeName, storeSlug, storeLogoUrl, ratingAverage }`.
  `POST /follow/store/:vendorId { notificationsEnabled? }`. `DELETE /follow/store/:vendorId`.
- `GET /me/recently-viewed?limit(=20)` → array (prefer `thumbnailMediaId`). `POST /me/recently-viewed/:productId`.

## Account / me (customer auth)

- `GET /me` → `{ id, email, phone, userType, isEmailVerified, isPhoneVerified, status, lastLoginAt,
  profile:{ fullName, dateOfBirth, gender, photoUrl, defaultAddressId, twoFactorEnabled }|null }`.
- `PATCH /me { fullName?, dateOfBirth?, gender?, photoUrl }` (photoUrl effectively required by schema).
- `GET /me/addresses` → Address[] `{ id, label, recipientName, recipientPhone, division, district, upazila, unionName,
  postcode, streetAddress, latitude, longitude, isDefault }`. `POST` (201), `PATCH /:id`, `DELETE /:id` (204),
  `POST /:id/default` → `{ id, isDefault:true }`.
- `GET /me/notifications?cursor&limit&unreadOnly` → **meta-paginated** `{ id, channel, category, templateKey, payload,
  status, readAt, createdAt }`. `GET /me/notifications/unread-count` → `{ count }`.
  `POST /me/notifications/:id/read`, `POST /me/notifications/read-all` → `{ count }`.
- `GET /me/notification-preferences`, `PATCH` → `{ emailMarketing, smsMarketing, pushMarketing, pushChatReplies }`.
- `GET /wallet` → `{ balancePaisa, currency, isFrozen, recentTransactions:[{ deltaPaisa, balanceAfterPaisa, kind, note,
  createdAt }] }`. `GET /wallet/transactions?limit&cursor` → `{ items, nextCursor, hasMore }`.
- `POST /me/media/upload` (multipart `file` + `ownerType`) → `{ id, urls:{ original, thumbnail, card, hero } }`.

## Content (public)

- `GET /homepage` → `{ blocks:[{ id, kind:"banner"|"carousel"|"curated_collection"|"category_grid"|"vendor_spotlight",
  sortOrder, title, config }] }`. config holds RAW ids (imageMediaId/productIds/categoryIds/vendorIds). **Seed creates NO
  blocks → `{ blocks: [] }`** ⇒ home must have a designed fallback (categories from /categories, rails from
  /me/recommendations/home + /products).
- `GET /pages/:slug` → `{ slug, title, body(markdown), version }`. Seeded: about, terms, privacy, faq. 404 if unpublished.
