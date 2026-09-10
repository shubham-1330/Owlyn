import { CartDrawer } from "@/components/storefront/cart/cart-drawer";
import { CartProvider } from "@/components/storefront/cart/cart-provider";
import { Footer } from "@/components/storefront/footer";
import { Header } from "@/components/storefront/header/header";
import { WishlistProvider } from "@/components/storefront/wishlist/wishlist-provider";
import { getSessionUser } from "@/lib/auth/guards";
import { getCurrentCart } from "@/lib/cart/service";
import { getWishlistEntries } from "@/lib/wishlist/service";

/**
 * One read of the bag and the wishlist per request feeds the header count,
 * the drawer and every page below. Mutations return fresh data and
 * revalidate the cart tag, so nothing here can drift from what a page shows.
 */
export default async function StorefrontLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  const [cart, wishlist] = await Promise.all([
    getCurrentCart(),
    user ? getWishlistEntries(user.id) : Promise.resolve([]),
  ]);

  return (
    <WishlistProvider isSignedIn={Boolean(user)} initialEntries={wishlist}>
      <CartProvider initialCart={cart}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-talon focus:px-3 focus:py-2 focus:text-sm focus:text-moon"
        >
          Skip to content
        </a>
        <Header />
        <main id="main" className="min-h-dvh pt-16">
          {children}
        </main>
        <Footer />
        <CartDrawer />
      </CartProvider>
    </WishlistProvider>
  );
}
