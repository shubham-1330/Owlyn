import type { BannerSlot } from "@prisma/client";

export type BannerSeed = {
  id: string;
  slot: BannerSlot;
  name: string;
  headline: string;
  subhead?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  position: number;
  isActive: boolean;
  startsInDays?: number;
  endsInDays?: number;
  bg: string;
  accent: string;
  width: number;
  height: number;
};

export const banners: BannerSeed[] = [
  {
    id: "seed-banner-hero-autumn",
    slot: "HERO",
    name: "Hero: autumn drop",
    headline: "For the hours nobody sees.",
    subhead: "New footwear and layers for early starts.",
    ctaLabel: "Shop Night Run",
    ctaUrl: "/collections/night-run",
    position: 0,
    isActive: true,
    bg: "#0E1116",
    accent: "#C79A4B",
    width: 1920,
    height: 1080,
  },
  {
    id: "seed-banner-hero-court",
    slot: "HERO",
    name: "Hero: Court Edit (scheduled)",
    headline: "Court Edit.",
    subhead: "Leather that ages. Cotton that softens.",
    ctaLabel: "Shop the edit",
    ctaUrl: "/collections/court-edit",
    position: 1,
    isActive: true,
    startsInDays: 14,
    endsInDays: 45,
    bg: "#F3F4F2",
    accent: "#46407A",
    width: 1920,
    height: 1080,
  },
  {
    id: "seed-banner-home-cold-start",
    slot: "HOME_SECONDARY",
    name: "Home: Cold Start block",
    headline: "Cold Start",
    subhead: "Fleece, shells and quilts for the early half of winter.",
    ctaLabel: "Shop Cold Start",
    ctaUrl: "/collections/cold-start",
    position: 0,
    isActive: true,
    bg: "#1B2129",
    accent: "#8B9199",
    width: 1600,
    height: 900,
  },
  {
    id: "seed-banner-editorial-men",
    slot: "EDITORIAL_MEN",
    name: "Editorial: Men",
    headline: "Men",
    subhead: "Footwear, clothing, accessories.",
    ctaLabel: "Shop men",
    ctaUrl: "/collections/men",
    position: 0,
    isActive: true,
    bg: "#2A313B",
    accent: "#C79A4B",
    width: 1200,
    height: 1500,
  },
  {
    id: "seed-banner-editorial-women",
    slot: "EDITORIAL_WOMEN",
    name: "Editorial: Women",
    headline: "Women",
    subhead: "Footwear, clothing, accessories.",
    ctaLabel: "Shop women",
    ctaUrl: "/collections/women",
    position: 0,
    isActive: true,
    bg: "#46407A",
    accent: "#F3F4F2",
    width: 1200,
    height: 1500,
  },
];

export type MenuItemSeed = {
  id: string;
  label: string;
  url: string;
  group?: string;
  children?: MenuItemSeed[];
};

/**
 * Main navigation. Virtual collection slugs (new, bestsellers, footwear, clothing,
 * accessories) are resolved by the PLP in Phase 3 alongside real category and
 * collection slugs.
 */
export const mainMenu: MenuItemSeed[] = [
  {
    id: "seed-menu-featured",
    label: "Featured",
    url: "/collections/new",
    children: [
      {
        id: "seed-menu-featured-c1",
        label: "Night Run",
        url: "/collections/night-run",
        group: "By collection",
      },
      {
        id: "seed-menu-featured-c2",
        label: "Court Edit",
        url: "/collections/court-edit",
        group: "By collection",
      },
      {
        id: "seed-menu-featured-c3",
        label: "Cold Start",
        url: "/collections/cold-start",
        group: "By collection",
      },
      {
        id: "seed-menu-featured-p1",
        label: "New this week",
        url: "/collections/new",
        group: "By product",
      },
      {
        id: "seed-menu-featured-p2",
        label: "Bestsellers",
        url: "/collections/bestsellers",
        group: "By product",
      },
      {
        id: "seed-menu-featured-p3",
        label: "Footwear",
        url: "/collections/footwear",
        group: "By product",
      },
      {
        id: "seed-menu-featured-p4",
        label: "Clothing",
        url: "/collections/clothing",
        group: "By product",
      },
      {
        id: "seed-menu-featured-p5",
        label: "Accessories",
        url: "/collections/accessories",
        group: "By product",
      },
      {
        id: "seed-menu-featured-a1",
        label: "Running",
        url: "/collections/footwear?activity=running",
        group: "By activity",
      },
      {
        id: "seed-menu-featured-a2",
        label: "Training",
        url: "/collections/footwear?activity=training",
        group: "By activity",
      },
      {
        id: "seed-menu-featured-a3",
        label: "Court",
        url: "/collections/court-edit",
        group: "By activity",
      },
      {
        id: "seed-menu-featured-a4",
        label: "Everyday",
        url: "/collections/clothing?activity=everyday",
        group: "By activity",
      },
    ],
  },
  {
    id: "seed-menu-women",
    label: "Women",
    url: "/collections/women",
    children: [
      {
        id: "seed-menu-women-c1",
        label: "Night Run",
        url: "/collections/night-run?gender=women",
        group: "By collection",
      },
      {
        id: "seed-menu-women-c2",
        label: "Court Edit",
        url: "/collections/court-edit?gender=women",
        group: "By collection",
      },
      {
        id: "seed-menu-women-c3",
        label: "Cold Start",
        url: "/collections/cold-start?gender=women",
        group: "By collection",
      },
      {
        id: "seed-menu-women-p1",
        label: "Sneakers",
        url: "/collections/women-sneakers",
        group: "By product",
      },
      {
        id: "seed-menu-women-p2",
        label: "Running shoes",
        url: "/collections/women-running-shoes",
        group: "By product",
      },
      {
        id: "seed-menu-women-p3",
        label: "Training shoes",
        url: "/collections/women-training-shoes",
        group: "By product",
      },
      {
        id: "seed-menu-women-p4",
        label: "T-shirts",
        url: "/collections/women-t-shirts",
        group: "By product",
      },
      {
        id: "seed-menu-women-p5",
        label: "Jackets",
        url: "/collections/women-jackets",
        group: "By product",
      },
      {
        id: "seed-menu-women-p6",
        label: "Sweatshirts",
        url: "/collections/women-sweatshirts",
        group: "By product",
      },
      {
        id: "seed-menu-women-p7",
        label: "Joggers",
        url: "/collections/women-joggers",
        group: "By product",
      },
      {
        id: "seed-menu-women-p8",
        label: "Shorts",
        url: "/collections/women-shorts",
        group: "By product",
      },
      {
        id: "seed-menu-women-a1",
        label: "Running",
        url: "/collections/women?activity=running",
        group: "By activity",
      },
      {
        id: "seed-menu-women-a2",
        label: "Training",
        url: "/collections/women?activity=training",
        group: "By activity",
      },
      {
        id: "seed-menu-women-a3",
        label: "Everyday",
        url: "/collections/women?activity=everyday",
        group: "By activity",
      },
    ],
  },
  {
    id: "seed-menu-men",
    label: "Men",
    url: "/collections/men",
    children: [
      {
        id: "seed-menu-men-c1",
        label: "Night Run",
        url: "/collections/night-run?gender=men",
        group: "By collection",
      },
      {
        id: "seed-menu-men-c2",
        label: "Court Edit",
        url: "/collections/court-edit?gender=men",
        group: "By collection",
      },
      {
        id: "seed-menu-men-c3",
        label: "Cold Start",
        url: "/collections/cold-start?gender=men",
        group: "By collection",
      },
      {
        id: "seed-menu-men-p1",
        label: "Sneakers",
        url: "/collections/men-sneakers",
        group: "By product",
      },
      {
        id: "seed-menu-men-p2",
        label: "Running shoes",
        url: "/collections/men-running-shoes",
        group: "By product",
      },
      {
        id: "seed-menu-men-p3",
        label: "Training shoes",
        url: "/collections/men-training-shoes",
        group: "By product",
      },
      {
        id: "seed-menu-men-p4",
        label: "T-shirts",
        url: "/collections/men-t-shirts",
        group: "By product",
      },
      {
        id: "seed-menu-men-p5",
        label: "Polos",
        url: "/collections/men-polos",
        group: "By product",
      },
      {
        id: "seed-menu-men-p6",
        label: "Jackets",
        url: "/collections/men-jackets",
        group: "By product",
      },
      {
        id: "seed-menu-men-p7",
        label: "Joggers",
        url: "/collections/men-joggers",
        group: "By product",
      },
      {
        id: "seed-menu-men-p8",
        label: "Shorts",
        url: "/collections/men-shorts",
        group: "By product",
      },
      {
        id: "seed-menu-men-a1",
        label: "Running",
        url: "/collections/men?activity=running",
        group: "By activity",
      },
      {
        id: "seed-menu-men-a2",
        label: "Training",
        url: "/collections/men?activity=training",
        group: "By activity",
      },
      {
        id: "seed-menu-men-a3",
        label: "Everyday",
        url: "/collections/men?activity=everyday",
        group: "By activity",
      },
    ],
  },
];

export const footerMenus: Record<string, MenuItemSeed[]> = {
  "footer-shop": [
    { id: "seed-footer-shop-1", label: "Men", url: "/collections/men" },
    { id: "seed-footer-shop-2", label: "Women", url: "/collections/women" },
    { id: "seed-footer-shop-3", label: "Footwear", url: "/collections/footwear" },
    { id: "seed-footer-shop-4", label: "Clothing", url: "/collections/clothing" },
    { id: "seed-footer-shop-5", label: "Accessories", url: "/collections/accessories" },
  ],
  "footer-help": [
    { id: "seed-footer-help-1", label: "Track order", url: "/track" },
    { id: "seed-footer-help-2", label: "Shipping", url: "/pages/shipping" },
    { id: "seed-footer-help-3", label: "Returns and exchanges", url: "/pages/returns" },
    { id: "seed-footer-help-4", label: "Questions", url: "/pages/faqs" },
    { id: "seed-footer-help-5", label: "Contact", url: "/pages/contact" },
  ],
  "footer-company": [
    { id: "seed-footer-company-1", label: "About", url: "/pages/about" },
    { id: "seed-footer-company-2", label: "Warranty", url: "/pages/warranty" },
    { id: "seed-footer-company-3", label: "Privacy", url: "/pages/privacy" },
    { id: "seed-footer-company-4", label: "Terms", url: "/pages/terms" },
    { id: "seed-footer-company-5", label: "Cookies", url: "/pages/cookies" },
  ],
};

export type HomepageSectionSeed = {
  key: string;
  title: string;
  config?: Record<string, unknown>;
};

export const homepageSections: HomepageSectionSeed[] = [
  { key: "hero", title: "Hero" },
  { key: "featured-rail", title: "Featured products", config: { limit: 8 } },
  { key: "category-tiles", title: "Shop by category" },
  {
    key: "collection-block",
    title: "Curated collection",
    config: { bannerSlot: "HOME_SECONDARY" },
  },
  { key: "new-rail", title: "New this week", config: { limit: 8, days: 14 } },
  { key: "editorial-split", title: "Men and women" },
  { key: "newsletter", title: "Newsletter" },
  { key: "trust-strip", title: "Trust strip" },
];

export type SettingSeed = { key: string; value: unknown };

export const settings: SettingSeed[] = [
  { key: "store.name", value: "Owlyn" },
  { key: "store.tagline", value: "For the hours nobody sees." },
  { key: "store.legalName", value: "Owlyn Apparel Private Limited" },
  { key: "store.gstin", value: "" },
  {
    key: "store.address",
    value: {
      line1: "42, 1st Main Road",
      line2: "Indiranagar",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560038",
      country: "IN",
    },
  },
  { key: "support.email", value: "support@owlyn.example" },
  { key: "support.phone", value: "+91 80 4000 0000" },
  { key: "support.hours", value: "Weekdays 10 am to 6 pm IST" },
  { key: "checkout.codLimit", value: 1_000_000 },
  { key: "checkout.codFee", value: 0 },
  { key: "shipping.freeThreshold", value: 199_900 },
  { key: "shipping.dispatchCutoffHour", value: 14 },
  { key: "returns.windowDays", value: 7 },
  { key: "returns.warrantyDays", value: 90 },
  { key: "orders.reservationMinutes", value: 20 },
  { key: "maintenance.enabled", value: false },
  { key: "maintenance.message", value: "We are updating the store. Back within the hour." },
  { key: "social", value: { instagram: "https://instagram.com/owlyn.example", youtube: "" } },
];
