"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronRight, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategoryTree } from "@/lib/api/catalog";
import { categoryIcon } from "@/lib/category-icons";
import { formatCompact } from "@/lib/format";
import type { CategoryNode } from "@/lib/api/types";

/** "All categories" trigger + full-width mega panel (desktop). */
export function CategoryMegaMenu() {
  const [open, setOpen] = React.useState(false);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const { data: tree } = useCategoryTree();
  const roots = tree ?? [];
  const active = roots.find((r) => r.id === activeId) ?? roots[0] ?? null;
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex h-[52px] items-center gap-2.5 px-4 text-[13.5px] font-extrabold transition-colors",
          open ? "bg-amber text-blue-deep" : "bg-blue-deep text-white",
        )}
      >
        <LayoutGrid className="size-4" strokeWidth={2} />
        All categories
        <ChevronDown className="size-3.5" strokeWidth={2.4} />
      </button>

      {open && roots.length > 0 && (
        <>
          <div className="fixed inset-0 top-[var(--header-h,0)] z-30 bg-[oklch(0.25_0.04_260/0.3)]" />
          <div className="absolute left-0 top-full z-40 mt-0 flex w-[860px] max-w-[92vw] overflow-hidden rounded-b-2xl border border-t-0 border-border bg-card shadow-[var(--shadow-panel)] animate-in fade-in-0 slide-in-from-top-1">
            {/* rail */}
            <div className="flex w-64 shrink-0 flex-col gap-0.5 border-r border-border bg-muted p-3">
              {roots.map((cat) => {
                const Icon = categoryIcon(cat.slug);
                const on = active?.id === cat.id;
                return (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    onMouseEnter={() => setActiveId(cat.id)}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold transition-colors",
                      on
                        ? "bg-card text-primary shadow-sm"
                        : "text-sub hover:bg-card/60",
                    )}
                  >
                    <Icon className={cn("size-4", on ? "text-primary" : "text-faint")} />
                    {cat.name}
                    <ChevronRight
                      className={cn("ml-auto size-4", on ? "opacity-100 text-primary" : "opacity-0")}
                    />
                  </Link>
                );
              })}
            </div>
            {/* pane */}
            {active && (
              <div className="flex-1 p-6">
                <div className="mb-4 flex items-baseline justify-between">
                  <h3 className="font-display text-lg font-extrabold">{active.name}</h3>
                  <Link
                    href={`/category/${active.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-1 text-[13px] font-bold text-primary"
                  >
                    View all <ArrowRight className="size-3.5" strokeWidth={2.4} />
                  </Link>
                </div>
                <Subcategories category={active} onNavigate={() => setOpen(false)} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Subcategories({
  category,
  onNavigate,
}: {
  category: CategoryNode;
  onNavigate: () => void;
}) {
  const children = category.children ?? [];
  if (children.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Browse everything in {category.name}.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-x-6 gap-y-1">
      {children.map((sub) => (
        <div key={sub.id} className="py-1">
          <Link
            href={`/category/${sub.slug}`}
            onClick={onNavigate}
            className="block py-1.5 text-[13.5px] font-bold text-ink hover:text-primary"
          >
            {sub.name}
          </Link>
          {(sub.children ?? []).slice(0, 4).map((leaf) => (
            <Link
              key={leaf.id}
              href={`/category/${leaf.slug}`}
              onClick={onNavigate}
              className="block py-1 text-[12.5px] font-semibold text-sub hover:text-primary"
            >
              {leaf.name}
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Quick-link tabs shown in the blue catbar next to "All categories". */
export function CatbarLinks() {
  const links = [
    { label: "Flash sale", href: "/search?q=flash", hot: true },
    { label: "New arrivals", href: "/search?q=new&sort=newest" },
    { label: "Best sellers", href: "/search?q=best" },
    { label: "Top stores", href: "/search?q=" },
    { label: "Vouchers", href: "/pages/faq" },
  ];
  return (
    <>
      {links.map((l) => (
        <Link
          key={l.label}
          href={l.href}
          className={cn(
            "flex h-[52px] items-center gap-1.5 px-3.5 text-[13px] font-bold transition-colors",
            l.hot ? "text-amber" : "text-white/85 hover:text-white",
          )}
        >
          {l.label}
        </Link>
      ))}
      <span className="ml-auto hidden items-center gap-1.5 rounded-lg bg-amber px-3.5 py-1.5 text-[12.5px] font-extrabold text-blue-deep lg:flex">
        <span className="bn">ঈদ</span> Mega Sale
      </span>
    </>
  );
}
