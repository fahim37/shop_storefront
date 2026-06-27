"use client";

import * as React from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HomepageCarouselSlide } from "@/lib/api/types";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

/* ----------------------------------------------------------------------------
 * Hero banners — Daraz-style hero driven by admin-managed homepage blocks.
 * Left: big image carousel (auto-advances every 5s, pauses on hover /
 * interaction, respects prefers-reduced-motion — same embla pattern as
 * HeroSlider). Right (lg+): up to 3 banner tiles stacked to match the slider
 * height; below the slider as a 2-col grid on mobile. The uploaded artwork
 * carries its own text, so slides/tiles render images only (captions become
 * alt text for screen readers).
 * ------------------------------------------------------------------------- */

export interface HeroBannerTile {
  imageMediaId: string;
  /** Absolute URL or app-relative path ("/category/..."). */
  linkUrl?: string;
  altText?: string;
  title?: string;
}

export interface HeroBannersProps {
  carousel: { slides: HomepageCarouselSlide[] } | null;
  banners: HeroBannerTile[];
}

const AUTOPLAY_MS = 5000;

/** Internal links via next/link; external via a same-tab <a>; none → <div>. */
function TileLink({
  href,
  label,
  className,
  children,
}: {
  href?: string;
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (!href) return <div className={className}>{children}</div>;
  if (href.startsWith("/")) {
    return (
      <Link href={href} aria-label={label} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} aria-label={label} className={className}>
      {children}
    </a>
  );
}

export function HeroBanners({ carousel, banners }: HeroBannersProps) {
  const slides = carousel?.slides ?? [];
  const tiles = banners.slice(0, 4);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 28 });
  const [selected, setSelected] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  // Track the active slide for the dots.
  React.useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  // Autoplay — paused on hover/focus and disabled for reduced-motion users.
  React.useEffect(() => {
    if (!emblaApi || paused || slides.length < 2) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const id = window.setInterval(() => emblaApi.scrollNext(), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [emblaApi, paused, selected, slides.length]);

  if (slides.length === 0 && tiles.length === 0) return null;

  return (
    <div className={cn("grid gap-2", tiles.length > 0 && "lg:grid-cols-4")}>
      {/* Slider */}
      {slides.length > 0 && (
        <div
          className={cn(
            "group relative overflow-hidden rounded-b-lg rounded-t-none",
            tiles.length > 0 && "lg:col-span-3",
          )}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
          role="region"
          aria-roledescription="carousel"
          aria-label="Featured promotions"
        >
          <div ref={emblaRef} className="overflow-hidden">
            <div className="flex touch-pan-y">
              {slides.map((s, i) => (
                <div
                  key={`${s.imageMediaId}-${i}`}
                  className="min-w-0 flex-[0_0_100%]"
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${slides.length}`}
                >
                  <TileLink
                    href={s.linkUrl}
                    label={s.caption}
                    className="block aspect-[21/9] w-full lg:aspect-[2/1]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaUrl(s.imageMediaId, "hero")!}
                      alt={s.caption ?? `Promotion ${i + 1}`}
                      loading={i === 0 ? "eager" : "lazy"}
                      decoding="async"
                      draggable={false}
                      className="size-full object-cover bg-gradient-to-br from-blue-soft to-surface"
                    />
                  </TileLink>
                </div>
              ))}
            </div>
          </div>

          {/* Arrows — fade in on hover (hidden on small screens; swipe instead) */}
          {slides.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous slide"
                onClick={() => emblaApi?.scrollPrev()}
                className="absolute left-3 top-1/2 z-20 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-white/35 focus-visible:opacity-100 group-hover:opacity-100 md:flex"
              >
                <ChevronLeft className="size-5" strokeWidth={2.4} />
              </button>
              <button
                type="button"
                aria-label="Next slide"
                onClick={() => emblaApi?.scrollNext()}
                className="absolute right-3 top-1/2 z-20 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-white/35 focus-visible:opacity-100 group-hover:opacity-100 md:flex"
              >
                <ChevronRight className="size-5" strokeWidth={2.4} />
              </button>

              {/* Dots — active dot stretches into a pill */}
              <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
                {slides.map((s, i) => (
                  <button
                    key={`${s.imageMediaId}-${i}`}
                    type="button"
                    aria-label={`Go to slide ${i + 1}`}
                    aria-current={selected === i}
                    onClick={() => emblaApi?.scrollTo(i)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      selected === i
                        ? "w-6 bg-white shadow-sm"
                        : "w-2 bg-white/45 hover:bg-white/70",
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Banner tiles — Daraz-style bento beside the slider, DESKTOP ONLY
          (mobile shows just the main slider to keep the top of the page
          tight). Wide tiles span both columns; with 3–4 tiles the LAST TWO
          share a row half/half:
            1 tile  → [full]
            2 tiles → [full, full]
            3 tiles → [full, half+half]
            4 tiles → [full, full, half+half]
          Images are absolutely positioned so the tiles contribute ZERO
          intrinsic height — the slider's aspect ratio alone sets the hero
          height and every tile crops (object-cover) into its cell. Without
          this the natural image heights stretch the row and leave a hole
          under the slider. */}
      {tiles.length > 0 && (
        <div
          className={cn(
            "hidden gap-2 lg:grid lg:h-full lg:min-h-0 lg:grid-cols-2",
            tiles.length === 1 && "lg:grid-rows-1",
            tiles.length === 2 && "lg:grid-rows-2",
            tiles.length === 3 && "lg:grid-rows-2",
            tiles.length === 4 && "lg:grid-rows-3",
          )}
        >
          {tiles.map((b, i) => {
            // Every tile is full-width except the final pair (when 3+).
            const half = tiles.length >= 3 && i >= tiles.length - 2;
            return (
              <TileLink
                key={`${b.imageMediaId}-${i}`}
                href={b.linkUrl}
                label={b.altText ?? b.title}
                className={cn(
                  "group/tile relative block h-full min-h-0 overflow-hidden",
                  i === 0 ? "rounded-b-md rounded-t-none" : "rounded-md",
                  half ? "col-span-1" : "col-span-2",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(b.imageMediaId, "card")!}
                  alt={b.altText ?? b.title ?? `Promotion banner ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="absolute inset-0 size-full object-cover bg-gradient-to-br from-blue-soft to-surface transition-transform duration-300 group-hover/tile:scale-[1.02]"
                />
              </TileLink>
            );
          })}
        </div>
      )}
    </div>
  );
}
