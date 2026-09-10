import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CONTAINER, GUTTER } from "@/lib/layout";
import type { BannerData } from "@/lib/queries/home";
import { cn } from "@/lib/utils";

/**
 * Full-bleed hero. Poster image always renders; a muted looping video sits on
 * top when one is set and the visitor has not asked for reduced motion.
 * Headline bottom-left, one CTA. Starts below the solid header.
 */
export function Hero({ banner }: { banner: BannerData }) {
  const hasCta = Boolean(banner.ctaLabel && banner.ctaUrl);

  return (
    <section
      data-hero
      aria-label={banner.name}
      className="relative flex min-h-[78svh] items-end overflow-hidden bg-ink text-moon"
    >
      <Image
        src={banner.image}
        alt=""
        fill
        priority
        sizes="100vw"
        className={cn("object-cover", banner.mobileImage && "hidden md:block")}
      />
      {banner.mobileImage ? (
        <Image
          src={banner.mobileImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover md:hidden"
        />
      ) : null}
      {banner.videoUrl ? (
        <video
          className="absolute inset-0 size-full object-cover motion-reduce:hidden"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={banner.image}
          aria-hidden
        >
          <source src={banner.videoUrl} />
        </video>
      ) : null}

            <div className="absolute inset-x-0 bottom-0 h-3/5 scrim-b" aria-hidden />

      <div className={cn(CONTAINER, GUTTER, "relative flex flex-col gap-6 pt-24 pb-14 md:pb-20")}>
        <h1 className="max-w-[14ch] text-2xl sm:text-3xl xl:text-4xl">{banner.headline}</h1>
        {banner.subhead ? <p className="max-w-md text-lg text-moon/85">{banner.subhead}</p> : null}
        {hasCta ? (
          <Button asChild size="lg" className="w-fit">
            <Link href={banner.ctaUrl!}>{banner.ctaLabel}</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
