"use client";

import Image from "next/image";
import Link from "next/link";
import { NavigationMenu } from "radix-ui";

import { CONTAINER, GUTTER } from "@/lib/layout";
import type { MenuLink, MenuPanel } from "@/lib/queries/menu";
import { cn } from "@/lib/utils";

/**
 * Desktop navigation on Radix NavigationMenu: hover or keyboard opens a
 * full-width panel with grouped link columns and two image tiles.
 */
export function MegaMenu({
  panels,
  onOpenChange,
}: {
  panels: MenuPanel[];
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <NavigationMenu.Root
      className="static"
      delayDuration={120}
      skipDelayDuration={400}
      onValueChange={(value) => onOpenChange(Boolean(value))}
    >
      <NavigationMenu.List className="flex items-center gap-1">
        {panels.map((panel) => (
          <NavigationMenu.Item key={panel.id} value={panel.id} className="static">
            <NavigationMenu.Trigger
              className={cn(
                "inline-flex h-16 items-center px-3 text-sm font-medium transition-colors",
                "hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ring data-[state=open]:text-primary",
              )}
            >
              {panel.label}
            </NavigationMenu.Trigger>
            <NavigationMenu.Content className="fixed inset-x-0 top-16 border-t border-border bg-slate text-foreground data-[state=open]:animate-slide-down">
              <Panel panel={panel} />
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        ))}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}

function Panel({ panel }: { panel: MenuPanel }) {
  return (
    <div
      className={cn(
        CONTAINER,
        GUTTER,
        "grid grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.6fr)] gap-x-10 py-10",
      )}
    >
      {panel.groups.map((group, index) => (
        <div key={group.title} className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{group.title}</p>
          <ul className="flex flex-col gap-2.5">
            {group.links.map((link) => (
              <li key={link.id}>
                <NavigationMenu.Link asChild>
                  <Link href={link.url} className="text-base leading-tight hover:text-primary">
                    {link.label}
                  </Link>
                </NavigationMenu.Link>
              </li>
            ))}
            {index === 0 ? (
              <li className="pt-2">
                <NavigationMenu.Link asChild>
                  <Link
                    href={panel.url}
                    className="text-sm underline underline-offset-4 hover:text-primary"
                  >
                    Shop all {panel.label.toLowerCase()}
                  </Link>
                </NavigationMenu.Link>
              </li>
            ) : null}
          </ul>
        </div>
      ))}
      {panel.tiles.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {panel.tiles.slice(0, 2).map((tile) => (
            <Tile key={tile.id} tile={tile} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Tile({ tile }: { tile: MenuLink }) {
  return (
    <NavigationMenu.Link asChild>
      <Link href={tile.url} className="group relative block aspect-[4/5] overflow-hidden bg-slate">
        {tile.image ? (
          <Image
            src={tile.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 18vw, 40vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : null}
        <span className="absolute inset-0 scrim-b" aria-hidden />
        <span className="absolute bottom-4 left-4 text-base font-medium text-moon">
          {tile.label}
        </span>
      </Link>
    </NavigationMenu.Link>
  );
}
