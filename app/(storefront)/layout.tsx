import { Footer } from "@/components/storefront/footer";
import { Header } from "@/components/storefront/header/header";

export default function StorefrontLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-talon focus:px-3 focus:py-2 focus:text-sm focus:text-ink"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="min-h-dvh pt-16">
        {children}
      </main>
      <Footer />
    </>
  );
}
