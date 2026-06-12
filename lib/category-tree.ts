import type { CategoryNode } from "@/lib/api/types";

/**
 * Pure category-tree helpers. NOT a "use client" module, so these can be
 * called from Server Components (e.g. the category page) AND Client Components.
 */

/** Depth-first flatten of the category tree. */
export function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  const out: CategoryNode[] = [];
  const walk = (n: CategoryNode) => {
    out.push(n);
    n.children?.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}

/** Find a category node by slug anywhere in the tree. */
export function findCategoryBySlug(
  nodes: CategoryNode[],
  slug: string,
): CategoryNode | null {
  for (const n of nodes) {
    if (n.slug === slug) return n;
    const found = findCategoryBySlug(n.children ?? [], slug);
    if (found) return found;
  }
  return null;
}
