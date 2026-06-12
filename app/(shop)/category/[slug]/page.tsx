import * as React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CategoryListing } from "@/components/category/category-listing";
import { ProductGridSkeleton } from "@/components/product/product-grid";
import { findCategoryBySlug } from "@/lib/api/catalog";
import {
  getBrands,
  getCategoryBreadcrumbs,
  getCategoryBySlug,
  getCategoryTree,
  NotFoundError,
} from "@/lib/api/server";
import type { Brand, Category, CategoryNode } from "@/lib/api/types";

export const revalidate = 120;

type Params = Promise<{ slug: string }>;

/** Resolve a promise to a fallback instead of throwing (keep fetches resilient). */
async function settle<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const category = await getCategoryBySlug(slug);
    const description =
      category.description ??
      `Shop ${category.name} on GCL — authentic products from verified Bangladeshi sellers, cash on delivery nationwide.`;
    return {
      title: `${category.name} — GCL`,
      description,
      openGraph: {
        title: `${category.name} — GCL`,
        description,
      },
    };
  } catch {
    return { title: "Category — GCL" };
  }
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { slug } = await params;

  // Fetch the category itself first — 404 the route if it doesn't exist.
  let category: Category;
  try {
    category = await getCategoryBySlug(slug);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  // The rest is resilient (fall back to [] so the page still renders).
  const [tree, crumbs, brands] = await Promise.all([
    settle(getCategoryTree(), [] as CategoryNode[]),
    settle(getCategoryBreadcrumbs(category.id), [] as Category[]),
    settle(getBrands(), [] as Brand[]),
  ]);

  // Locate this category's node in the tree to read its children (subcategories).
  const node =
    findCategoryBySlug(tree, category.slug) ??
    findCategoryBySlug(tree, slug) ??
    null;
  const subcategories: CategoryNode[] = node?.children ?? [];

  // Build breadcrumb trail (Home is prepended by the component; last = current).
  const crumbChain = crumbs.length > 0 ? crumbs : [category];
  const breadcrumbItems = crumbChain.map((c) => ({
    label: c.name,
    href: `/category/${c.slug}`,
  }));

  return (
    <div className="wrap py-4">
      <Breadcrumbs items={breadcrumbItems} />

      <header className="mt-4 mb-6">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-1.5 max-w-2xl text-sm font-semibold text-sub">
            {category.description}
          </p>
        )}
      </header>

      <React.Suspense fallback={<ProductGridSkeleton count={10} cols={5} />}>
        <CategoryListing
          categoryId={category.id}
          brands={brands}
          subcategories={subcategories}
        />
      </React.Suspense>
    </div>
  );
}
