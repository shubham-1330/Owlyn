"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { HeaderActions } from "@/components/storefront/header/header-actions";
import { MegaMenu } from "@/components/storefront/header/mega-menu";
import { MobileMenu } from "@/components/storefront/header/mobile-menu";
import { SearchOverlay } from "@/components/storefront/header/search-overlay";
import { Wordmark } from "@/components/storefront/wordmark";
import { GUTTER, HEADER_HEIGHT } from "@/lib/layout";
import type { MenuPanel } from "@/lib/queries/menu";
import { cn } from "@/lib/utils";

/**
 * Fixed header. Transparent while a `[data-hero]` element sits under it,
 * solid slate otherwise, and solid whenever a menu, drawer or the search
 * overlay is open or the pointer is over it.
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
  const [overHero, setOverHero] = useState(pathname === "/");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [engaged, setEngaged] = useState(false);

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>("[data-hero]");
    if (!hero) {
      setOverHero(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setOverHero(Boolean(entry?.isIntersecting)),
      { rootMargin: `-${HEADER_HEIGHT}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const solid = !overHero || menuOpen || mobileOpen || searchOpen || engaged;

  return (
    <>
      <header
        data-solid={solid ? "true" : "false"}
        onMouseEnter={() => setEngaged(true)}
        onMouseLeave={() => setEngaged(false)}
        onFocusCapture={() => setEngaged(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setEngaged(false);
        }}
        className={cn(
          "fixed inset-x-0 top-0 z-40 h-16 border-b transition-colors duration-200",
          solid
            ? "border-border bg-slate/95 text-foreground backdrop-blur-sm"
            : "border-transparent bg-transparent text-moon",
        )}
      >
        <div className={cn("grid h-full grid-cols-[auto_1fr_auto] items-center gap-4", GUTTER)}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="-ml-2 inline-flex size-10 items-center justify-center rounded-sm hover:bg-moon/10 lg:hidden"
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
