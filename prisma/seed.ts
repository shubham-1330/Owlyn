import { PrismaClient, type Prisma } from "@prisma/client";

import { hashPassword } from "../lib/auth/password";
import { rupeesToPaise } from "../lib/money";
import { findZoneForPincode } from "../lib/shipping";
import { slugify } from "../lib/slug";
import { gstRateFor } from "../lib/tax";
import { attributes } from "./seed/data/attributes";
import { categoryTree, leafSlug, type CategorySeed } from "./seed/data/categories";
import { collections } from "./seed/data/collections";
import {
  banners,
  footerMenus,
  homepageSections,
  mainMenu,
  settings,
  type MenuItemSeed,
} from "./seed/data/content";
import { coupons } from "./seed/data/coupons";
import { pages } from "./seed/data/pages";
import { products, sizesFor, type ProductSeed, type StockPattern } from "./seed/data/products";
import { pincodes, zones } from "./seed/data/shipping";
import { sizeCharts } from "./seed/data/size-charts";
import { users } from "./seed/data/users";
import { productSvg, tileSvg, writeSvg } from "./seed/lib/placeholders";
import { createRandom } from "./seed/lib/random";

const db = new PrismaClient();
const random = createRandom(20260909);
const now = new Date();

function daysFromNow(days: number): Date {
  return new Date(now.getTime() + days * 86_400_000);
}

function colorCode(name: string): string {
  return slugify(name).replace(/-/g, "").slice(0, 3).toUpperCase();
}

function sizeCode(size: string): string {
  return size.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function stockFor(pattern: StockPattern, sizeIndex: number, sizeCount: number): number {
  switch (pattern) {
    case "out":
      return 0;
    case "low":
      return random.int(0, 3);
    case "mixed": {
      const middle = Math.abs(sizeIndex - (sizeCount - 1) / 2) < 1.2;
      return middle ? random.int(0, 2) : random.int(6, 20);
    }
    case "high":
    default:
      return random.int(12, 40);
  }
}

// ---------------------------------------------------------------------------

async function seedSettings() {
  for (const s of settings) {
    await db.setting.upsert({
      where: { key: s.key },
      update: { value: s.value as Prisma.InputJsonValue },
      create: { key: s.key, value: s.value as Prisma.InputJsonValue },
    });
  }
  return settings.length;
}

async function seedUsers() {
  const ids = new Map<string, string>();
  for (const u of users) {
    const passwordHash = await hashPassword(u.password);
    const user = await db.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, phone: u.phone, passwordHash, emailVerified: now },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        phone: u.phone,
        passwordHash,
        emailVerified: now,
      },
    });
    ids.set(u.key, user.id);
    for (const a of u.addresses ?? []) {
      await db.address.upsert({
        where: { id: a.id },
        update: { ...a, userId: user.id },
        create: { ...a, userId: user.id },
      });
    }
  }
  return ids;
}

async function seedAttributes() {
  /** attributeSlug -> valueSlug -> AttributeValue.id */
  const map = new Map<string, Map<string, string>>();
  for (const [i, attr] of attributes.entries()) {
    const attribute = await db.attribute.upsert({
      where: { slug: attr.slug },
      update: { name: attr.name, position: i },
      create: { slug: attr.slug, name: attr.name, position: i },
    });
    const values = new Map<string, string>();
    for (const [j, value] of attr.values.entries()) {
      const valueSlug = slugify(value);
      const row = await db.attributeValue.upsert({
        where: { attributeId_slug: { attributeId: attribute.id, slug: valueSlug } },
        update: { value, position: j },
        create: { attributeId: attribute.id, value, slug: valueSlug, position: j },
      });
      values.set(valueSlug, row.id);
    }
    map.set(attr.slug, values);
  }
  return map;
}

async function seedSizeCharts() {
  const ids = new Map<string, string>();
  for (const chart of sizeCharts) {
    const row = await db.sizeChart.upsert({
      where: { key: chart.key },
      update: { name: chart.name, rows: chart.rows as Prisma.InputJsonValue },
      create: { key: chart.key, name: chart.name, rows: chart.rows as Prisma.InputJsonValue },
    });
    ids.set(chart.key, row.id);
  }
  return ids;
}

async function seedCategories(sizeChartIds: Map<string, string>) {
  const ids = new Map<string, string>();
  let count = 0;

  async function walk(nodes: CategorySeed[], parentId: string | null, depth: number) {
    for (const [i, node] of nodes.entries()) {
      const isLeaf = !node.children?.length;
      const image = isLeaf
        ? writeSvg(
            `images/categories/${node.slug}.svg`,
            tileSvg({
              title: node.name,
              subtitle: parentId ? undefined : node.description,
              width: 800,
              height: 1000,
              bg: depth === 0 ? "#1B2129" : "#46407A",
              accent: "#C79A4B",
            }),
          )
        : writeSvg(
            `images/categories/${node.slug}.svg`,
            tileSvg({
              title: node.name,
              width: 800,
              height: 1000,
              bg: depth === 0 ? "#0E1116" : "#1B2129",
              accent: depth === 0 ? "#C79A4B" : "#46407A",
            }),
          );
      const data = {
        name: node.name,
        description: node.description,
        parentId,
        position: i,
        image,
        isActive: true,
        deletedAt: null,
        sizeChartId: node.sizeChart ? (sizeChartIds.get(node.sizeChart) ?? null) : null,
        metaTitle: `${node.name} | Owlyn`,
        metaDescription: node.description,
      };
      const row = await db.category.upsert({
        where: { slug: node.slug },
        update: data,
        create: { slug: node.slug, ...data },
      });
      ids.set(node.slug, row.id);
      count += 1;
      if (node.children?.length) await walk(node.children, row.id, depth + 1);
    }
  }

  await walk(categoryTree, null, 0);
  return { ids, count };
}

async function seedCollections() {
  const ids = new Map<string, string>();
  for (const [i, c] of collections.entries()) {
    const heroImage = writeSvg(
      `images/collections/${c.slug}.svg`,
      tileSvg({
        title: c.name,
        subtitle: c.metaDescription,
        width: 1600,
        height: 900,
        bg: c.bg,
        accent: c.accent,
      }),
    );
    const data = {
      name: c.name,
      description: c.description,
      heroImage,
      isActive: true,
      position: i,
      endsAt: c.daysUntilEnd ? daysFromNow(c.daysUntilEnd) : null,
      metaTitle: `${c.name} | Owlyn`,
      metaDescription: c.metaDescription,
    };
    const row = await db.collection.upsert({
      where: { slug: c.slug },
      update: data,
      create: { slug: c.slug, ...data },
    });
    ids.set(c.slug, row.id);
  }
  return ids;
}

type CatalogIds = {
  categories: Map<string, string>;
  collections: Map<string, string>;
  attributeValues: Map<string, Map<string, string>>;
};

async function seedProduct(p: ProductSeed, ids: CatalogIds) {
  const basePrice = rupeesToPaise(p.price);
  const compareAtPrice = p.compareAt ? rupeesToPaise(p.compareAt) : null;
  const roots: Array<"men" | "women"> =
    p.gender === "MEN" ? ["men"] : p.gender === "WOMEN" ? ["women"] : ["men", "women"];
  const categoryIds = roots.map((root) => {
    const id = ids.categories.get(leafSlug(root, p.type));
    if (!id) throw new Error(`Missing category ${leafSlug(root, p.type)} for ${p.slug}`);
    return id;
  });
  const attributeValueIds = Object.entries(p.attributes).map(([attr, value]) => {
    const id = ids.attributeValues.get(attr)?.get(slugify(value));
    if (!id) throw new Error(`Missing attribute value ${attr}=${value} for ${p.slug}`);
    return id;
  });
  const badges = p.badges ?? [];
  const publishedAt = daysFromNow(-p.daysAgo);

  const data = {
    name: p.name,
    description: p.description,
    shortDescription: p.short,
    brandLine: p.brandLine,
    gender: p.gender,
    status: "ACTIVE" as const,
    basePrice,
    compareAtPrice,
    taxRate: gstRateFor(p.hsn, basePrice),
    hsnCode: p.hsn,
    isFeatured: p.featured ?? false,
    badges,
    materials: p.materials,
    careInstructions: p.care,
    metaTitle: `${p.name} | ${p.brandLine} by Owlyn`,
    metaDescription: p.short,
    salesCount: p.sales,
    publishedAt,
    deletedAt: null,
    primaryCategoryId: categoryIds[0] ?? null,
    categories: { set: categoryIds.map((id) => ({ id })) },
    attributeValues: { set: attributeValueIds.map((id) => ({ id })) },
  };

  const product = await db.product.upsert({
    where: { slug: p.slug },
    update: data,
    create: {
      slug: p.slug,
      ...data,
      categories: { connect: categoryIds.map((id) => ({ id })) },
      attributeValues: { connect: attributeValueIds.map((id) => ({ id })) },
    },
  });

  // Variants: size × colour. SKUs are stable across runs.
  const sizes = sizesFor(p.kind, p.gender);
  const pattern = p.stock ?? "high";
  const skus: string[] = [];
  let position = 0;
  for (const color of p.colors) {
    for (const [sizeIndex, size] of sizes.entries()) {
      const sku = `${p.code}-${colorCode(color.name)}-${sizeCode(size)}`;
      skus.push(sku);
      const stock = stockFor(pattern, sizeIndex, sizes.length);
      const variant = {
        productId: product.id,
        size,
        colorName: color.name,
        colorHex: color.hex,
        stock,
        lowStockThreshold: p.kind === "footwear" ? 3 : 5,
        weightGrams: p.weightGrams,
        position: position++,
        isActive: true,
        barcode: `890${p.code.replace(/\D/g, "").padStart(4, "0")}${String(position).padStart(3, "0")}`,
      };
      await db.productVariant.upsert({
        where: { sku },
        update: variant,
        create: { sku, ...variant },
      });
    }
  }
  await db.productVariant.deleteMany({ where: { productId: product.id, sku: { notIn: skus } } });

  // Images: two views per colour, regenerated each run.
  await db.productImage.deleteMany({ where: { productId: product.id } });
  const variantsByColor = await db.productVariant.findMany({
    where: { productId: product.id },
    select: { id: true, colorName: true },
    orderBy: { position: "asc" },
  });
  let imagePosition = 0;
  for (const color of p.colors) {
    const firstVariant = variantsByColor.find((v) => v.colorName === color.name);
    for (const view of [1, 2] as const) {
      const url = writeSvg(
        `images/products/${p.slug}-${slugify(color.name)}-${view}.svg`,
        productSvg({
          name: p.name,
          line: p.brandLine,
          colorName: color.name,
          colorHex: color.hex,
          view,
        }),
      );
      await db.productImage.create({
        data: {
          productId: product.id,
          variantId: firstVariant?.id ?? null,
          url,
          alt: `${p.name} in ${color.name}${view === 2 ? ", detail" : ""}`,
          width: 900,
          height: 1200,
          position: imagePosition,
          isPrimary: imagePosition === 0,
        },
      });
      imagePosition += 1;
    }
  }

  // Collections
  for (const [i, slug] of (p.collections ?? []).entries()) {
    const collectionId = ids.collections.get(slug);
    if (!collectionId) throw new Error(`Missing collection ${slug} for ${p.slug}`);
    await db.collectionProduct.upsert({
      where: { collectionId_productId: { collectionId, productId: product.id } },
      update: { position: i },
      create: { collectionId, productId: product.id, position: i },
    });
  }

  return { id: product.id, variants: skus.length, images: p.colors.length * 2 };
}

async function seedProductRelations(productIds: Map<string, string>) {
  let count = 0;
  for (const p of products) {
    const productId = productIds.get(p.slug);
    if (!productId) continue;
    for (const [i, relatedSlug] of (p.related ?? []).entries()) {
      const relatedProductId = productIds.get(relatedSlug);
      if (!relatedProductId) throw new Error(`Unknown related product ${relatedSlug} on ${p.slug}`);
      await db.productRelation.upsert({
        where: { productId_relatedProductId: { productId, relatedProductId } },
        update: { position: i },
        create: { productId, relatedProductId, position: i },
      });
      count += 1;
    }
  }
  return count;
}

async function seedCoupons(ids: CatalogIds) {
  for (const c of coupons) {
    const categoryIds = (c.categoryTypes ?? []).flatMap((type) =>
      ["men", "women"]
        .map((root) => ids.categories.get(`${root}-${type}`))
        .filter((v): v is string => Boolean(v)),
    );
    const collectionIds = (c.collectionSlugs ?? []).map((slug) => {
      const id = ids.collections.get(slug);
      if (!id) throw new Error(`Unknown collection ${slug} on coupon ${c.code}`);
      return id;
    });
    const productIds = await db.product.findMany({
      where: { slug: { in: c.productSlugs ?? [] } },
      select: { id: true },
    });
    const data = {
      description: c.description,
      type: c.type,
      value: c.type === "FLAT" ? rupeesToPaise(c.value) : c.value,
      minOrderValue: c.minOrderRupees ? rupeesToPaise(c.minOrderRupees) : 0,
      maxDiscount: c.maxDiscountRupees ? rupeesToPaise(c.maxDiscountRupees) : null,
      usageLimit: c.usageLimit ?? null,
      perUserLimit: c.perUserLimit ?? null,
      startsAt: c.startsInDays != null ? daysFromNow(c.startsInDays) : null,
      endsAt: c.endsInDays != null ? daysFromNow(c.endsInDays) : null,
      appliesTo: c.appliesTo ?? "ALL",
      categoryIds,
      collectionIds,
      productIds: productIds.map((p) => p.id),
      bxgyBuyQty: c.bxgyBuyQty ?? null,
      bxgyGetQty: c.bxgyGetQty ?? null,
      isFirstOrderOnly: c.isFirstOrderOnly ?? false,
      isActive: c.isActive ?? true,
    };
    await db.coupon.upsert({
      where: { code: c.code },
      update: data,
      create: { code: c.code, ...data },
    });
  }
  return coupons.length;
}

async function seedShipping() {
  const zoneRows = [];
  for (const [i, z] of zones.entries()) {
    const zone = await db.shippingZone.upsert({
      where: { id: z.id },
      update: {
        name: z.name,
        pincodePrefixes: z.pincodePrefixes,
        codAvailable: z.codAvailable,
        isDefault: z.isDefault,
        isActive: true,
        position: i,
      },
      create: {
        id: z.id,
        name: z.name,
        pincodePrefixes: z.pincodePrefixes,
        codAvailable: z.codAvailable,
        isDefault: z.isDefault,
        isActive: true,
        position: i,
      },
    });
    zoneRows.push(zone);
    await db.shippingRate.deleteMany({ where: { zoneId: zone.id } });
    await db.shippingRate.createMany({
      data: z.rates.map((r, j) => ({
        zoneId: zone.id,
        name: r.name,
        type: r.type,
        baseRate: rupeesToPaise(r.baseRupees),
        perKgRate: r.perKgRupees ? rupeesToPaise(r.perKgRupees) : null,
        freeAbove: r.freeAboveRupees ? rupeesToPaise(r.freeAboveRupees) : null,
        minDays: r.minDays,
        maxDays: r.maxDays,
        isActive: true,
        position: j,
      })),
    });
  }
  for (const p of pincodes) {
    const zone = findZoneForPincode(p.pincode, zoneRows);
    const data = {
      city: p.city,
      state: p.state,
      district: p.district ?? null,
      isServiceable: true,
      codAvailable: zone?.codAvailable ?? false,
      zoneId: zone?.id ?? null,
    };
    await db.pincode.upsert({
      where: { pincode: p.pincode },
      update: data,
      create: { pincode: p.pincode, ...data },
    });
  }
  return {
    zones: zones.length,
    rates: zones.reduce((n, z) => n + z.rates.length, 0),
    pincodes: pincodes.length,
  };
}

async function seedPages() {
  for (const p of pages) {
    const data = {
      title: p.title,
      body: p.body,
      excerpt: p.excerpt,
      isPublished: true,
      publishedAt: now,
      metaTitle: `${p.title} | Owlyn`,
      metaDescription: p.excerpt,
    };
    await db.page.upsert({
      where: { slug: p.slug },
      update: data,
      create: { slug: p.slug, ...data },
    });
  }
  return pages.length;
}

async function seedContent() {
  for (const b of banners) {
    const image = writeSvg(
      `images/banners/${b.id.replace("seed-banner-", "")}.svg`,
      tileSvg({
        title: b.headline,
        subtitle: b.subhead,
        width: b.width,
        height: b.height,
        bg: b.bg,
        accent: b.accent,
      }),
    );
    const data = {
      slot: b.slot,
      name: b.name,
      image,
      headline: b.headline,
      subhead: b.subhead ?? null,
      ctaLabel: b.ctaLabel ?? null,
      ctaUrl: b.ctaUrl ?? null,
      position: b.position,
      isActive: b.isActive,
      startsAt: b.startsInDays != null ? daysFromNow(b.startsInDays) : null,
      endsAt: b.endsInDays != null ? daysFromNow(b.endsInDays) : null,
    };
    await db.banner.upsert({ where: { id: b.id }, update: data, create: { id: b.id, ...data } });
  }

  let menuCount = 0;
  async function upsertMenu(menu: string, items: MenuItemSeed[], parentId: string | null) {
    for (const [i, item] of items.entries()) {
      const data = {
        menu,
        label: item.label,
        url: item.url,
        group: item.group ?? null,
        image: item.image ?? null,
        parentId,
        position: i,
        isActive: true,
      };
      await db.menuItem.upsert({
        where: { id: item.id },
        update: data,
        create: { id: item.id, ...data },
      });
      menuCount += 1;
      if (item.children?.length) await upsertMenu(menu, item.children, item.id);
    }
  }
  await upsertMenu("main", mainMenu, null);
  for (const [menu, items] of Object.entries(footerMenus)) await upsertMenu(menu, items, null);

  for (const [i, s] of homepageSections.entries()) {
    const data = {
      title: s.title,
      position: i,
      isActive: true,
      config: (s.config ?? {}) as Prisma.InputJsonValue,
    };
    await db.homepageSection.upsert({
      where: { key: s.key },
      update: data,
      create: { key: s.key, ...data },
    });
  }

  return { banners: banners.length, menuItems: menuCount, sections: homepageSections.length };
}

// ---------------------------------------------------------------------------

async function main() {
  const started = Date.now();
  console.log("Seeding Owlyn…");

  const settingCount = await seedSettings();
  const userIds = await seedUsers();
  const attributeValues = await seedAttributes();
  const sizeChartIds = await seedSizeCharts();
  const { ids: categoryIds, count: categoryCount } = await seedCategories(sizeChartIds);
  const collectionIds = await seedCollections();

  const ids: CatalogIds = { categories: categoryIds, collections: collectionIds, attributeValues };
  const productIds = new Map<string, string>();
  let variantCount = 0;
  let imageCount = 0;
  for (const p of products) {
    const result = await seedProduct(p, ids);
    productIds.set(p.slug, result.id);
    variantCount += result.variants;
    imageCount += result.images;
  }
  const relationCount = await seedProductRelations(productIds);
  const couponCount = await seedCoupons(ids);
  const shipping = await seedShipping();
  const pageCount = await seedPages();
  const content = await seedContent();

  const summary = await db.product.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: {
      name: true,
      brandLine: true,
      gender: true,
      basePrice: true,
      taxRate: true,
      _count: { select: { variants: true } },
      variants: { select: { stock: true } },
    },
  });

  console.log("");
  console.table(
    summary.map((p) => ({
      product: p.name,
      line: p.brandLine,
      gender: p.gender,
      price: `₹${(p.basePrice / 100).toLocaleString("en-IN")}`,
      gst: `${p.taxRate}%`,
      variants: p._count.variants,
      stock: p.variants.reduce((n, v) => n + v.stock, 0),
    })),
  );

  console.log("");
  console.table({
    settings: settingCount,
    users: userIds.size,
    attributes: attributes.length,
    sizeCharts: sizeCharts.length,
    categories: categoryCount,
    collections: collectionIds.size,
    products: productIds.size,
    variants: variantCount,
    images: imageCount,
    productRelations: relationCount,
    coupons: couponCount,
    shippingZones: shipping.zones,
    shippingRates: shipping.rates,
    pincodes: shipping.pincodes,
    pages: pageCount,
    banners: content.banners,
    menuItems: content.menuItems,
    homepageSections: content.sections,
  });

  console.log("");
  console.log("Sign-in credentials (local development only):");
  for (const u of users) console.log(`  ${u.role.padEnd(8)} ${u.email}  /  ${u.password}`);
  console.log("");
  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
