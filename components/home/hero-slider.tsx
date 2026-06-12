"use client";

import * as React from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ----------------------------------------------------------------------------
 * Hero slider — 4 promo slides, auto-advances every 5s (pauses on hover /
 * interaction, respects prefers-reduced-motion). Built on embla so it swipes
 * natively on touch. Slides are pure design-token compositions, so recoloring
 * the brand recolors the hero.
 * ------------------------------------------------------------------------- */

type Slide = {
  key: string;
  badge: string;
  /** Headline lines; the last fragment is rendered in the slide's accent color. */
  title: [string, string];
  sub: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  /** Slide surface + decorative blob colors (token-based). */
  surface: string;
  blobA: string;
  blobB: string;
  badgeClass: string;
  accentClass: string;
  primaryVariant: "accent" | "navy";
  secondaryVariant: "line" | "soft";
  textClass: string;
  /** Light surface → render dots/arrows in dark ink for contrast. */
  light?: boolean;
};

const SLIDES: Slide[] = [
  {
    key: "deals",
    badge: "DEALS WEEK · UP TO 50% OFF",
    title: ["Big brands.", "Local prices."],
    sub: "36,000+ products from 1,200 verified Bangladeshi sellers — cash on delivery, everywhere.",
    primary: { label: "Shop flash sale", href: "/search?q=flash" },
    secondary: { label: "Browse stores", href: "/search?q=" },
    surface: "bg-primary",
    blobA: "bg-[oklch(0.56_0.19_258)]",
    blobB: "bg-[oklch(0.42_0.2_261)]",
    badgeClass: "bg-amber text-blue-deep shadow-[3px_3px_0_oklch(0.3_0.12_262)]",
    accentClass: "text-amber",
    primaryVariant: "accent",
    secondaryVariant: "line",
    textClass: "text-white",
  },
  {
    key: "audio",
    badge: "AUDIO FEST · FROM ৳1,490",
    title: ["Sound on.", "World off."],
    sub: "Headphones, earbuds & speakers from SoundMax and Pulse — official warranty, doorstep delivery.",
    primary: { label: "Shop electronics", href: "/category/electronics" },
    secondary: { label: "Audio deals", href: "/category/audio" },
    surface: "bg-navy",
    blobA: "bg-[oklch(0.3_0.09_262)]",
    blobB: "bg-[oklch(0.36_0.12_259)]",
    badgeClass: "bg-amber text-blue-deep shadow-[3px_3px_0_oklch(0.18_0.05_262)]",
    accentClass: "text-amber",
    primaryVariant: "accent",
    secondaryVariant: "line",
    textClass: "text-white",
  },
  {
    key: "fashion",
    badge: "NEW SEASON DROP",
    title: ["Wear the trend.", "Pay local."],
    sub: "Men's & women's fashion from Urban Threads — fresh styles every week, easy 7-day returns.",
    primary: { label: "Shop fashion", href: "/category/fashion" },
    secondary: { label: "Women's picks", href: "/category/women" },
    surface: "bg-amber",
    blobA: "bg-[oklch(0.86_0.13_82)]",
    blobB: "bg-[oklch(0.74_0.15_74)]",
    badgeClass: "bg-blue-deep text-amber shadow-[3px_3px_0_oklch(0.62_0.13_75)]",
    accentClass: "text-blue-strong",
    primaryVariant: "navy",
    secondaryVariant: "soft",
    textClass: "text-blue-deep",
    light: true,
  },
  {
    key: "welcome",
    badge: "WELCOME OFFER",
    title: ["৳100 off your", "first order."],
    sub: "Use voucher WELCOME100 at checkout — cash on delivery across all 64 districts.",
    primary: { label: "Start shopping", href: "/search?q=" },
    secondary: { label: "Sign in", href: "/account" },
    surface: "bg-blue-deep",
    blobA: "bg-[oklch(0.36_0.12_260)]",
    blobB: "bg-[oklch(0.26_0.08_261)]",
    badgeClass: "bg-amber text-blue-deep shadow-[3px_3px_0_oklch(0.2_0.06_262)]",
    accentClass: "text-amber",
    primaryVariant: "accent",
    secondaryVariant: "line",
    textClass: "text-white",
  },
];

const AUTOPLAY_MS = 5000;

export function HeroSlider() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 28 });
  const [selected, setSelected] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const onLight = Boolean(SLIDES[selected]?.light);

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
    if (!emblaApi || paused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const id = window.setInterval(() => emblaApi.scrollNext(), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [emblaApi, paused, selected]);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl"
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
          {SLIDES.map((s, i) => (
            <div
              key={s.key}
              className="min-w-0 flex-[0_0_100%]"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${SLIDES.length}`}
            >
              <div
                className={cn(
                  "relative flex min-h-[280px] flex-col justify-center overflow-hidden px-6 py-10 sm:px-12 md:min-h-[340px]",
                  s.surface,
                  s.textClass,
                )}
              >
                <div
                  className={cn(
                    "absolute -right-24 -top-24 size-[420px] rounded-full",
                    s.blobA,
                  )}
                />
                <div
                  className={cn(
                    "absolute -bottom-40 right-44 size-[300px] rounded-full",
                    s.blobB,
                  )}
                />
                <div className="relative z-10 max-w-xl">
                  <span
                    className={cn(
                      "inline-block -rotate-2 rounded-md px-3.5 py-1.5 font-display text-sm font-extrabold tracking-wide",
                      s.badgeClass,
                    )}
                  >
                    {s.badge}
                  </span>
                  <h2 className="mt-5 font-display text-4xl font-extrabold uppercase leading-[1.02] tracking-tight sm:text-5xl md:text-[52px]">
                    {s.title[0]}
                    <br />
                    <em className={cn("not-italic", s.accentClass)}>{s.title[1]}</em>
                  </h2>
                  <p className="mt-4 max-w-md text-sm opacity-85 sm:text-[15px]">
                    {s.sub}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <Button asChild variant={s.primaryVariant} size="lg">
                      <Link href={s.primary.href}>
                        {s.primary.label}{" "}
                        <ArrowRight className="size-4" strokeWidth={2.4} />
                      </Link>
                    </Button>
                    {s.secondary && (
                      <Button asChild variant={s.secondaryVariant} size="lg">
                        <Link href={s.secondary.href}>{s.secondary.label}</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Arrows — fade in on hover (always visible on touch via media query) */}
      <button
        type="button"
        aria-label="Previous slide"
        onClick={() => emblaApi?.scrollPrev()}
        className={cn(
          "absolute left-3 top-1/2 z-20 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full opacity-0 backdrop-blur-sm transition-opacity focus-visible:opacity-100 group-hover:opacity-100 md:flex",
          onLight
            ? "bg-blue-deep/15 text-blue-deep hover:bg-blue-deep/25"
            : "bg-white/15 text-white hover:bg-white/30",
        )}
      >
        <ChevronLeft className="size-5" strokeWidth={2.4} />
      </button>
      <button
        type="button"
        aria-label="Next slide"
        onClick={() => emblaApi?.scrollNext()}
        className={cn(
          "absolute right-3 top-1/2 z-20 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full opacity-0 backdrop-blur-sm transition-opacity focus-visible:opacity-100 group-hover:opacity-100 md:flex",
          onLight
            ? "bg-blue-deep/15 text-blue-deep hover:bg-blue-deep/25"
            : "bg-white/15 text-white hover:bg-white/30",
        )}
      >
        <ChevronRight className="size-5" strokeWidth={2.4} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.key}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            aria-current={selected === i}
            onClick={() => emblaApi?.scrollTo(i)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              selected === i
                ? cn("w-6 shadow-sm", onLight ? "bg-blue-deep" : "bg-white")
                : cn(
                    "w-2",
                    onLight
                      ? "bg-blue-deep/35 hover:bg-blue-deep/55"
                      : "bg-white/45 hover:bg-white/70",
                  ),
            )}
          />
        ))}
      </div>
    </div>
  );
}
