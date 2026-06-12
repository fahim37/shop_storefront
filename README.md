# GCL — Storefront

Customer-facing storefront for the GCL multivendor marketplace (Bangladesh). Built to the **"Bold Bazar"**
design (deep blue + amber) and wired to the `store_backend` API.

**Stack:** Next.js 16 (App Router) · TypeScript strict · Tailwind v4 + shadcn-style primitives + Radix + lucide ·
TanStack Query (server state) · Zustand (ephemeral UI) · URL search params (filters/sort) · React Hook Form + Zod (auth).

## Getting started

```bash
# 1. Start the backend (in ../store_backend)
docker compose up -d            # postgres + redis + minio
npm install && npm run db:migrate && npm run db:seed
npm run dev                     # API on http://localhost:4000

# 2. Start the storefront
npm install
npm run dev                     # http://localhost:3000
```

Config: `.env.local` → `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:4000/v1`),
`NEXT_PUBLIC_GOOGLE_CLIENT_ID` (optional, enables Google sign-in).

The backend's `CORS_ORIGINS` must include `http://localhost:3000` (it already does).

## Architecture

- **Design tokens** — `app/globals.css`: a raw brand palette (oklch) → semantic tokens → Tailwind `@theme`.
  Change one variable to recolor the whole app. Fonts (Sora/Manrope/Noto Bengali) load via `next/font` in `app/layout.tsx`.
- **API layer** — `lib/api/`:
  - `http.ts` — typed fetch wrapper: injects the in-memory Bearer token, single-flight 401 refresh, unwraps `{ data }`.
  - `server.ts` — `server-only` fetchers for **public** catalog/content (used by Server Components for SEO + ISR).
  - `types.ts` — hand-authored types mirroring the backend (`API_CONTRACT.md`).
  - per-domain hooks: `catalog`, `search`, `cart`, `orders`, `reviews`, `engagement`, `account` (TanStack Query).
- **Money** — every `*Paisa` is a BDT-paisa **string**; format with `lib/format.formatPaisa` (BigInt-safe), never `Number()`.
- **Images** — backend returns media **ids**; `<MediaImage mediaId>` resolves `/v1/media/:id/:variant` (302 → presigned).
- **Cart** — server-owned; guests use an `X-Cart-Session` token (localStorage), merged into the user cart on login.
- **Auth** — access token in memory, refresh via httpOnly cookie; presented as an on-demand modal (no route walls).
- **Rendering** — public pages (home, PDP, category, CMS) are Server Components (SEO/ISR) with client islands for
  interactivity; cart/checkout/account are client-rendered and auth-gated.

## Routes

`/` home · `/category/[slug]` browse+filters · `/search` · `/product/[slug]` PDP · `/cart` · `/checkout` ·
`/account` (profile · orders · order tracking · wishlist · reviews · addresses · notifications · password) ·
`/pages/[slug]` CMS (about/terms/privacy/faq).

## Reference docs
- `API_CONTRACT.md` — exact backend request/response shapes used by every hook.
- `BUILD_KIT.md` — the component/hook/token catalogue pages are built against.

## Notes / known backend constraints
- Only `paymentMethod: "cod"` works today; bKash/SSLCommerz are shown as "coming soon".
- There is no authenticated change-password endpoint — the password page emails a reset link.
- There is no "list my reviews" endpoint — the reviews page surfaces delivered orders to review instead.
