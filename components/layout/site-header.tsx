import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { SearchBar } from "@/components/layout/search-bar";
import {
  AccountMenu,
  CartButton,
  WishlistLink,
} from "@/components/layout/header-actions";
import {
  CatbarLinks,
  CategoryMegaMenu,
} from "@/components/layout/mega-menu";
import { MobileMenuButton } from "@/components/layout/mobile-nav";

/** Topbar utility links (desktop only). */
function Topbar() {
  return (
    <div className="hidden bg-navy text-[oklch(1_0_0/0.75)] md:block">
      <div className="wrap flex h-[34px] items-center justify-between text-xs font-semibold">
        <span>
          Free delivery in Dhaka on orders over{" "}
          <b className="font-bold text-amber">
            <span className="bn">৳</span>1,500
          </b>
        </span>
        <div className="flex gap-5">
          <Link href="/pages/about" className="hover:text-white">
            Become a seller
          </Link>
          <Link href="/account/orders" className="hover:text-white">
            Track order
          </Link>
          <Link href="/pages/faq" className="hover:text-white">
            Help
          </Link>
          <button type="button" className="bn hover:text-white">
            বাংলা
          </button>
        </div>
      </div>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-card">
      <Topbar />

      {/* main nav */}
      <div className="border-b border-border bg-card">
        <div className="wrap flex h-[68px] items-center gap-3 md:h-[76px] md:gap-7">
          <MobileMenuButton />
          <Logo className="hidden md:flex" />
          <Logo className="md:hidden" size="sm" />
          <div className="hidden flex-1 md:block">
            <SearchBar />
          </div>
          <div className="ml-auto flex items-center gap-4 md:gap-6">
            <span className="hidden md:flex">
              <AccountMenu />
            </span>
            <span className="hidden md:flex">
              <WishlistLink />
            </span>
            <CartButton />
          </div>
        </div>
        {/* mobile search row */}
        <div className="wrap pb-3 md:hidden">
          <SearchBar compact placeholder="Search 36,000+ products…" />
        </div>
      </div>

      {/* category bar (desktop) */}
      <div className="hidden bg-primary text-white md:block">
        <div className="wrap flex items-center">
          <CategoryMegaMenu />
          <div className="ml-3.5 flex flex-1 items-center">
            <CatbarLinks />
          </div>
        </div>
      </div>
    </header>
  );
}
