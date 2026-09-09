import {
  buildCategoryIndex,
  categoryChain,
  categorySubtree,
  categoryTypeKey,
  getCategoryList,
  GENDER_ROOT_SLUGS,
  type CategoryIndex,
  type CategoryNode,
} from "@/lib/queries/categories";
import { getCollectionList, isCollectionLive } from "@/lib/queries/collections";

/** What the SQL restricts to. Serialisable so it can be part of a cache key. */
export type CatalogScope =
  | { kind: "categories"; categoryIds: string[] }
  | { kind: "collection"; collectionId: string }
  | { kind: "virtual"; key: "new" | "bestsellers" | "sale" | "all" }
  | { kind: "search"; q: string };

export type Crumb = { label: string; href: string };

export type ListingScope = {
  slug: string;
  path: string;
  /** Short name for titles and breadcrumbs. */
  title: string;
  /** Sentence-case page heading, e.g. "Sneakers for men". */
  headline: string;
  description: string | null;
  heroImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  breadcrumbs: Crumb[];
  scope: CatalogScope;
  /** True when the listing is already restricted to one gender root, so the gender facet is hidden. */
  genderLocked: boolean;
  /** Hide the category facet when the scope is a single leaf category. */
  categoryLocked: boolean;
};

const VIRTUAL: Record<
  "new" | "bestsellers" | "sale" | "all",
  { title: string; headline: string; description: string }
> = {
  new: {
    title: "New",
    headline: "New this month",
    description: "Everything that landed in the last 30 days, newest first.",
  },
  bestsellers: {
    title: "Bestsellers",
    headline: "Bestsellers",
    description: "The pieces people come back for, ordered by how many have gone out the door.",
  },
  sale: {
    title: "Sale",
    headline: "Sale",
    description: "Marked down, not marked out. Same kit, lower price.",
  },
  all: {
    title: "All products",
    headline: "All products",
    description: "The whole range in one place.",
  },
};

const HOME: Crumb = { label: "Home", href: "/" };

function headlineFor(chain: CategoryNode[]): string {
  const node = chain[chain.length - 1]!;
  const root = chain[0]!;
  const isGenderRoot = (GENDER_ROOT_SLUGS as readonly string[]).includes(root.slug);
  if (chain.length === 1 || !isGenderRoot) return node.name;
  return `${node.name} for ${root.name.toLowerCase()}`;
}

function categoryScope(index: CategoryIndex, node: CategoryNode, slug: string): ListingScope {
  const chain = categoryChain(index, node);
  const subtree = categorySubtree(index, node);
  const root = chain[0]!;
  return {
    slug,
    path: `/collections/${slug}`,
    title: node.name,
    headline: headlineFor(chain),
    description: node.description,
    heroImage: node.image,
    metaTitle: node.metaTitle,
    metaDescription: node.metaDescription,
    breadcrumbs: [HOME, ...chain.map((c) => ({ label: c.name, href: `/collections/${c.slug}` }))],
    scope: { kind: "categories", categoryIds: subtree.map((c) => c.id) },
    genderLocked: (GENDER_ROOT_SLUGS as readonly string[]).includes(root.slug),
    categoryLocked: subtree.length === 1,
  };
}

/**
 * Resolves a `/collections/[slug]` to a listing: a real category (with its
 * subtree), a live collection, a virtual listing (`new`, `bestsellers`, `sale`,
 * `all`), or a cross-gender type such as `footwear` or `sneakers` that unions
 * the `men-*` and `women-*` categories of that type.
 */
export async function resolveListingScope(slug: string): Promise<ListingScope | null> {
  const [categories, collections] = await Promise.all([getCategoryList(), getCollectionList()]);
  const index = buildCategoryIndex(categories);

  const category = index.bySlug.get(slug);
  if (category) return categoryScope(index, category, slug);

  const collection = collections.find((c) => c.slug === slug);
  if (collection && isCollectionLive(collection)) {
    return {
      slug,
      path: `/collections/${slug}`,
      title: collection.name,
      headline: collection.name,
      description: collection.description,
      heroImage: collection.heroImage,
      metaTitle: collection.metaTitle,
      metaDescription: collection.metaDescription,
      breadcrumbs: [HOME, { label: collection.name, href: `/collections/${slug}` }],
      scope: { kind: "collection", collectionId: collection.id },
      genderLocked: false,
      categoryLocked: false,
    };
  }

  if (slug in VIRTUAL) {
    const key = slug as keyof typeof VIRTUAL;
    const v = VIRTUAL[key];
    return {
      slug,
      path: `/collections/${slug}`,
      title: v.title,
      headline: v.headline,
      description: v.description,
      heroImage: null,
      metaTitle: null,
      metaDescription: v.description,
      breadcrumbs: [HOME, { label: v.title, href: `/collections/${slug}` }],
      scope: { kind: "virtual", key },
      genderLocked: false,
      categoryLocked: false,
    };
  }

  const typed = GENDER_ROOT_SLUGS.map((root) => index.bySlug.get(`${root}-${slug}`)).filter(
    (n): n is CategoryNode => Boolean(n),
  );
  if (typed.length > 0) {
    const first = typed[0]!;
    const ids = typed.flatMap((node) => categorySubtree(index, node).map((c) => c.id));
    return {
      slug,
      path: `/collections/${slug}`,
      title: first.name,
      headline: first.name,
      description: first.description,
      heroImage: first.image,
      metaTitle: null,
      metaDescription: first.description,
      breadcrumbs: [HOME, { label: first.name, href: `/collections/${slug}` }],
      scope: { kind: "categories", categoryIds: Array.from(new Set(ids)) },
      genderLocked: false,
      categoryLocked: typed.every((node) => categorySubtree(index, node).length === 1),
    };
  }

  return null;
}

export { categoryTypeKey };
