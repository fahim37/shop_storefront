/**
 * Server renderers for every store-page section except `products` (which
 * needs hydrated card data — see products-block.tsx). Each renderer receives
 * its section plus the page theme and draws itself from the scoped
 * `--sp-*` CSS vars set by the page root.
 */
import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Facebook,
  Gift,
  Globe,
  Headphones,
  Heart,
  Instagram,
  Leaf,
  Medal,
  MessageCircle,
  Music2,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Twitter,
  Youtube,
  Zap,
} from "lucide-react";

import { mediaUrl } from "@/lib/media";
import { sanitizeRichText } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import type {
  StoreBannerSection,
  StoreButton,
  StoreDividerSection,
  StoreFaqSection,
  StoreFeatureIcon,
  StoreFeaturesSection,
  StoreGallerySection,
  StoreHeroSection,
  StoreImageWithTextSection,
  StoreInfoSection,
  StorePagePayload,
  StoreRichTextSection,
  StoreSectionStyle,
  StoreSocialLinksSection,
  StoreSocialPlatform,
  StoreTestimonialsSection,
  StoreTheme,
  StoreVideoSection,
} from "@/lib/api/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MessageStoreButton } from "@/components/store/message-store-button";
import { buttonStyles, readableOn, sectionBackground } from "@/components/store/store-theme";

/* ------------------------------- shell ----------------------------------- */

/**
 * Shared section frame: vertical padding, resolved background, and the
 * centered content container unless the section opted into full-bleed.
 */
export function SectionShell({
  style,
  fullBleedContent = false,
  children,
  id,
}: {
  style: StoreSectionStyle;
  /** True for sections that manage their own width (hero/banner). */
  fullBleedContent?: boolean;
  children: React.ReactNode;
  id?: string;
}) {
  const bg = sectionBackground(style);
  const inner =
    style.fullBleed || fullBleedContent ? (
      children
    ) : (
      <div className="wrap">{children}</div>
    );
  return (
    <section
      id={id}
      className={cn(
        style.hideOnMobile && "max-md:hidden",
        style.hideOnDesktop && "md:hidden",
      )}
      style={{
        paddingTop: style.paddingTop,
        paddingBottom: style.paddingBottom,
        backgroundColor: bg,
      }}
    >
      {inner}
    </section>
  );
}

/** Internal hrefs go through <Link>; external open in a new tab. */
function SmartLink({
  href,
  className,
  style,
  children,
}: {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className} style={style} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function CtaButton({
  button,
  theme,
  size = "md",
}: {
  button: StoreButton;
  theme: StoreTheme;
  size?: "md" | "lg";
}) {
  return (
    <SmartLink
      href={button.href}
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-transform duration-150 hover:scale-[1.03] active:scale-[0.98]",
        size === "lg" ? "px-6 py-3 text-15" : "px-4 py-2 text-sm",
      )}
      style={buttonStyles(theme, button.variant)}
    >
      {button.label}
    </SmartLink>
  );
}

/* ---------------------------- hero / banner ------------------------------- */

const ALIGN_ITEMS = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
} as const;

/**
 * Hero and promo banner share one renderer — same anatomy (image or accent
 * backdrop, overlay, aligned copy, CTAs), different scale.
 */
export function HeroBannerBlock({
  section,
  theme,
}: {
  section: StoreHeroSection | StoreBannerSection;
  theme: StoreTheme;
}) {
  const isHero = section.type === "hero";
  const image = mediaUrl(section.imageMediaId, "hero");
  const tone =
    section.textTone !== "auto"
      ? section.textTone
      : image
        ? "light"
        : readableOn(theme.accent) === "#ffffff"
          ? "light"
          : "dark";
  const buttons: StoreButton[] = isHero
    ? (section as StoreHeroSection).buttons
    : ([(section as StoreBannerSection).button].filter(Boolean) as StoreButton[]);

  return (
    <div
      className={cn("relative flex w-full overflow-hidden", ALIGN_ITEMS[section.align])}
      style={{
        minHeight: `min(${section.height}px, 80vh)`,
        background: image
          ? undefined
          : `linear-gradient(135deg, var(--sp-accent), color-mix(in srgb, var(--sp-accent) 55%, ${theme.foreground}))`,
        color: tone === "light" ? "#ffffff" : "#111111",
        borderRadius: section.style.fullBleed ? 0 : "var(--sp-radius)",
      }}
    >
      {image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt=""
            className="absolute inset-0 size-full object-cover"
            loading={isHero ? "eager" : "lazy"}
          />
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(0,0,0,${section.overlay / 100})` }}
          />
        </>
      ) : null}
      <div
        className={cn(
          "relative z-10 flex w-full flex-col justify-center gap-4 px-6 py-10 sm:px-10",
          ALIGN_ITEMS[section.align],
        )}
      >
        {section.heading ? (
          <h2
            className={cn(
              "max-w-3xl font-extrabold tracking-tight",
              isHero ? "text-3xl sm:text-5xl" : "text-xl sm:text-3xl",
            )}
          >
            {section.heading}
          </h2>
        ) : null}
        {section.subheading ? (
          <p className={cn("max-w-2xl opacity-90", isHero ? "text-15 sm:text-lg" : "text-sm sm:text-15")}>
            {section.subheading}
          </p>
        ) : null}
        {buttons.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-3">
            {buttons.map((b) => (
              <CtaButton key={b.id} button={b} theme={theme} size={isHero ? "lg" : "md"} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------ rich text --------------------------------- */

const MAX_W = {
  narrow: "max-w-2xl",
  normal: "max-w-4xl",
  full: "max-w-none",
} as const;

const ALIGN_TEXT = {
  left: "text-left",
  center: "text-center mx-auto",
  right: "text-right ml-auto",
} as const;

export function RichTextBlock({ section }: { section: StoreRichTextSection }) {
  if (!section.html) return null;
  return (
    <div
      className={cn(
        "prose-store text-15 leading-relaxed [&_a]:underline [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-5",
        MAX_W[section.maxWidth],
        ALIGN_TEXT[section.align],
      )}
      style={{ color: "var(--sp-fg)" }}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(section.html) }}
    />
  );
}

/* --------------------------- image with text ------------------------------ */

export function ImageWithTextBlock({
  section,
  theme,
}: {
  section: StoreImageWithTextSection;
  theme: StoreTheme;
}) {
  const image = mediaUrl(section.imageMediaId, "hero");
  const imagePct = (section.imageSpan / 12) * 100;
  return (
    <div
      className={cn(
        "flex flex-col gap-6 md:items-center",
        section.imageSide === "left" ? "md:flex-row" : "md:flex-row-reverse",
      )}
    >
      <div
        className="w-full shrink-0 overflow-hidden md:w-(--iw)"
        style={{ "--iw": `${imagePct}%`, borderRadius: "var(--sp-radius)" } as React.CSSProperties}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={section.heading || ""} className="size-full object-cover" loading="lazy" />
        ) : (
          <div
            className="aspect-[4/3] w-full"
            style={{ background: "color-mix(in srgb, var(--sp-fg) 8%, var(--sp-bg))" }}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        {section.heading ? (
          <h3 className="mb-3 text-2xl font-bold tracking-tight">{section.heading}</h3>
        ) : null}
        {section.html ? (
          <div
            className="text-15 leading-relaxed [&_a]:underline [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(section.html) }}
          />
        ) : null}
        {section.button ? (
          <div className="mt-4">
            <CtaButton button={section.button} theme={theme} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------- gallery --------------------------------- */

const GALLERY_GAP = { sm: "gap-2", md: "gap-4", lg: "gap-6" } as const;
const GALLERY_ASPECT = {
  square: "aspect-square",
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
  auto: "",
} as const;

export function GalleryBlock({ section }: { section: StoreGallerySection }) {
  if (section.items.length === 0) return null;
  return (
    <div>
      {section.title ? (
        <h3 className="mb-5 text-2xl font-bold tracking-tight">{section.title}</h3>
      ) : null}
      <div
        id={`g-${cssId(section.id)}`}
        className={cn("grid", GALLERY_GAP[section.gap])}
        style={
          {
            gridTemplateColumns: "repeat(var(--cols), minmax(0, 1fr))",
            "--cols": 2,
          } as React.CSSProperties
        }
      >
        {section.items.map((item) => {
          const src = mediaUrl(item.imageMediaId, "card");
          const figure = (
            <figure
              className="group relative overflow-hidden"
              style={{ borderRadius: "var(--sp-radius)" }}
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={item.caption || ""}
                  loading="lazy"
                  className={cn(
                    "w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]",
                    GALLERY_ASPECT[section.aspect],
                  )}
                />
              ) : null}
              {item.caption ? (
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-8 pb-2 text-13 font-medium text-white">
                  {item.caption}
                </figcaption>
              ) : null}
            </figure>
          );
          return item.href ? (
            <SmartLink key={item.id} href={item.href}>
              {figure}
            </SmartLink>
          ) : (
            <React.Fragment key={item.id}>{figure}</React.Fragment>
          );
        })}
      </div>
      {/* Desktop column count (mobile is always 2). */}
      <style>{`@media (min-width: 768px){ #g-${cssId(section.id)}{ --cols: ${section.columns} !important; } }`}</style>
    </div>
  );
}

/** Section ids are client-generated — keep only CSS-safe chars. */
function cssId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

/* -------------------------------- video ----------------------------------- */

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})/,
  );
  return m?.[1] ?? null;
}

export function VideoBlock({ section }: { section: StoreVideoSection }) {
  const videoId = extractYouTubeId(section.url);
  if (!videoId) return null;
  return (
    <div className={cn("mx-auto", MAX_W[section.maxWidth])}>
      {section.title ? (
        <h3 className="mb-5 text-2xl font-bold tracking-tight">{section.title}</h3>
      ) : null}
      <div
        className="aspect-video w-full overflow-hidden"
        style={{ borderRadius: "var(--sp-radius)" }}
      >
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}`}
          title={section.title || "Store video"}
          className="size-full"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  );
}

/* ------------------------------- divider ---------------------------------- */

export function DividerBlock({ section }: { section: StoreDividerSection }) {
  return (
    <div className="flex items-center" style={{ height: section.height }} aria-hidden>
      {section.line ? (
        <div
          className="h-px w-full"
          style={{ background: "color-mix(in srgb, var(--sp-fg) 15%, transparent)" }}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------ store info -------------------------------- */

export function StoreInfoBlock({
  section,
  vendor,
}: {
  section: StoreInfoSection;
  vendor: StorePagePayload["vendor"];
}) {
  const panels: React.ReactNode[] = [];
  if (section.showAbout && vendor.about) {
    panels.push(
      <InfoPanel key="about" title="About us">
        <p className="whitespace-pre-line">{vendor.about}</p>
      </InfoPanel>,
    );
  }
  if (section.showReturnPolicy && vendor.returnPolicy) {
    panels.push(
      <InfoPanel key="returns" title="Return policy">
        <p className="whitespace-pre-line">{vendor.returnPolicy}</p>
      </InfoPanel>,
    );
  }
  if (section.showContact) {
    panels.push(
      <InfoPanel key="contact" title="Get in touch">
        <p className="mb-3 opacity-80">
          Questions about a product or an order? Message us — we usually reply
          within a day.
        </p>
        <MessageStoreButton vendorId={vendor.id} vendorName={vendor.storeName} />
      </InfoPanel>,
    );
  }
  if (panels.length === 0) return null;
  return (
    <div>
      {section.heading ? (
        <h3 className="mb-5 text-2xl font-bold tracking-tight">{section.heading}</h3>
      ) : null}
      <div
        className={cn(
          "grid gap-4",
          panels.length === 1 ? "grid-cols-1" : panels.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3",
        )}
      >
        {panels}
      </div>
    </div>
  );
}

function InfoPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="p-5 text-sm leading-relaxed"
      style={{
        borderRadius: "var(--sp-radius)",
        background: "color-mix(in srgb, var(--sp-fg) 4%, var(--sp-bg))",
        border: "1px solid color-mix(in srgb, var(--sp-fg) 10%, transparent)",
      }}
    >
      <h4 className="mb-2 text-11 font-bold tracking-wide uppercase opacity-60">{title}</h4>
      {children}
    </div>
  );
}

/* ----------------------------- testimonials -------------------------------- */

function StarsRow({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5" style={{ color: "var(--sp-accent)" }} aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn("size-3.5", i < rating ? "fill-current" : "opacity-25")} />
      ))}
    </span>
  );
}

export function TestimonialsBlock({ section }: { section: StoreTestimonialsSection }) {
  const items = section.items.filter((i) => i.quote.trim().length > 0);
  if (items.length === 0) return null;
  return (
    <div>
      {section.heading ? (
        <h3 className="mb-5 text-2xl font-bold tracking-tight">{section.heading}</h3>
      ) : null}
      <div
        className={cn(
          "grid gap-4",
          items.length === 1 ? "grid-cols-1" : items.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3",
        )}
      >
        {items.map((item) => (
          <figure
            key={item.id}
            className="flex flex-col gap-3 p-5"
            style={{
              borderRadius: "var(--sp-radius)",
              background: "color-mix(in srgb, var(--sp-fg) 4%, var(--sp-bg))",
              border: "1px solid color-mix(in srgb, var(--sp-fg) 10%, transparent)",
            }}
          >
            {item.rating ? <StarsRow rating={item.rating} /> : null}
            <blockquote className="text-sm leading-relaxed">{item.quote}</blockquote>
            {item.name ? (
              <figcaption className="text-13 font-bold opacity-70">{item.name}</figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- social links -------------------------------- */

const SOCIAL_ICONS: Record<StoreSocialPlatform, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: Music2,
  youtube: Youtube,
  whatsapp: MessageCircle,
  x: Twitter,
  website: Globe,
};

const SOCIAL_LABELS: Record<StoreSocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
  x: "X (Twitter)",
  website: "Website",
};

export function SocialLinksBlock({ section }: { section: StoreSocialLinksSection }) {
  if (section.links.length === 0) return null;
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {section.heading ? (
        <h3 className="text-2xl font-bold tracking-tight">{section.heading}</h3>
      ) : null}
      <div className="flex flex-wrap justify-center gap-2.5">
        {section.links.map((link) => {
          const Icon = SOCIAL_ICONS[link.platform];
          return (
            <SmartLink
              key={link.id}
              href={link.url}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-transform duration-150 hover:scale-[1.03]"
              style={{
                borderRadius: "calc(var(--sp-radius) * 0.75)",
                border: "1px solid color-mix(in srgb, var(--sp-fg) 18%, transparent)",
                background: "color-mix(in srgb, var(--sp-fg) 4%, var(--sp-bg))",
              }}
            >
              <Icon className="size-4" style={{ color: "var(--sp-accent)" }} />
              {link.label || SOCIAL_LABELS[link.platform]}
            </SmartLink>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------- features --------------------------------- */

const FEATURE_ICONS: Record<StoreFeatureIcon, LucideIcon> = {
  truck: Truck,
  shield: ShieldCheck,
  medal: Medal,
  sparkles: Sparkles,
  refresh: RefreshCcw,
  headphones: Headphones,
  gift: Gift,
  leaf: Leaf,
  zap: Zap,
  heart: Heart,
};

export function FeaturesBlock({ section }: { section: StoreFeaturesSection }) {
  const items = section.items.filter((i) => i.title.trim().length > 0);
  if (items.length === 0) return null;
  return (
    <div>
      {section.heading ? (
        <h3 className="mb-6 text-center text-2xl font-bold tracking-tight">{section.heading}</h3>
      ) : null}
      <div
        className={cn(
          "grid gap-5",
          items.length <= 2
            ? "sm:grid-cols-2"
            : items.length === 4
              ? "grid-cols-2 sm:grid-cols-4"
              : "grid-cols-2 sm:grid-cols-3",
        )}
      >
        {items.map((item) => {
          const Icon = FEATURE_ICONS[item.icon];
          return (
            <div key={item.id} className="flex flex-col items-center gap-2 text-center">
              <span
                className="flex size-12 items-center justify-center"
                style={{
                  borderRadius: "var(--sp-radius)",
                  background: "color-mix(in srgb, var(--sp-accent) 12%, transparent)",
                  color: "var(--sp-accent)",
                }}
              >
                <Icon className="size-5.5" strokeWidth={1.8} />
              </span>
              <p className="text-15 font-bold">{item.title}</p>
              {item.text ? (
                <p className="text-13 leading-snug opacity-70">{item.text}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------------- FAQ ------------------------------------ */

export function FaqBlock({ section }: { section: StoreFaqSection }) {
  const items = section.items.filter((i) => i.question.trim().length > 0);
  if (items.length === 0) return null;
  return (
    <div className="mx-auto max-w-3xl">
      {section.heading ? (
        <h3 className="mb-5 text-2xl font-bold tracking-tight">{section.heading}</h3>
      ) : null}
      <Accordion type="single" collapsible className="w-full">
        {items.map((item) => (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionTrigger className="text-left text-15 font-semibold">
              {item.question}
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm leading-relaxed whitespace-pre-line opacity-90">{item.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
