import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { BRAND } from "@/lib/brand";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Marketplace",
    // Only evergreen routes here (/shop and its query variants) — a hardcoded
    // /category/<slug> 404s on catalogs whose seeded slugs differ.
    links: [
      { label: "All products", href: "/shop" },
      { label: "Flash deals", href: "/shop?sale=1" },
      { label: "New arrivals", href: "/shop?sort=newest" },
      { label: "Best sellers", href: "/shop?sort=best_selling" },
    ],
  },
  {
    heading: "For sellers",
    links: [
      { label: "Become a seller", href: "/pages/about" },
      { label: "Seller handbook", href: "/pages/faq" },
      { label: "Commission rates", href: "/pages/terms" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Track order", href: "/account/orders" },
      { label: "Returns & refunds", href: "/pages/terms" },
      { label: "Payment methods", href: "/pages/faq" },
      { label: "Contact us", href: "/pages/about" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto bg-[oklch(0.18_0.045_262)] text-[oklch(0.85_0.015_255)]">
      <div className="wrap py-11">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          <div>
            <Logo light size="sm" />
            <p className="mt-3 font-display text-base font-bold text-white">
              {BRAND.tagline}
            </p>
            <p className="mt-2 max-w-xs text-13 leading-relaxed opacity-65">
              Bangladesh&apos;s marketplace for verified local sellers. Cash on
              delivery, nationwide shipping, 7-day easy returns.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="mb-3.5 text-11 font-extrabold uppercase tracking-[0.1em] text-white opacity-55">
                {col.heading}
              </h4>
              <ul className="flex flex-col gap-2.5 text-13">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="opacity-90 transition-opacity hover:opacity-100">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-9 flex flex-col justify-between gap-2 border-t border-white/10 pt-4 text-xs opacity-55 sm:flex-row">
          <span>© {new Date().getFullYear()} {BRAND.name}. Dhaka, Bangladesh</span>
          <span>
            <span className="bn">বাংলা</span> · English &nbsp;·&nbsp;{" "}
            <span className="bn">৳</span> BDT
          </span>
        </div>
      </div>
    </footer>
  );
}
