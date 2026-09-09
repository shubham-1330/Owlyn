/**
 * Three-level tree: gender root → department → product type.
 * Unisex products are attached to both the men's and women's leaf.
 */

export type CategorySeed = {
  slug: string;
  name: string;
  description: string;
  children?: CategorySeed[];
  /** Set on leaves: which size chart applies. */
  sizeChart?:
    "footwear-men" | "footwear-women" | "tops-men" | "tops-women" | "bottoms-men" | "bottoms-women";
};

const footwearChildren = (prefix: "men" | "women"): CategorySeed[] => [
  {
    slug: `${prefix}-sneakers`,
    name: "Sneakers",
    description: "Court-inspired pairs for every day. Built to be worn hard.",
    sizeChart: prefix === "men" ? "footwear-men" : "footwear-women",
  },
  {
    slug: `${prefix}-running-shoes`,
    name: "Running shoes",
    description: "Daily trainers and race-day pairs. Cushioning you can pick by feel.",
    sizeChart: prefix === "men" ? "footwear-men" : "footwear-women",
  },
  {
    slug: `${prefix}-training-shoes`,
    name: "Training shoes",
    description: "Flat, stable, grippy. For the floor, the rack and the rope.",
    sizeChart: prefix === "men" ? "footwear-men" : "footwear-women",
  },
];

const clothingChildren = (prefix: "men" | "women"): CategorySeed[] => {
  const tops = prefix === "men" ? "tops-men" : "tops-women";
  const bottoms = prefix === "men" ? "bottoms-men" : "bottoms-women";
  return [
    {
      slug: `${prefix}-t-shirts`,
      name: "T-shirts",
      description: "Heavy cotton, vented knits, long sleeves. The base of every kit.",
      sizeChart: tops,
    },
    {
      slug: `${prefix}-polos`,
      name: "Polos",
      description: "Piqué and court polos with a collar that holds its shape.",
      sizeChart: tops,
    },
    {
      slug: `${prefix}-jackets`,
      name: "Jackets",
      description: "Shells and quilts for the cold half of the year.",
      sizeChart: tops,
    },
    {
      slug: `${prefix}-sweatshirts`,
      name: "Sweatshirts",
      description: "Crews and hoods in brushed fleece. Warm before, warm after.",
      sizeChart: tops,
    },
    {
      slug: `${prefix}-joggers`,
      name: "Joggers",
      description: "Track and loft joggers with a clean taper.",
      sizeChart: bottoms,
    },
    {
      slug: `${prefix}-shorts`,
      name: "Shorts",
      description: "Split shorts for miles, court shorts for everything else.",
      sizeChart: bottoms,
    },
  ];
};

const accessoryChildren = (prefix: "men" | "women"): CategorySeed[] => [
  {
    slug: `${prefix}-caps`,
    name: "Caps",
    description: "Six-panel and run caps. Low profile, quick to dry.",
  },
  { slug: `${prefix}-socks`, name: "Socks", description: "Crew and run socks, sold in packs." },
  {
    slug: `${prefix}-bags`,
    name: "Bags",
    description: "Duffels sized for a gym day, not a week away.",
  },
];

const department = (prefix: "men" | "women"): CategorySeed[] => [
  {
    slug: `${prefix}-footwear`,
    name: "Footwear",
    description: "Sneakers, running shoes and training shoes.",
    children: footwearChildren(prefix),
  },
  {
    slug: `${prefix}-clothing`,
    name: "Clothing",
    description: "Tees, polos, jackets, sweatshirts, joggers and shorts.",
    children: clothingChildren(prefix),
  },
  {
    slug: `${prefix}-accessories`,
    name: "Accessories",
    description: "Caps, socks and bags.",
    children: accessoryChildren(prefix),
  },
];

export const categoryTree: CategorySeed[] = [
  { slug: "men", name: "Men", description: "Everything cut for men.", children: department("men") },
  {
    slug: "women",
    name: "Women",
    description: "Everything cut for women.",
    children: department("women"),
  },
];

/** Map a product-type key to the leaf slug under a gender root. */
export function leafSlug(root: "men" | "women", type: string): string {
  return `${root}-${type}`;
}
