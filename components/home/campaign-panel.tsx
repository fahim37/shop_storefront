import Link from "next/link";
import { ArrowRight, Ticket, Truck } from "lucide-react";
import { ProductGrid } from "@/components/product/product-grid";
import type { CardProduct } from "@/lib/api/card";

/* ----------------------------------------------------------------------------
 * Campaign panel — Daraz-style "monthly bazar" section: a branded rail on the
 * left (campaign mark + coupon + free-delivery perk) and a grid of product
 * cards on the right, all inside one deep-blue panel. Server-compatible (no
 * client JS). Renders nothing without products so the homepage stays clean on
 * an empty catalog.
 * ------------------------------------------------------------------------- */

export interface CampaignPanelProps {
  products: CardProduct[];
  /** Campaign heading, e.g. "Mega Bazar". */
  title?: string;
  subtitle?: string;
  couponCode?: string;
  ctaHref?: string;
}

export function CampaignPanel({
  products,
  title = "Mega Bazar",
  subtitle = "Deals of the month",
  couponCode = "WELCOME100",
  ctaHref = "/search?q=",
}: CampaignPanelProps) {
  if (products.length === 0) return null;

  return (
    <section className="wrap">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-blue-deep p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[230px_1fr] lg:gap-5">
          {/* Branded rail */}
          <div className="flex flex-row flex-wrap items-center gap-3 lg:flex-col lg:items-stretch lg:justify-center lg:gap-4 lg:py-4">
            <div className="min-w-0 flex-1 lg:flex-none lg:text-center">
              <span className="inline-block -rotate-2 rounded-md bg-amber px-3 py-1 font-display text-[13px] font-extrabold tracking-wide text-blue-deep shadow-[2.5px_2.5px_0_oklch(0.3_0.12_262)]">
                GCL
              </span>
              <h2 className="mt-2.5 font-display text-2xl font-extrabold uppercase leading-none tracking-tight text-white lg:text-[28px]">
                {title}
              </h2>
              <p className="mt-1 text-[12.5px] font-semibold text-white/70">
                {subtitle}
              </p>
            </div>

            {/* Coupon card */}
            <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
              <Ticket className="size-7 shrink-0 text-red" strokeWidth={1.6} />
              <span className="min-w-0">
                <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-sub">
                  Use coupon*
                </span>
                <b className="block truncate font-display text-base font-extrabold tracking-wide text-red">
                  &lsquo;{couponCode}&rsquo;
                </b>
              </span>
            </div>

            {/* Free delivery card */}
            <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
              <Truck className="size-7 shrink-0 text-green" strokeWidth={1.6} />
              <span className="min-w-0">
                <b className="block text-[13px] font-extrabold leading-tight text-ink">
                  Free delivery
                </b>
                <span className="block truncate text-[11px] font-semibold text-sub">
                  Dhaka orders over <span className="bn">৳</span>1,500
                </span>
              </span>
            </div>

            <Link
              href={ctaHref}
              className="hidden items-center justify-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-[12.5px] font-extrabold text-white transition-colors hover:bg-white/20 lg:inline-flex"
            >
              Shop all deals <ArrowRight className="size-3.5" strokeWidth={2.6} />
            </Link>

            <p className="hidden text-center text-[10px] font-semibold text-white/45 lg:block">
              *Conditions apply
            </p>
          </div>

          {/* Product cards */}
          <div className="min-w-0">
            <ProductGrid products={products.slice(0, 8)} cols={4} />
          </div>
        </div>
      </div>
    </section>
  );
}
