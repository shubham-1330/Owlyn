"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { HeaderActions } from "@/components/storefront/header/header-actions";
import { MegaMenu } from "@/components/storefront/header/mega-menu";
import { MobileMenu } from "@/components/storefront/header/mobile-menu";
import { SearchOverlay } from "@/components/storefront/header/search-overlay";
import { Wordmark } from "@/components/storefront/wordmark";
import { GUTTER } from "@/lib/layout";
import type { MenuPanel } from "@/lib/queries/menu";
import { cn } from "@/lib/utils";

/**
 * Fixed header, solid paper from the top on every page. With real
 * photography under it neither ink nor moon text is reliably legible, and a
 * scrim strong enough to guarantee 4.5:1 would stain the hero, so the hero
 * starts below the header instead of running under it.
 */
export function HeaderShell({
  menu,
  isSignedIn,
  isStaff,
  trending,
}: {
  menu: MenuPanel[];
  isSignedIn: boolean;
  isStaff: boolean;
  trending: string[];
}) {
  const pathname = usePathname();
  const [, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 h-16 border-b border-border bg-background/95 text-foreground backdrop-blur-sm",
        )}
      >
        <div className={cn("grid h-full grid-cols-[auto_1fr_auto] items-center gap-4", GUTTER)}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="-ml-2 inline-flex size-10 items-center justify-center rounded-sm hover:bg-ink/5 lg:hidden"
            >
              <Menu className="size-5" aria-hidden />
            </button>
            <Wordmark />
          </div>

          <div className="hidden justify-self-center lg:block">
            <MegaMenu panels={menu} onOpenChange={setMenuOpen} />
          </div>

          <HeaderActions isSignedIn={isSignedIn} onSearch={() => setSearchOpen(true)} />
        </div>
      </header>

      <MobileMenu
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        panels={menu}
        isSignedIn={isSignedIn}
        isStaff={isStaff}
      />
      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} trending={trending} />
    </>
  );
}
