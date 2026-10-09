/** Cartivo's shared identity and locally bundled logo assets. */
export const BRAND = {
  name: "Cartivo",
  tagline: "Your everyday finds, all together.",
  title: "Cartivo — Bangladesh's marketplace",
  description:
    "Shop fashion, electronics and everyday essentials from verified Bangladeshi sellers on Cartivo. Cash on delivery, nationwide shipping and easy returns.",
  mark: "/brand/cartivo-mark.png",
} as const;

/** Set NEXT_PUBLIC_SITE_URL to the storefront's actual origin when deploying. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");
