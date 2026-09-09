import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CONTAINER, GUTTER } from "@/lib/layout";
import type { BannerData } from "@/lib/queries/home";
import { cn } from "@/lib/utils";

/** Two tall tiles side by side, one per banner (Men, Women). */
export function EditorialSplit({ banners }: { banners: BannerData[] }) {
  if (banners.length === 0) return null;

  return (
    <section className="py-16 md:py-24" aria-label="Shop by gender">
      <div className={cn(CONTAINER, GUTTER, "grid gap-3 md:grid-cols-2 md:gap-4")}>
        {banners.map((banner) => {
          const hasCta = Boolean(banner.ctaLabel && banner.ctaUrl);
          return (
            <article
              key={banner.id}
              className="relative aspect-[4/5] overflow-hidden bg-slate text-moon md:aspect-[3/4]"
            >
              <Image
                src={banner.image}
                alt=""
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 scrim-b" aria-hidden />
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-4 p-6 md:p-8">
                <h2 className="text-2xl md:text-3xl">{banner.headline}</h2>
                {banner.subhead ? <p className="text-moon/85">{banner.subhead}</p> : null}
                {hasCta ? (
                  <Button
                    asChild
                    variant="outline"
                    className="border-moon/70 text-moon hover:border-moon hover:text-moon"
                  >
                    <Link href={banner.ctaUrl!}>{banner.ctaLabel}</Link>
                  </Button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
