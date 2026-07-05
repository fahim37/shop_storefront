import { SiteHeader } from "@/components/layout/site-header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/layout/cart-drawer";
import { MobileNav, MobileBottomNav } from "@/components/layout/mobile-nav";
import { HideOnPdpMobile } from "@/components/layout/pdp-chrome";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <HideOnPdpMobile>
        <Footer />
      </HideOnPdpMobile>
      <MobileBottomNav />
      {/* Portaled overlays */}
      <CartDrawer />
      <MobileNav />
    </>
  );
}
