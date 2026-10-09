# Cartivo brand

Cartivo is the customer-facing brand for this Bangladesh marketplace.

## Identity

- Name: **Cartivo**
- Tagline: **Your everyday finds, all together.**
- Core colors: deep blue `#1E2A6E` and amber `#F5B82E`.
- Wordmark: Cartivo in Bricolage Grotesque, extra bold, with tight letter spacing.
- Symbol: a cart-shaped C with amber wheels and a forward accent.

## Assets

- `public/brand/cartivo-mark.png`: transparent 256 × 256 blue/amber logo symbol.
- `public/brand/cartivo-mark-original.png`: full-resolution generated source art.
- `app/favicon.ico`: 16, 32, 48 and 64 px browser icons.
- `app/icon.png`: 512 × 512 application icon.
- `app/apple-icon.png`: 180 × 180 icon with an opaque white background.
- `app/opengraph-image.tsx`: 1200 × 630 social preview with the symbol, brand name and tagline.

The shared `Logo` component pairs the symbol with a typeset wordmark for crisp text at every size. Desktop navigation and the mobile menu use the blue and amber symbol; the mobile header and footer render the same artwork in crisp white with a CSS filter. The name, tagline, metadata copy and logo path live in `lib/brand.ts`. The social preview uses the bundled extra-bold Bricolage Grotesque font in `assets/brand/`, distributed under the accompanying SIL Open Font License.

Set `NEXT_PUBLIC_SITE_URL` to the actual storefront origin when deploying. It supplies the metadata base and the local profile-placeholder URL. Vercel's production origin is used when available; otherwise the development fallback is `http://localhost:3000`. No Cartivo domain is assumed.

Browser storage retains its legacy namespace so existing carts, session hints, assistant conversations and order celebration state survive the rebrand. The API host, payment providers and vendor identities remain operational configuration and independent brands. Admin-managed CMS text and uploaded banners are owned by the backend and should be updated there if they contain previous branding.

## Generation

Generated using the built-in image generation tool with a transparent background. Runtime-sized images and favicon frames were downsampled from the generated sources while preserving alpha; the Apple icon uses a white background.

### Original symbol prompt

```text
Use case: logo-brand
Asset type: production logo symbol for Cartivo, a modern ecommerce marketplace in Bangladesh; used beside a typeset Cartivo wordmark in navigation and alone as the favicon.
Primary request: Design one polished, memorable shopping-cart monogram inspired by the letter C. A bold rounded deep navy-blue C-shaped shopping-cart basket with a short handle and two simple amber circular wheels; a small amber accent at the open end suggests forward movement. Make it feel friendly, confident, and clean. Prioritize a clear silhouette and few solid shapes that remain legible at 24 pixels.
Style/medium: flat vector-like brand design, crisp edges, solid fills.
Composition: one centered standalone symbol filling most of a square canvas with modest even padding.
Color palette: deep blue #1E2A6E and warm amber #F5B82E only.
Scene/backdrop: genuine transparent background.
Constraints: symbol only, no lettering, no words, no tagline, no mockup, no surrounding square tile, no gradients, no shadows, no textures, no watermark.
```
