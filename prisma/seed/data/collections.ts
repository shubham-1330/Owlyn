export type CollectionSeed = {
  slug: string;
  name: string;
  description: string;
  metaDescription: string;
  /** Placeholder colours for the generated hero. */
  bg: string;
  accent: string;
  daysUntilEnd?: number;
};

export const collections: CollectionSeed[] = [
  {
    slug: "night-run",
    name: "Night Run",
    description:
      "Shoes and kit for the miles after dark. Reflective yarn where headlights land, mesh where you need air, nothing that flaps.",
    metaDescription:
      "Running shoes, shorts, tees and socks built for after-dark miles. Reflective, light, quiet.",
    bg: "#0E1116",
    accent: "#C79A4B",
  },
  {
    slug: "court-edit",
    name: "Court Edit",
    description:
      "Court shoes and the pieces that go with them. Leather that ages, cotton that softens, a polo you can play in.",
    metaDescription: "Sneakers, polos, shorts and caps with a court lineage. Made to be worn hard.",
    bg: "#F3F4F2",
    accent: "#46407A",
  },
  {
    slug: "cold-start",
    name: "Cold Start",
    description:
      "Layers for the early half of winter mornings. Fleece that is warm on the walk over, a shell for the rain, a quilt for the wait.",
    metaDescription:
      "Fleece, shells and quilted layers for cold mornings. Warm before, warm after.",
    bg: "#1B2129",
    accent: "#8B9199",
  },
];
