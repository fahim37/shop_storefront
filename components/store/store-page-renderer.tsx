/**
 * Renders a vendor's published StorePageDocument. Server Component: the page
 * route resolves product data for `products` sections up front and passes it
 * in via `productsBySection`.
 *
 * Vendors that never published get a profile-derived default document
 * (mirrors store_backend's defaultStorePageDocument) so every store URL
 * renders a complete page from day one.
 */
import * as React from "react";

import type {
  StorePageDocument,
  StorePagePayload,
  StoreSection,
} from "@/lib/api/types";
import type { CardProduct } from "@/lib/api/card";
import { mediaUrl } from "@/lib/media";
import { StoreHeader } from "@/components/store/store-header";
import { ProductsBlock } from "@/components/store/products-block";
import { CountdownBlock } from "@/components/store/countdown-block";
import {
  DividerBlock,
  FaqBlock,
  FeaturesBlock,
  GalleryBlock,
  HeroBannerBlock,
  ImageWithTextBlock,
  RichTextBlock,
  SectionShell,
  SocialLinksBlock,
  StoreInfoBlock,
  TestimonialsBlock,
  VideoBlock,
} from "@/components/store/store-blocks";
import { themeVars } from "@/components/store/store-theme";

/** Storefront fallback when a vendor has never published a page. */
export function defaultDocumentFor(
  vendor: StorePagePayload["vendor"],
): StorePageDocument {
  return {
    version: 1,
    theme: {
      accent: "#0f766e",
      background: "#ffffff",
      foreground: "#0f172a",
      font: "sans",
      radius: "md",
      buttonStyle: "solid",
      headerBanner: true,
      backgroundImageMediaId: null,
      backgroundOverlay: 85,
    },
    header: {
      background: "banner",
      imageMediaId: null,
      overlay: 30,
      height: "normal",
      align: "left",
      showTagline: true,
      showStats: true,
    },
    sections: [
      {
        id: "default-hero",
        type: "hero",
        hidden: false,
        style: {
          paddingTop: 0,
          paddingBottom: 0,
          background: "page",
          fullBleed: true,
          hideOnMobile: false,
          hideOnDesktop: false,
        },
        heading: vendor.storeName,
        subheading: vendor.tagline ?? "",
        align: "center",
        height: 320,
        imageMediaId: null,
        overlay: 35,
        textTone: "auto",
        buttons: [],
      },
      {
        id: "default-products",
        type: "products",
        hidden: false,
        style: {
          paddingTop: 48,
          paddingBottom: 48,
          background: "page",
          fullBleed: false,
          hideOnMobile: false,
          hideOnDesktop: false,
        },
        title: "Our products",
        subtitle: "",
        source: "newest",
        productIds: [],
        layout: "grid",
        columns: 4,
        limit: 12,
      },
      {
        id: "default-info",
        type: "store_info",
        hidden: false,
        style: {
          paddingTop: 48,
          paddingBottom: 48,
          background: "surface",
          fullBleed: false,
          hideOnMobile: false,
          hideOnDesktop: false,
        },
        heading: "About the store",
        showAbout: true,
        showReturnPolicy: true,
        showContact: true,
      },
    ],
  };
}

function renderSection(
  section: StoreSection,
  payload: StorePagePayload,
  doc: StorePageDocument,
  productsBySection: Record<string, CardProduct[]>,
): React.ReactNode {
  const theme = doc.theme;
  switch (section.type) {
    case "hero":
    case "banner":
      return (
        <SectionShell key={section.id} style={section.style} fullBleedContent={section.style.fullBleed}>
          {section.style.fullBleed ? (
            <HeroBannerBlock section={section} theme={theme} />
          ) : (
            <div className="wrap">
              <HeroBannerBlock section={section} theme={theme} />
            </div>
          )}
        </SectionShell>
      );
    case "rich_text":
      return (
        <SectionShell key={section.id} style={section.style}>
          <RichTextBlock section={section} />
        </SectionShell>
      );
    case "image_with_text":
      return (
        <SectionShell key={section.id} style={section.style}>
          <ImageWithTextBlock section={section} theme={theme} />
        </SectionShell>
      );
    case "gallery":
      return (
        <SectionShell key={section.id} style={section.style}>
          <GalleryBlock section={section} />
        </SectionShell>
      );
    case "products":
      return (
        <SectionShell key={section.id} style={section.style}>
          <ProductsBlock
            section={section}
            products={productsBySection[section.id] ?? []}
          />
        </SectionShell>
      );
    case "video":
      return (
        <SectionShell key={section.id} style={section.style}>
          <VideoBlock section={section} />
        </SectionShell>
      );
    case "divider":
      return (
        <SectionShell key={section.id} style={section.style}>
          <DividerBlock section={section} />
        </SectionShell>
      );
    case "store_info":
      return (
        <SectionShell key={section.id} style={section.style}>
          <StoreInfoBlock section={section} vendor={payload.vendor} />
        </SectionShell>
      );
    case "faq":
      return (
        <SectionShell key={section.id} style={section.style}>
          <FaqBlock section={section} />
        </SectionShell>
      );
    case "testimonials":
      return (
        <SectionShell key={section.id} style={section.style}>
          <TestimonialsBlock section={section} />
        </SectionShell>
      );
    case "countdown":
      return (
        <SectionShell key={section.id} style={section.style}>
          <CountdownBlock section={section} theme={theme} />
        </SectionShell>
      );
    case "social_links":
      return (
        <SectionShell key={section.id} style={section.style}>
          <SocialLinksBlock section={section} />
        </SectionShell>
      );
    case "features":
      return (
        <SectionShell key={section.id} style={section.style}>
          <FeaturesBlock section={section} />
        </SectionShell>
      );
    default:
      return null;
  }
}

export function StorePageRenderer({
  payload,
  document,
  productsBySection,
}: {
  payload: StorePagePayload;
  document: StorePageDocument;
  productsBySection: Record<string, CardProduct[]>;
}) {
  const visible = document.sections.filter((s) => !s.hidden);
  const theme = document.theme;
  const pageBg = mediaUrl(theme.backgroundImageMediaId, "hero");
  return (
    <div
      style={{
        ...themeVars(theme),
        ...(pageBg
          ? {
              backgroundImage: `url(${pageBg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
            }
          : {}),
      }}
    >
      {/* readability veil over the page background image */}
      <div
        style={
          pageBg
            ? {
                background: `color-mix(in srgb, var(--sp-bg) ${theme.backgroundOverlay}%, transparent)`,
              }
            : undefined
        }
      >
        <StoreHeader
          vendor={payload.vendor}
          theme={theme}
          header={document.header}
        />
        {visible.map((s) => renderSection(s, payload, document, productsBySection))}
      </div>
    </div>
  );
}
