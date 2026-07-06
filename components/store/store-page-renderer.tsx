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
import { StoreHeader } from "@/components/store/store-header";
import { ProductsBlock } from "@/components/store/products-block";
import {
  DividerBlock,
  FaqBlock,
  GalleryBlock,
  HeroBannerBlock,
  ImageWithTextBlock,
  RichTextBlock,
  SectionShell,
  StoreInfoBlock,
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
  return (
    <div style={themeVars(document.theme)}>
      <StoreHeader vendor={payload.vendor} theme={document.theme} />
      {visible.map((s) => renderSection(s, payload, document, productsBySection))}
    </div>
  );
}
