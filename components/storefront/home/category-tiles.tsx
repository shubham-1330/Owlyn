import Image from "next/image";
import Link from "next/link";
import { z } from "zod";

import { SectionHeading } from "@/components/storefront/section-heading";
import { CONTAINER, GUTTER } from "@/lib/layout";
import { cn } from "@/lib/utils";

export const categoryTilesConfigSchema = z.object({
  tiles: z
    .array(
      z.object({
        label: z.string().min(1),
        href: z.string().min(1),
        image: z.string().min(1),
      }),
    )
    .min(1)
    .max(6),
});

export type CategoryTile = z.infer<typeof categoryTilesConfigSchema>["tiles"][number];

export function CategoryTiles({ title, tiles }: { title: string; tiles: CategoryTile[] }) {
  return (
    <section className="py-16 md:py-24" aria-labelledby="category-tiles-heading">
      <div className={cn(CONTAINER, GUTTER)}>
        <SectionHeading id="category-tiles-heading" title={title} />
        <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {tiles.map((tile) => (
            <li key={tile.href}>
              <Link
                href={tile.href}
                className="group relative block aspect-[4/5] overflow-hidden bg-slate text-moon"
              >
                <Image
                  src={tile.image}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <span className="absolute inset-0 scrim-b" aria-hidden />
                <span className="absolute bottom-4 left-4 display text-lg md:text-xl">
                  {tile.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
