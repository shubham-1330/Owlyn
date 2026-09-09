export type AttributeSeed = {
  slug: string;
  name: string;
  values: string[];
};

/** Filterable attributes. Values are stored as AttributeValue rows; slugs are derived. */
export const attributes: AttributeSeed[] = [
  { slug: "activity", name: "Activity", values: ["Running", "Training", "Court", "Everyday"] },
  {
    slug: "material",
    name: "Material",
    values: [
      "Cotton",
      "Heavy cotton",
      "Recycled polyester",
      "Nylon",
      "Knit mesh",
      "Brushed fleece",
      "Piqué",
      "Suede and mesh",
    ],
  },
  { slug: "fit", name: "Fit", values: ["Regular", "Slim", "Relaxed", "Oversized"] },
  { slug: "cushioning", name: "Cushioning", values: ["Soft", "Balanced", "Firm"] },
  { slug: "drop", name: "Drop", values: ["4 mm", "6 mm", "8 mm", "10 mm"] },
];
