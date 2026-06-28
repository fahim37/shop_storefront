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

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-primary md:bg-card">
      {/* main nav — solid brand-blue bar on mobile, white on desktop */}
      <div className="bg-primary md:border-b md:border-border md:bg-card">
        <div className="wrap flex h-[68px] items-center gap-3 md:h-[76px] md:gap-7">
          <MobileMenuButton />
          <Logo className="hidden md:flex" />
          <Logo className="md:hidden" size="sm" light />
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
            <CartButton className="text-white md:text-ink" />
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
