"use client";

import { create } from "zustand";

/**
 * Ephemeral UI state only (per the stack rules: server state → TanStack Query,
 * URL state → searchParams, ephemeral → Zustand). No cart/product data here.
 */
interface UIState {
  cartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  setCartDrawer: (open: boolean) => void;

  mobileNavOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  setMobileNav: (open: boolean) => void;

  /** Currently-hovered/active mega-menu category slug (desktop), or null. */
  megaCategory: string | null;
  setMegaCategory: (slug: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  cartDrawerOpen: false,
  openCartDrawer: () => set({ cartDrawerOpen: true }),
  closeCartDrawer: () => set({ cartDrawerOpen: false }),
  setCartDrawer: (open) => set({ cartDrawerOpen: open }),

  mobileNavOpen: false,
  openMobileNav: () => set({ mobileNavOpen: true }),
  closeMobileNav: () => set({ mobileNavOpen: false }),
  setMobileNav: (open) => set({ mobileNavOpen: open }),

  megaCategory: null,
  setMegaCategory: (slug) => set({ megaCategory: slug }),
}));
