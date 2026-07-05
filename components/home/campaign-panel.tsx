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
  id?: string;
  /** Campaign heading, e.g. "Mega Bazar". */
  title?: string;
  subtitle?: string;
  couponCode?: string;
  ctaHref?: string;
}

export function CampaignPanel({
  products,
  id,
  title = "Mega Bazar",
  subtitle = "Deals of the month",
  couponCode = "WELCOME100",
  ctaHref = "/shop?sort=best_selling",
}: CampaignPanelProps) {
  if (products.length === 0) return null;

  return (
    <section id={id} className="wrap scroll-mt-[170px] md:scroll-mt-[190px]">
      <div className="-mx-4 overflow-hidden bg-gradient-to-br from-primary to-blue-deep p-4 sm:mx-0 sm:rounded-2xl sm:p-5 sm:shadow-[var(--shadow-card)]">
        <div className="grid gap-4 lg:grid-cols-[230px_1fr] lg:gap-5">
          {/* Branded rail */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-col lg:items-stretch lg:justify-center lg:gap-4 lg:py-4">
            <div className="min-w-0 sm:col-span-2 lg:text-center">
              <span className="inline-block -rotate-2 rounded-md bg-amber px-2.5 py-0.5 font-display text-[11px] font-extrabold tracking-wide text-blue-deep shadow-[2.5px_2.5px_0_oklch(0.3_0.12_262)] sm:px-3 sm:py-1 sm:text-[13px]">
                GCL
              </span>
              <h2 className="mt-2 font-display text-lg font-extrabold uppercase leading-none tracking-tight text-white sm:mt-2.5 sm:text-2xl lg:text-[28px]">
                {title}
              </h2>
              <p className="mt-0.5 text-[12px] font-semibold text-white/70 sm:mt-1 sm:text-[12.5px]">
                {subtitle}
              </p>
            </div>

            {/* Coupon card */}
            <div className="flex items-center gap-2.5 rounded-xl bg-white px-3.5 py-2.5 shadow-sm sm:gap-3 sm:px-4 sm:py-3">
              <Ticket className="size-6 shrink-0 text-red sm:size-7" strokeWidth={1.6} />
              <span className="min-w-0">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-sub sm:text-[10.5px]">
                  Use coupon*
                </span>
                <b className="block truncate font-display text-sm font-extrabold tracking-wide text-red sm:text-base">
                  &lsquo;{couponCode}&rsquo;
                </b>
              </span>
            </div>

            {/* Free delivery card */}
            <div className="flex items-center gap-2.5 rounded-xl bg-white px-3.5 py-2.5 shadow-sm sm:gap-3 sm:px-4 sm:py-3">
              <Truck className="size-6 shrink-0 text-green sm:size-7" strokeWidth={1.6} />
              <span className="min-w-0">
                <b className="block text-[12px] font-extrabold leading-tight text-ink sm:text-[13px]">
                  Free delivery
                </b>
                <span className="block truncate text-[10.5px] font-semibold text-sub sm:text-[11px]">
                  Dhaka orders over <span className="bn">৳</span>1,500
                </span>
              </span>
            </div>

            <Link
              href={ctaHref}
              className="flex items-center justify-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-[12px] font-extrabold text-white transition-colors hover:bg-white/20 sm:col-span-2 sm:py-2 sm:text-[12.5px] lg:inline-flex"
            >
              Shop all deals <ArrowRight className="size-3.5" strokeWidth={2.6} />
            </Link>

            <p className="hidden text-center text-[10px] font-semibold text-white/45 lg:block">
              *Conditions apply
            </p>
          </div>

          {/* Product cards */}
          <div className="min-w-0">
            <ProductGrid products={products.slice(0, 8)} cols={4} flushRows />
          </div>
        </div>
      </div>
    </section>
  );
}
