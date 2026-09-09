import { CACHE_TAGS, cached } from "@/lib/cache";
import { db } from "@/lib/db";

export type CategoryNode = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  position: number;
  image: string | null;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  sizeChartId: string | null;
};

/** Every active category, once. The tree is small enough to index in memory per request. */
export const getCategoryList = cached(
  async (): Promise<CategoryNode[]> =>
    db.category.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        parentId: true,
        position: true,
        image: true,
        description: true,
        metaTitle: true,
        metaDescription: true,
        sizeChartId: true,
      },
    }),
  ["categories:all"],
  [CACHE_TAGS.categories],
);

export type CategoryIndex = {
  all: CategoryNode[];
  bySlug: Map<string, CategoryNode>;
  byId: Map<string, CategoryNode>;
  children: Map<string | null, CategoryNode[]>;
};

export function buildCategoryIndex(list: CategoryNode[]): CategoryIndex {
  const bySlug = new Map<string, CategoryNode>();
  const byId = new Map<string, CategoryNode>();
  const children = new Map<string | null, CategoryNode[]>();
  for (const node of list) {
    bySlug.set(node.slug, node);
    byId.set(node.id, node);
    const siblings = children.get(node.parentId) ?? [];
    siblings.push(node);
    children.set(node.parentId, siblings);
  }
  return { all: list, bySlug, byId, children };
}

/** Root first, the node itself last. */
export function categoryChain(index: CategoryIndex, node: CategoryNode): CategoryNode[] {
  const chain: CategoryNode[] = [node];
  let current = node;
  while (current.parentId) {
    const parent = index.byId.get(current.parentId);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

/** The node plus every descendant, depth first. */
export function categorySubtree(index: CategoryIndex, node: CategoryNode): CategoryNode[] {
  const out: CategoryNode[] = [];
  const stack = [node];
  while (stack.length) {
    const current = stack.pop()!;
    out.push(current);
    for (const child of index.children.get(current.id) ?? []) stack.push(child);
  }
  return out;
}

export function isLeafCategory(index: CategoryIndex, node: CategoryNode): boolean {
  return (index.children.get(node.id) ?? []).length === 0;
}

/** `men-sneakers` and `women-sneakers` share the type key `sneakers`, used by the category filter. */
export function categoryTypeKey(slug: string): string {
  return slug.replace(/^(men|women)-/, "");
}

export const GENDER_ROOT_SLUGS = ["men", "women"] as const;
