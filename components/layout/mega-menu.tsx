"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronRight, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategoryTree } from "@/lib/api/catalog";
import { categoryIcon } from "@/lib/category-icons";
import { resolveMediaPath } from "@/lib/media";
import type { CategoryNode } from "@/lib/api/types";

/** Admin-uploaded icon in a circle, falling back to the lucide glyph. */
function CategoryCircleIcon({
  cat,
  className,
  iconClassName,
}: {
  cat: CategoryNode;
  className?: string;
  iconClassName?: string;
}) {
  const Icon = categoryIcon(cat.slug);
  if (cat.iconUrl) {
    return (
      <span
        className={cn(
          "block shrink-0 overflow-hidden rounded-full ring-1 ring-border",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolveMediaPath(cat.iconUrl)!}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full scale-[1.38] object-cover"
        />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-blue-soft text-primary",
        className,
      )}
    >
      {React.createElement(Icon, {
        className: cn("size-1/2", iconClassName),
        strokeWidth: 1.8,
      })}
    </span>
  );
}

/**
 * "All categories" trigger + full-width mega panel (desktop).
 *
 * Open/close model: CLICK to open (hover-opening proved twitchy — brushing
 * past the button dimmed the page), click again / outside pointerdown /
 * backdrop tap / Escape / navigating to close. Hover only switches the
 * active category INSIDE the open panel. The backdrop lives OUTSIDE the
 * menu ref on purpose — clicking the dimmed page area must read as
 * "outside" and dismiss.
 */
export function CategoryMegaMenu() {
  const [open, setOpen] = React.useState(false);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const { data: tree } = useCategoryTree();
  const roots = tree ?? [];
  const active = roots.find((r) => r.id === activeId) ?? roots[0] ?? null;
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Dismiss on outside pointerdown / Escape.
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* Backdrop — outside the menu ref so tapping it always dismisses. */}
      {open && roots.length > 0 && (
        <div
          className="fixed inset-0 top-[var(--header-h,0)] z-30 bg-[oklch(0.25_0.04_260/0.3)] animate-in fade-in-0 duration-200"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={cn(
            "flex h-[52px] cursor-pointer items-center gap-2.5 px-4 text-[13.5px] font-extrabold transition-colors duration-200",
            open ? "bg-amber text-blue-deep" : "bg-blue-deep text-white",
          )}
        >
          <LayoutGrid className="size-4" strokeWidth={2} />
          All categories
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform duration-200",
              open && "rotate-180",
            )}
            strokeWidth={2.4}
          />
        </button>

        {open && roots.length > 0 && (
          <div className="absolute left-0 top-full z-40 mt-0 flex w-[860px] max-w-[92vw] overflow-hidden rounded-b-2xl border border-t-0 border-border bg-card shadow-[var(--shadow-panel)] animate-in fade-in-0 slide-in-from-top-2 duration-200">
            {/* rail */}
            <div className="flex w-64 shrink-0 flex-col gap-0.5 border-r border-border bg-muted p-3">
              {roots.map((cat) => {
                const on = active?.id === cat.id;
                return (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    onMouseEnter={() => setActiveId(cat.id)}
                    onFocus={() => setActiveId(cat.id)}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-semibold transition-colors duration-150",
                      on
                        ? "bg-card text-primary shadow-sm"
                        : "text-sub hover:bg-card/60",
                    )}
                  >
                    <CategoryCircleIcon cat={cat} className="size-8" />
                    {cat.name}
                    <ChevronRight
                      className={cn(
                        "ml-auto size-4 transition-all duration-150",
                        on
                          ? "translate-x-0 text-primary opacity-100"
                          : "-translate-x-1 opacity-0",
                      )}
                    />
                  </Link>
                );
              })}
            </div>
            {/* pane — keyed by category so switching cross-fades */}
            {active && (
              <div
                key={active.id}
                className="flex-1 p-6 animate-in fade-in-0 duration-200"
              >
                <div className="mb-4 flex items-baseline justify-between">
                  <h3 className="font-display text-lg font-extrabold">{active.name}</h3>
                  <Link
                    href={`/category/${active.slug}`}
                    onClick={() => setOpen(false)}
                    className="group flex items-center gap-1 text-[13px] font-bold text-primary"
                  >
                    View all{" "}
                    <ArrowRight
                      className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                      strokeWidth={2.4}
                    />
                  </Link>
                </div>
                <Subcategories category={active} onNavigate={() => setOpen(false)} />
              </div>
            )}
          </div>
        )}
      </div>
    </>
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
    <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
      {children.map((sub) => (
        <div key={sub.id}>
          <Link
            href={`/category/${sub.slug}`}
            onClick={onNavigate}
            className="group flex items-center gap-3 rounded-xl border border-transparent p-2 transition-colors duration-150 hover:border-border hover:bg-muted/60"
          >
            <CategoryCircleIcon cat={sub} className="size-12" />
            <span className="min-w-0">
              <b className="block truncate text-[13.5px] font-bold text-ink transition-colors group-hover:text-primary">
                {sub.name}
              </b>
              <span className="block text-[11.5px] font-semibold text-faint">
                {(sub.children?.length ?? 0) > 0
                  ? `${sub.children!.length} collections`
                  : "Shop now"}
              </span>
            </span>
          </Link>
          {(sub.children ?? []).slice(0, 3).map((leaf) => (
            <Link
              key={leaf.id}
              href={`/category/${leaf.slug}`}
              onClick={onNavigate}
              className="ml-[60px] block py-1 text-[12.5px] font-semibold text-sub transition-colors hover:text-primary"
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
    { label: "Flash sale", href: "/shop?sale=1", hot: true },
    { label: "New arrivals", href: "/shop?sort=newest" },
    { label: "Best sellers", href: "/shop?sort=best_selling" },
    { label: "Top stores", href: "/shop?sort=best_selling" },
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
      <Link
        href="/#mega-sale"
        className="ml-auto hidden items-center gap-1.5 rounded-lg bg-amber px-3.5 py-1.5 text-[12.5px] font-extrabold text-blue-deep transition-colors hover:bg-amber-hover lg:flex"
      >
        Mega Sale
      </Link>
    </>
  );
}
