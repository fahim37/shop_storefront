import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getProductsByIds,
  getStorePage,
  getVendorProductsPage,
  NotFoundError,
} from "@/lib/api/server";
import type {
  ProductCardRow,
  StorePageDocument,
  StorePagePayload,
} from "@/lib/api/types";
import { fromProductRow, type CardProduct } from "@/lib/api/card";
import {
  defaultDocumentFor,
  StorePageRenderer,
} from "@/components/store/store-page-renderer";

// Fallback only — publishing from the vendor designer (and vendor profile
// edits) revalidate the `store:<slug>` tag on demand via /api/revalidate.
export const revalidate = 3600;

/** Opt into ISR: render per slug on first hit, then serve cached HTML. */
export function generateStaticParams() {
  return [];
}

type Params = Promise<{ slug: string }>;

async function loadPayload(slug: string): Promise<StorePagePayload | null> {
  try {
    return await getStorePage(slug);
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const payload = await loadPayload(slug);
  if (!payload) return { title: "Store not found — GCL" };
  const { vendor } = payload;
  const description =
    vendor.tagline ??
    vendor.about?.slice(0, 160) ??
    `Shop ${vendor.storeName} on GCL — ${vendor.productCount} products.`;
  return {
    title: `${vendor.storeName} — GCL`,
    description,
    openGraph: {
      title: vendor.storeName,
      description,
      images: vendor.storeBannerUrl
        ? [vendor.storeBannerUrl]
        : vendor.storeLogoUrl
          ? [vendor.storeLogoUrl]
          : undefined,
    },
  };
}

/**
 * Resolve every visible `products` section to card data in one parallel
 * pass: manual picks batch by id, dynamic sources hit the vendor-scoped
 * public listing. All fetches carry the `products` cache tag, so catalog
 * edits keep these sections fresh independently of the page document.
 */
async function resolveProducts(
  document: StorePageDocument,
  vendorId: string,
): Promise<Record<string, CardProduct[]>> {
  const sections = document.sections.filter(
    (s) => s.type === "products" && !s.hidden,
  );
  const results = await Promise.all(
    sections.map(async (s) => {
      if (s.type !== "products") return [s.id, []] as const;
      try {
        let rows: ProductCardRow[];
        if (s.source === "manual") {
          const { data } = await getProductsByIds(s.productIds);
          // Backend returns its own listing order — restore the pinned order.
          const byId = new Map(data.map((r) => [r.id, r]));
          rows = s.productIds
            .map((id) => byId.get(id))
            .filter((r): r is ProductCardRow => Boolean(r));
        } else {
          const { data } = await getVendorProductsPage({
            vendorId,
            sort: s.source === "best_selling" ? "best_selling" : "newest",
            limit: s.limit,
          });
          rows = data;
        }
        return [s.id, rows.map(fromProductRow)] as const;
      } catch {
        return [s.id, []] as const;
      }
    }),
  );
  return Object.fromEntries(results);
}

export default async function StorePage({ params }: { params: Params }) {
  const { slug } = await params;
  const payload = await loadPayload(slug);
  if (!payload) notFound();

  const document = payload.page ?? defaultDocumentFor(payload.vendor);
  const productsBySection = await resolveProducts(document, payload.vendor.id);

  return (
    <StorePageRenderer
      payload={payload}
      document={document}
      productsBySection={productsBySection}
    />
  );
}
