# BUILD KIT — storefront page authoring cheat-sheet

Use ONLY what's below. Do not add npm deps. Match the "Bold Bazar" look (deep blue `--primary`,
amber `--accent`, navy, Sora display font). All money is paisa strings → `formatPaisa`. All images are
media ids → `<MediaImage>`. Read `API_CONTRACT.md` for exact response shapes; types live in `lib/api/types.ts`.

## Framework rules (Next.js 16, App Router)
- `params`/`searchParams` are **Promises** — `const { slug } = await params;` in async Server Components.
- SEO pages (PDP, category, CMS) = **Server Components** fetching via `lib/api/server` fetchers; export
  `revalidate` + `generateMetadata`; call `notFound()` on `NotFoundError`. Put interactive bits in client islands.
- Any client component using `useSearchParams()` (e.g. `<SortSelect>`, `useFilterParams`) MUST be inside a
  `<Suspense>` boundary, or make the whole page `"use client"` and wrap the body. Prefer wrapping the page's
  client content in `<React.Suspense fallback={...}>`.
- `"use client"` at top of any file using hooks/state/events.
- Toast: `import { toast } from "@/components/ui/sonner"` → `toast.success("…", { description })` / `toast.error(msg)`.
- Errors: `import { ApiError } from "@/lib/api/http"` → `err instanceof ApiError ? err.message : "…"`.
- Auth gate for user pages: `const { status, openAuth } = useAuth()` (`@/lib/auth/auth-context`). Account pages are
  already wrapped by an auth-gating `AccountShell` layout — don't re-gate inside them.

## Utilities
- `cn(...)` from `@/lib/utils`.
- `@/lib/format`: `formatPaisa(p)`, `discountPercent(price, compare)`, `formatCompact(n)`, `formatRating(n)`,
  `formatDate(iso)`, `formatDateTime(iso)`, `formatRelative(iso)`, `initials(name)`, `sumPaisa(arr)`.
- `@/lib/media`: `mediaUrl(id, variant?)`, `resolveMediaPath(path)`.

## Tailwind tokens (utility classes)
Colors: `bg-primary text-primary` (blue), `bg-accent text-accent-foreground` (amber/blue-deep), `bg-navy`,
`bg-blue-deep`, `bg-blue-soft`, `bg-muted`/`bg-surface`, `text-ink text-sub text-faint`, `text-amber-deep`,
`text-green bg-green-soft`, `text-red`, `border-border`. Fonts: add `font-display` for Sora headings.
Helpers: `.wrap` (centered 1280 rail w/ padding), `.bn` (Bengali font for ৳/বাংলা/ঈদ), `.skeleton`, `.no-scrollbar`.
Radii `rounded-xl/2xl`; shadows `shadow-[var(--shadow-card)]`, `shadow-[var(--shadow-pop)]`,
`shadow-[var(--shadow-panel)]`. Animations: `animate-in fade-in-0 slide-in-from-*` (tw-animate-css) available.

## UI primitives (`@/components/ui/*`)
- `Button` — variants: `accent`(amber CTA) `primary`(blue) `navy` `outline`(blue outline) `soft`(neutral)
  `line`(on dark) `ghost` `destructive`; sizes `sm md lg xl icon icon-sm`; props `loading fullWidth asChild`.
  Use `<Button asChild><Link href>…</Link></Button>` for links.
- `Input` (`@/components/ui/input`), `Field` + `fieldMessageId` (`@/components/ui/field`), `Label`.
- `Badge` — variants `primary accent navy success sale outline muted`, sizes `sm md lg`.
- `Card, CardHeader, CardTitle, CardContent, CardFooter`.
- `Dialog*` (`@/components/ui/dialog`: Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose) — centered modal.
- `Sheet*` (`@/components/ui/sheet`: Sheet, SheetTrigger, SheetContent[side=right|left|bottom|top], SheetHeader,
  SheetTitle, SheetDescription, SheetFooter, SheetClose).
- `Tabs, TabsList, TabsTrigger, TabsContent`.
- `Accordion, AccordionItem, AccordionTrigger, AccordionContent` (Radix `type="single" collapsible`).
- `Select, SelectTrigger, SelectValue, SelectContent, SelectItem`.
- `Checkbox` (`onCheckedChange`), `RadioGroup, RadioGroupItem`, `Slider`.
- `DropdownMenu*`. `Tooltip, TooltipTrigger, TooltipContent` (Provider already mounted).
- `Avatar, AvatarImage, AvatarFallback`. `Separator`. `Skeleton`. `Spinner`.
- `EmptyState` props `{ icon, title, description, action }`.
- Brand atoms: `MediaImage` props `{ mediaId?|src?, variant?('card'), alt, className, sizes? }` (fills parent;
  branded placeholder when null). `Price` props `{ pricePaisa, comparePaisa?, showSave?, size?('sm'|'md'|'lg'|'xl') }`.
  `RatingStars` props `{ value, size?, precise? }`. `QuantityStepper` props `{ value, onChange, min?, max?, loading?, size?('sm'|'md') }`.

## Layout / product components
- `@/components/layout/breadcrumbs` → `<Breadcrumbs items={[{label, href?}]} />` ("Home" prepended).
- `@/components/layout/section-header` → `<SectionHeader title subtitle? linkLabel? linkHref? extra? />`.
- `@/components/product/product-card` → `<ProductCard product={CardProduct} />`, `<ProductCardSkeleton/>`.
- `@/components/product/product-grid` → `<ProductGrid products={CardProduct[]} cols={4|5} />`, `<ProductGridSkeleton count cols/>`.
- `@/lib/api/card` → `CardProduct` type + adapters `fromProductRow, fromSearchHit, fromRecHit, fromWishlist, fromRecentlyViewed`.
- `@/components/product/filters` → `<FilterSidebar brands? subcategories? showRating? />` (desktop),
  `<FilterSheet …/>` (mobile button+sheet), `<ActiveFilterChips brands? />`.
- `@/components/product/sort-select` → `<SortSelect/>` (writes `sort` URL param; search only).
- `@/lib/use-filters` → `useFilterParams()` → `{ get(key), setParams({k:v|null}), clearAll(), activeCount }`; `takaToPaisa(str)`.
- `@/components/product/buy-panel` → `<BuyPanel detail={ProductDetail} />` (variant pickers, qty, add-to-cart, buy-now, wishlist). USE THIS on the PDP.
- `@/lib/category-icons` → `categoryIcon(slug) => LucideIcon`.
- `@/lib/order-status` → `SUBORDER_STATUS[status] = {label, tone}`, `STATUS_TONE_CLASS[tone]`,
  `TRACKING_STEPS` (7 steps `{key,label,states[]}`), `currentStepIndex(status)`, `canCustomerCancel(status)`.

## Server fetchers (RSC only) — `@/lib/api/server`
`getProductBySlug(slug)`→ProductDetail · `getRelatedProducts(id)`→RecResponse · `getCategoryBySlug(slug)`→Category ·
`getCategoryTree()`→CategoryNode[] · `getCategoryBreadcrumbs(id)`→Category[] · `getCategoryAttributes(id)` ·
`getBrands()`→Brand[] · `getProductsPage(params)`→`{data,meta?}` · `getCmsPage(slug)`→CmsPage · `NotFoundError`.

## Client hooks (signatures)
- Catalog `@/lib/api/catalog`: `useProductsInfinite(params)` (pages: `{data:ProductCardRow[], meta?}`; `flattenProducts(pages)`),
  `useProduct(slug)`, `useRelatedProducts(id)`, `useCategoryTree()`, `useCategoryAttributes(id)`, `useBrands()`.
- Search `@/lib/api/search`: `useSearchInfinite(params, enabled)` (pages: `SearchResponse`; flatten `pages.flatMap(p=>p.items)`),
  `useAutocomplete(q)`, `recordSearchClick(searchQueryId, productId, position)`, `useHomeRecommendations()`, `useCartRecommendations(enabled)`.
  SearchParams: `{ q, sort?, categoryId?, brandId?, priceMinPaisa?, priceMaxPaisa?, rating?, limit? }`.
- Cart `@/lib/api/cart`: `useCart()`→`{cart, isLoading, …}`, `useCartCount()`, `useAddToCart()`, `useCartItemQuantity()`
  (→`setQuantity(itemId, qty, onError?)`; optimistic + debounced/coalesced stepper writes),
  `useRemoveCartItem()`, `useSaveForLater()`, `useApplyCoupon()`, `useRemoveCoupon()`. Mutations take/return per API.
- Orders `@/lib/api/orders`: `useOrders({limit?,placedAfter?})`→OrderListItem[], `useOrder(id)`→OrderView,
  `useOrderTracking(id)`→OrderTracking, `useCheckout()`, `useCancelOrder()`.
- Reviews `@/lib/api/reviews`: `useProductReviews(id)`→`{reviews}`, `useProductQuestions(id)`→Question[],
  `useSubmitReview()`, `useReviewHelpful(productId)`, `useAskQuestion(productId)`, `useAnswerQuestion(productId)`.
- Engagement `@/lib/api/engagement`: `useWishlist()`→WishlistItem[], `useToggleWishlist()`→`{isWishlisted(id), toggle(id), pending}`,
  `useRemoveWishlist()`, `useFollows()`, `useFollowStore()`, `useUnfollowStore()`, `useRecentlyViewed()`, `trackProductView(id)`.
- Account `@/lib/api/account`: `useMe()`→Me, `useUpdateProfile()` (input `{fullName?,dateOfBirth?,gender?,photoUrl}`),
  `useAddresses()`→Address[], `useCreateAddress()`, `useUpdateAddress()`(`{id,input}`), `useDeleteAddress()`,
  `useSetDefaultAddress()`, `useNotifications(unreadOnly?)` (infinite, pages `{data:Notification[],meta?}`),
  `useUnreadCount()`, `useMarkNotificationRead()`, `useMarkAllRead()`, `useNotificationPrefs()`,
  `useUpdateNotificationPrefs()`, `useWallet()`, `useUploadMedia()`.
- Auth `@/lib/auth/auth-context` `useAuth()`: `{ user, status, isAuthenticated, openAuth(view), logout(),
  requireAuth(fn), requestPasswordReset(identifier) }`. **There is NO authenticated change-password endpoint** —
  the change-password page should call `requestPasswordReset(user.email)` to email a reset link.

## Gotchas
- Orders list/detail/wishlist/addresses/reviews/questions are **bare arrays / single objects** (no `meta`).
- `useProductReviews` returns `{ reviews: Review[] }`. `useProductQuestions` returns `Question[]`.
- Submitting a review needs a `subOrderId` (verified purchase) — only offer it from a delivered order context;
  on the PDP, the review tab is **read-only** (list reviews + "Write a review" can deep-link to orders).
- Cart vendor groups have only `vendorId` (no store name) — label generically ("Store 1").
- Only `paymentMethod: "cod"` works at checkout (already handled in checkout page).
