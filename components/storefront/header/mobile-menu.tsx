"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Dialog, VisuallyHidden } from "radix-ui";
import { useEffect, useState } from "react";

import { useCart } from "@/components/storefront/cart/cart-provider";
import { Wordmark } from "@/components/storefront/wordmark";
import { useWishlist } from "@/components/storefront/wishlist/wishlist-provider";
import type { MenuPanel } from "@/lib/queries/menu";
import { cn } from "@/lib/utils";

const row =
  "flex w-full items-center justify-between py-3.5 text-left text-lg hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * Full-screen drawer with a two-level back stack: top level lists the
 * sections, tapping one shows its grouped links and tiles.
 */
export function MobileMenu({
  open,
  onOpenChange,
  panels,
  isSignedIn,
  isStaff,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panels: MenuPanel[];
  isSignedIn: boolean;
  isStaff: boolean;
}) {
  const [active, setActive] = useState<MenuPanel | null>(null);

  useEffect(() => {
    if (!open) setActive(null);
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/70 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in lg:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col bg-ink text-foreground data-[state=closed]:animate-slide-out-left data-[state=open]:animate-slide-in-left lg:hidden"
        >
          <Dialog.Title asChild>
            <VisuallyHidden.Root>Menu</VisuallyHidden.Root>
          </Dialog.Title>

          <div className="flex h-16 shrink-0 items-center justify-between px-5">
            {active ? (
              <button
                type="button"
                onClick={() => setActive(null)}
                className="-ml-2 inline-flex h-10 items-center gap-1 pr-3 pl-1 text-sm"
              >
                <ChevronLeft className="size-5" aria-hidden />
                Back
              </button>
            ) : (
              <Wordmark />
            )}
            <Dialog.Close
              aria-label="Close menu"
              className="-mr-2 inline-flex size-10 items-center justify-center rounded-sm hover:bg-moon/10"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-10">
            {active ? (
              <PanelView panel={active} />
            ) : (
              <RootView
                panels={panels}
                onSelect={setActive}
                isSignedIn={isSignedIn}
                isStaff={isStaff}
              />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function RootView({
  panels,
  onSelect,
  isSignedIn,
  isStaff,
}: {
  panels: MenuPanel[];
  onSelect: (panel: MenuPanel) => void;
  isSignedIn: boolean;
  isStaff: boolean;
}) {
  const cart = useCart();
  const wishlist = useWishlist();
  return (
    <nav aria-label="Main" className="flex flex-col">
      <ul className="flex flex-col">
        {panels.map((panel) => (
          <li key={panel.id}>
            <button type="button" onClick={() => onSelect(panel)} className={row}>
              <span className="display text-xl">{panel.label}</span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <ul className="mt-8 flex flex-col text-base">
        <li>
          <Link href={isSignedIn ? "/account" : "/login"} className={cn(row, "text-base")}>
            {isSignedIn ? "Account" : "Sign in"}
          </Link>
        </li>
        <li>
          <Link href={wishlist.href} className={cn(row, "text-base")}>
            Wishlist
            {wishlist.count > 0 ? (
              <span className="text-sm text-muted-foreground num">{wishlist.count}</span>
            ) : null}
          </Link>
        </li>
        <li>
          <Link href="/cart" className={cn(row, "text-base")}>
            Bag
            {cart.view.itemCount > 0 ? (
              <span className="text-sm text-muted-foreground num">{cart.view.itemCount}</span>
            ) : null}
          </Link>
        </li>
        <li>
          <Link href="/track" className={cn(row, "text-base")}>
            Track order
          </Link>
        </li>
        {isStaff ? (
          <li>
            <Link href="/admin" className={cn(row, "text-base text-muted-foreground")}>
              Admin
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}

function PanelView({ panel }: { panel: MenuPanel }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1 pt-2">
        <h2 className="text-xl">{panel.label}</h2>
        <Link href={panel.url} className="text-sm underline underline-offset-4 hover:text-primary">
          Shop all {panel.label.toLowerCase()}
        </Link>
      </div>

      {panel.groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{group.title}</p>
          <ul className="flex flex-col">
            {group.links.map((link) => (
              <li key={link.id}>
                <Link href={link.url} className="block py-2 text-base hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {panel.tiles.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {panel.tiles.slice(0, 2).map((tile) => (
            <Link
              key={tile.id}
              href={tile.url}
              className="relative block aspect-[4/5] overflow-hidden bg-slate"
            >
              {tile.image ? (
                <Image src={tile.image} alt="" fill sizes="45vw" className="object-cover" />
              ) : null}
              <span className="absolute inset-0 scrim-b" aria-hidden />
              <span className="absolute bottom-3 left-3 text-sm font-medium text-moon">
                {tile.label}
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
