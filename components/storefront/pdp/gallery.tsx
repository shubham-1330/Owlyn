"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ProductMedia } from "@/lib/queries/product";
import { cn } from "@/lib/utils";

/**
 * One scroll-snap strip serves every screen: swipe on touch, thumbnails and
 * arrows on desktop, hover-to-zoom where a fine pointer exists. Every slide
 * is a fixed 3:4 box so the gallery never shifts layout while images load.
 */
export function Gallery({
  media,
  productName,
  resetKey,
}: {
  media: ProductMedia[];
  productName: string;
  resetKey: string;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    setCanHover(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);

  useEffect(() => {
    setIndex(0);
    strip.current?.scrollTo({ left: 0 });
  }, [resetKey]);

  const goTo = useCallback(
    (next: number) => {
      const el = strip.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(next, media.length - 1));
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({ left: clamped * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
      setIndex(clamped);
    },
    [media.length],
  );

  const onScroll = () => {
    const el = strip.current;
    if (!el || el.clientWidth === 0) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index) setIndex(next);
  };

  const onMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!canHover) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setZoom({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  };

  if (media.length === 0) {
    return <div className="aspect-[3/4] w-full bg-slate" aria-hidden />;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[4rem_minmax(0,1fr)] lg:gap-4">
      <ol className="order-2 hidden flex-col gap-2 lg:order-1 lg:flex" aria-label="Product images">
        {media.map((item, i) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show image ${i + 1} of ${media.length}`}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "relative block aspect-[3/4] w-16 overflow-hidden border bg-slate transition-colors",
                i === index ? "border-foreground" : "border-transparent hover:border-fog",
              )}
            >
              {item.kind === "VIDEO" ? (
                <video
                  src={item.url}
                  poster={item.posterUrl ?? undefined}
                  muted
                  playsInline
                  preload="metadata"
                  className="size-full object-cover"
                />
              ) : (
                <Image src={item.url} alt="" fill sizes="64px" className="object-cover" />
              )}
            </button>
          </li>
        ))}
      </ol>

      <div className="relative order-1 lg:order-2">
        <div
          ref={strip}
          onScroll={onScroll}
          role="region"
          aria-roledescription="carousel"
          aria-label={`${productName} images`}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        >
          {media.map((item, i) => (
            <div
              key={item.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${media.length}`}
              onMouseMove={i === index ? onMove : undefined}
              onMouseLeave={() => setZoom(null)}
              className="relative aspect-[3/4] w-full shrink-0 snap-center overflow-hidden border border-border bg-slate"
            >
              {item.kind === "VIDEO" ? (
                <video
                  src={item.url}
                  poster={item.posterUrl ?? undefined}
                  controls
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <Image
                  src={item.url}
                  alt={item.alt}
                  fill
                  priority={i === 0}
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  placeholder={item.blurData ? "blur" : "empty"}
                  blurDataURL={item.blurData ?? undefined}
                  className={cn(
                    "object-cover transition-transform duration-150 motion-reduce:transition-none",
                    zoom && i === index && "lg:scale-[1.8]",
                  )}
                  style={
                    zoom && i === index ? { transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined
                  }
                />
              )}
            </div>
          ))}
        </div>

        {media.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              aria-label="Previous image"
              className="absolute top-1/2 left-3 hidden size-10 -translate-y-1/2 items-center justify-center rounded-sm bg-ink/70 text-moon hover:bg-ink disabled:opacity-30 lg:flex"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              disabled={index === media.length - 1}
              aria-label="Next image"
              className="absolute top-1/2 right-3 hidden size-10 -translate-y-1/2 items-center justify-center rounded-sm bg-ink/70 text-moon hover:bg-ink disabled:opacity-30 lg:flex"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
            <ol
              className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden"
              aria-hidden
            >
              {media.map((item, i) => (
                <li
                  key={item.id}
                  className={cn(
                    "h-1 w-4 rounded-xs transition-colors",
                    i === index ? "bg-moon" : "bg-moon/35",
                  )}
                />
              ))}
            </ol>
            <p className="sr-only" aria-live="polite">
              Image {index + 1} of {media.length}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
