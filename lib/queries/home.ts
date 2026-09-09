import type { BannerSlot } from "@prisma/client";

import { CACHE_TAGS, cached } from "@/lib/cache";
import { db } from "@/lib/db";

export type HomeSection = { key: string; title: string; config: Record<string, unknown> };

export const getHomepageSections = cached(
  async (): Promise<HomeSection[]> => {
    const rows = await db.homepageSection.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      select: { key: true, title: true, config: true },
    });
    return rows.map((row) => ({
      key: row.key,
      title: row.title,
      config:
        row.config && typeof row.config === "object" && !Array.isArray(row.config)
          ? (row.config as Record<string, unknown>)
          : {},
    }));
  },
  ["home:sections"],
  [CACHE_TAGS.home],
);

export type BannerData = {
  id: string;
  slot: BannerSlot;
  name: string;
  headline: string;
  subhead: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  image: string;
  mobileImage: string | null;
  videoUrl: string | null;
};

/** Active banners for a slot whose schedule window includes now, in position order. */
export const getActiveBanners = cached(
  async (slot: BannerSlot): Promise<BannerData[]> => {
    const now = new Date();
    const rows = await db.banner.findMany({
      where: {
        slot,
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { position: "asc" },
      select: {
        id: true,
        slot: true,
        name: true,
        headline: true,
        subhead: true,
        ctaLabel: true,
        ctaUrl: true,
        image: true,
        mobileImage: true,
        videoUrl: true,
      },
    });
    return rows;
  },
  ["banners:active"],
  [CACHE_TAGS.banners],
  120,
);
