import type { Gender, ProductBadge } from "@prisma/client";

export type Kind = "footwear" | "apparel" | "cap" | "socks" | "bag";
export type StockPattern = "high" | "mixed" | "low" | "out";
export type AttributeKey = "activity" | "material" | "fit" | "cushioning" | "drop";
export type ColorSeed = { name: string; hex: string };

export type ProductSeed = {
  code: string;
  name: string;
  slug: string;
  brandLine: string;
  gender: Gender;
  kind: Kind;
  /** Product-type key matched to the leaf category slug: `${men|women}-${type}` */
  type: string;
  /** Rupees. Converted to paise by the seed. */
  price: number;
  compareAt?: number;
  hsn: string;
  short: string;
  description: string;
  materials: string;
  care: string;
  colors: ColorSeed[];
  weightGrams: number;
  badges?: ProductBadge[];
  featured?: boolean;
  attributes: Partial<Record<AttributeKey, string>>;
  collections?: string[];
  related?: string[];
  stock?: StockPattern;
  /** Days since publish, for "new this week" ordering. */
  daysAgo: number;
  sales: number;
};

const C = {
  ink: { name: "Ink", hex: "#15181D" },
  moon: { name: "Moon", hex: "#F3F4F2" },
  bone: { name: "Bone", hex: "#E8E4DA" },
  fog: { name: "Fog", hex: "#8B9199" },
  slate: { name: "Slate", hex: "#2A313B" },
  charcoal: { name: "Charcoal", hex: "#3A3F46" },
  dusk: { name: "Dusk", hex: "#46407A" },
  brass: { name: "Brass", hex: "#C79A4B" },
  olive: { name: "Olive", hex: "#5C6B4A" },
  moss: { name: "Moss", hex: "#4F6B57" },
  clay: { name: "Clay", hex: "#B5654A" },
  rust: { name: "Rust", hex: "#9C4A2B" },
  sand: { name: "Sand", hex: "#C9B79C" },
  storm: { name: "Storm", hex: "#3E4A5A" },
  signal: { name: "Signal blue", hex: "#2F5BEA" },
  blush: { name: "Blush", hex: "#D9A5A0" },
  cement: { name: "Cement", hex: "#9A9A93" },
} as const;

const CARE = {
  footwear: "Wipe with a damp cloth. Air dry away from direct heat. Do not machine wash.",
  cotton:
    "Machine wash cold with like colours. Do not bleach. Tumble dry low or line dry. Iron on low, inside out.",
  synthetic: "Machine wash cold. Do not use fabric softener. Line dry. Do not iron.",
  fleece: "Machine wash cold, inside out. Tumble dry low. Do not iron over the print.",
  cap: "Hand wash cold. Reshape and air dry.",
  socks: "Machine wash warm. Tumble dry low.",
  bag: "Spot clean with mild soap. Air dry. Do not machine wash.",
} as const;

export const products: ProductSeed[] = [
  // ------------------------------------------------------------------ sneakers
  {
    code: "OWL-0001",
    name: "Hush Court 1",
    slug: "hush-court-1",
    brandLine: "Hush",
    gender: "UNISEX",
    kind: "footwear",
    type: "sneakers",
    price: 5499,
    hsn: "64041190",
    short: "The everyday court shoe. Full-grain upper, cupsole, nothing to explain.",
    description: `The Court 1 is the shoe we wear most. A full-grain leather upper on a cupsole that flexes at the forefoot and stays flat under the heel.

The toe box is roomy without looking wide. The tongue is padded where your laces sit and thin where they do not. Inside, a moulded sockliner replaces the flat foam most court shoes ship with.

- Full-grain leather upper, lined with soft microsuede
- Rubber cupsole with a herringbone tread
- Moulded sockliner, removable
- Weight 380 g in UK 8`,
    materials:
      "Upper: full-grain leather. Lining: microsuede. Sole: rubber cupsole. Sockliner: moulded EVA.",
    care: CARE.footwear,
    colors: [C.bone, C.ink],
    weightGrams: 760,
    badges: ["BESTSELLER"],
    featured: true,
    attributes: { activity: "Everyday", material: "Suede and mesh", cushioning: "Balanced" },
    collections: ["court-edit"],
    related: ["roost-crew-sock-3-pack", "seam-court-polo"],
    daysAgo: 120,
    sales: 412,
  },
  {
    code: "OWL-0002",
    name: "Hush Court 1 Low",
    slug: "hush-court-1-low",
    brandLine: "Hush",
    gender: "MEN",
    kind: "footwear",
    type: "sneakers",
    price: 4999,
    hsn: "64041190",
    short: "Court 1 with a lower collar and a slimmer last.",
    description: `Same cupsole, same leather, cut lower at the ankle and narrower through the midfoot. If the Court 1 feels like a boot to you, this is the one.

The lower collar is padded in a single band so it does not rub on longer days. We kept the herringbone tread and the removable sockliner.

- Full-grain leather upper
- Low, padded collar
- Rubber cupsole, herringbone tread
- Weight 350 g in UK 8`,
    materials: "Upper: full-grain leather. Lining: microsuede. Sole: rubber cupsole.",
    care: CARE.footwear,
    colors: [C.fog, C.dusk],
    weightGrams: 700,
    attributes: { activity: "Everyday", material: "Suede and mesh", cushioning: "Balanced" },
    collections: ["court-edit"],
    related: ["seam-core-tee-men", "roost-six-panel-cap"],
    daysAgo: 95,
    sales: 188,
  },
  {
    code: "OWL-0003",
    name: "Hush Lane",
    slug: "hush-lane",
    brandLine: "Hush",
    gender: "WOMEN",
    kind: "footwear",
    type: "sneakers",
    price: 4499,
    compareAt: 5499,
    hsn: "64041190",
    short: "A slim, low sneaker in soft nubuck. Light enough to forget.",
    description: `The Lane is built on a narrow last with a soft nubuck upper that gives at the toe from the first wear. There is no break-in period to speak of.

The midsole is a single piece of EVA, the outsole a thin sheet of rubber where you actually land. It is a walking shoe first and a sneaker second.

- Nubuck upper with a knit collar
- One-piece EVA midsole
- Thin rubber outsole
- Weight 240 g in UK 5`,
    materials: "Upper: nubuck leather with knit collar. Midsole: EVA. Outsole: rubber.",
    care: CARE.footwear,
    colors: [C.moon, C.clay],
    weightGrams: 480,
    attributes: { activity: "Everyday", material: "Suede and mesh", cushioning: "Soft" },
    collections: ["court-edit"],
    related: ["seam-core-tee-women", "roost-crew-sock-3-pack"],
    stock: "mixed",
    daysAgo: 60,
    sales: 231,
  },
  {
    code: "OWL-0004",
    name: "Hush Ridge",
    slug: "hush-ridge",
    brandLine: "Hush",
    gender: "MEN",
    kind: "footwear",
    type: "sneakers",
    price: 6299,
    hsn: "64041190",
    short: "A chunkier sneaker with a lugged sole. Made for wet pavements.",
    description: `The Ridge takes the Court 1 upper and puts it on a lugged sole with a raised sidewall. It grips on wet stone and does not collect grit the way a flat sole does.

The upper adds a suede mudguard around the toe and heel. The tongue is gusseted so water has no easy way in.

- Leather and suede upper, gusseted tongue
- Lugged rubber outsole, 4 mm lugs
- Raised sidewall for splash protection
- Weight 430 g in UK 8`,
    materials: "Upper: full-grain leather and suede. Lining: microsuede. Sole: lugged rubber.",
    care: CARE.footwear,
    colors: [C.slate, C.olive],
    weightGrams: 860,
    badges: ["NEW"],
    attributes: { activity: "Everyday", material: "Suede and mesh", cushioning: "Firm" },
    collections: ["court-edit"],
    related: ["seam-shell-jacket-men", "seam-track-jogger-men"],
    daysAgo: 5,
    sales: 41,
  },
  {
    code: "OWL-0005",
    name: "Hush Ember",
    slug: "hush-ember",
    brandLine: "Hush",
    gender: "WOMEN",
    kind: "footwear",
    type: "sneakers",
    price: 5799,
    hsn: "64041190",
    short: "The Lane in brass-tinted suede. A small run, made once.",
    description: `The Ember is a limited run of the Lane in a brass suede we could only source in one batch. When it is gone, it is gone.

Same narrow last, same one-piece EVA midsole, same thin rubber outsole. The laces are waxed cotton and the heel tab is stitched in a matching thread.

- Brass-dyed suede upper
- One-piece EVA midsole
- Waxed cotton laces
- Weight 245 g in UK 5`,
    materials: "Upper: suede. Midsole: EVA. Outsole: rubber. Laces: waxed cotton.",
    care: CARE.footwear,
    colors: [C.brass, C.ink],
    weightGrams: 490,
    badges: ["LIMITED"],
    attributes: { activity: "Everyday", material: "Suede and mesh", cushioning: "Soft" },
    collections: ["court-edit"],
    related: ["seam-hood-women", "roost-six-panel-cap"],
    stock: "low",
    daysAgo: 14,
    sales: 77,
  },
  {
    code: "OWL-0006",
    name: "Hush Terrace",
    slug: "hush-terrace",
    brandLine: "Hush",
    gender: "UNISEX",
    kind: "footwear",
    type: "sneakers",
    price: 3999,
    compareAt: 4999,
    hsn: "64041190",
    short: "A canvas sneaker on a vulcanised sole. Our lightest court shoe.",
    description: `The Terrace is a heavy canvas upper on a vulcanised rubber sole, the way court shoes were made before foam. It is the pair you throw in a bag.

The canvas is 14 oz and softens with wear. The sole is thin and grippy. There is a small amount of foam under the heel and none under the forefoot.

- 14 oz cotton canvas upper
- Vulcanised rubber sole
- Cotton laces
- Weight 300 g in UK 8`,
    materials: "Upper: 14 oz cotton canvas. Sole: vulcanised rubber. Sockliner: EVA.",
    care: CARE.footwear,
    colors: [C.sand, C.storm],
    weightGrams: 600,
    badges: ["SOLD_OUT"],
    attributes: { activity: "Everyday", material: "Cotton", cushioning: "Firm" },
    collections: ["court-edit"],
    related: ["seam-heavy-tee", "roost-crew-sock-3-pack"],
    stock: "out",
    daysAgo: 200,
    sales: 520,
  },

  // ------------------------------------------------------------------ running
  {
    code: "OWL-0007",
    name: "Boom Strider 3",
    slug: "boom-strider-3",
    brandLine: "Boom",
    gender: "UNISEX",
    kind: "footwear",
    type: "running-shoes",
    price: 7999,
    hsn: "64041190",
    short: "Our daily trainer. Soft under the heel, quick off the toe.",
    description: `The Strider is the shoe for most of your miles. The third version keeps the soft heel and adds a firmer forefoot so the toe-off does not feel mushy at pace.

The upper is an engineered mesh with a padded heel collar and a flat, wide lace. Reflective yarn runs through the heel and the tongue for the dark half of the day.

- Engineered mesh upper with reflective yarn
- Dual-density foam midsole, soft heel and firmer forefoot
- Rubber outsole in the high-wear zones only
- 8 mm drop, 265 g in UK 8`,
    materials:
      "Upper: engineered mesh with reflective yarn. Midsole: dual-density EVA foam. Outsole: carbon rubber.",
    care: CARE.footwear,
    colors: [{ name: "Ink and brass", hex: "#1A1D24" }, C.signal],
    weightGrams: 530,
    badges: ["BESTSELLER"],
    featured: true,
    attributes: { activity: "Running", material: "Knit mesh", cushioning: "Soft", drop: "8 mm" },
    collections: ["night-run"],
    related: ["roost-run-sock-2-pack", "seam-split-short-men", "roost-run-cap"],
    daysAgo: 45,
    sales: 634,
  },
  {
    code: "OWL-0008",
    name: "Boom Long Haul",
    slug: "boom-long-haul",
    brandLine: "Boom",
    gender: "MEN",
    kind: "footwear",
    type: "running-shoes",
    price: 8999,
    hsn: "64041190",
    short: "Maximum stack, minimum fuss. For the long run and the day after.",
    description: `The Long Haul has our tallest midsole and a rocker that carries you through the stride when your legs stop wanting to. It is a recovery shoe you can also race a marathon in.

The heel counter is external and firm. The upper is a double-layer mesh that holds the foot without pressure points. The laces are elastic at the top eyelet so you can slide it on.

- Double-layer mesh upper, external heel counter
- Full-length soft foam, rocker geometry
- Rubber outsole in the high-wear zones
- 10 mm drop, 290 g in UK 8`,
    materials: "Upper: double-layer mesh. Midsole: soft EVA foam. Outsole: carbon rubber.",
    care: CARE.footwear,
    colors: [C.charcoal, C.bone],
    weightGrams: 580,
    attributes: { activity: "Running", material: "Knit mesh", cushioning: "Soft", drop: "10 mm" },
    collections: ["night-run"],
    related: ["roost-run-sock-2-pack", "seam-vent-tee"],
    daysAgo: 30,
    sales: 156,
  },
  {
    code: "OWL-0009",
    name: "Quill Pace 2",
    slug: "quill-pace-2",
    brandLine: "Quill",
    gender: "UNISEX",
    kind: "footwear",
    type: "running-shoes",
    price: 9499,
    hsn: "64041190",
    short: "Race-day shoe with a nylon plate. Firm, fast, not for every day.",
    description: `The Pace 2 is built for one thing. A nylon plate sits between two foam layers and snaps the shoe back when you load the forefoot. It rewards a quick cadence and punishes a lazy one.

The upper is a single-layer mesh with no padding beyond the heel. It is light because there is nothing extra on it.

- Single-layer mesh upper
- Nylon plate between two foam layers
- Minimal rubber outsole
- 6 mm drop, 215 g in UK 8`,
    materials:
      "Upper: single-layer mesh. Midsole: dual foam with nylon plate. Outsole: rubber pods.",
    care: CARE.footwear,
    colors: [
      { name: "Moon and brass", hex: "#EDEBE4" },
      { name: "Night", hex: "#0E1116" },
    ],
    weightGrams: 430,
    badges: ["NEW"],
    attributes: { activity: "Running", material: "Knit mesh", cushioning: "Firm", drop: "6 mm" },
    collections: ["night-run"],
    related: ["roost-run-sock-2-pack", "seam-split-short-women"],
    stock: "mixed",
    daysAgo: 3,
    sales: 62,
  },
  {
    code: "OWL-0010",
    name: "Quill Tempo",
    slug: "quill-tempo",
    brandLine: "Quill",
    gender: "WOMEN",
    kind: "footwear",
    type: "running-shoes",
    price: 6999,
    compareAt: 7999,
    hsn: "64041190",
    short: "A light trainer for tempo days. Balanced foam, no plate.",
    description: `The Tempo sits between the Strider and the Pace. It has the Pace upper on a balanced foam midsole with no plate, so it is quick without being harsh.

We built it on our women's last, which is narrower at the heel and slightly wider at the forefoot. The toe box has room to splay.

- Single-layer mesh upper
- Balanced foam midsole, no plate
- Rubber outsole in the high-wear zones
- 6 mm drop, 205 g in UK 5`,
    materials: "Upper: single-layer mesh. Midsole: EVA foam. Outsole: carbon rubber.",
    care: CARE.footwear,
    colors: [C.dusk, C.moss],
    weightGrams: 410,
    attributes: {
      activity: "Running",
      material: "Knit mesh",
      cushioning: "Balanced",
      drop: "6 mm",
    },
    collections: ["night-run"],
    related: ["seam-split-short-women", "roost-run-cap"],
    daysAgo: 70,
    sales: 143,
  },
  {
    code: "OWL-0011",
    name: "Boom Easy Mile",
    slug: "boom-easy-mile",
    brandLine: "Boom",
    gender: "WOMEN",
    kind: "footwear",
    type: "running-shoes",
    price: 5999,
    hsn: "64041190",
    short: "The Strider feel at a lower price. Soft, simple, dependable.",
    description: `The Easy Mile uses the Strider's foam in a single density with a simpler upper. It is for people starting out and for people who do not want to think about their shoes.

The mesh is soft and the heel is padded all the way round. There is one lacing option and it works.

- Soft mesh upper, padded heel
- Single-density foam midsole
- Rubber outsole
- 8 mm drop, 240 g in UK 5`,
    materials: "Upper: soft mesh. Midsole: EVA foam. Outsole: carbon rubber.",
    care: CARE.footwear,
    colors: [C.blush, C.ink],
    weightGrams: 480,
    attributes: { activity: "Running", material: "Knit mesh", cushioning: "Soft", drop: "8 mm" },
    collections: ["night-run"],
    related: ["seam-vent-tee", "roost-run-sock-2-pack"],
    daysAgo: 110,
    sales: 298,
  },

  // ------------------------------------------------------------------ training
  {
    code: "OWL-0012",
    name: "Talon Grip",
    slug: "talon-grip",
    brandLine: "Talon",
    gender: "UNISEX",
    kind: "footwear",
    type: "training-shoes",
    price: 6499,
    hsn: "64041190",
    short: "Flat, wide, planted. The trainer for lifting and everything after.",
    description: `The Grip has a wide, flat base and a firm midsole so nothing moves under a heavy bar. The outsole wraps up over the toe for rope climbs and burpees.

The upper is a tight knit with a TPU cage at the midfoot. It locks the foot down for lateral work without the stiffness of a full overlay.

- Knit upper with TPU midfoot cage
- Firm, wide midsole
- Wraparound rubber outsole
- 4 mm drop, 310 g in UK 8`,
    materials: "Upper: knit with TPU cage. Midsole: firm EVA. Outsole: rubber, wraparound.",
    care: CARE.footwear,
    colors: [{ name: "Ink", hex: "#0E1116" }, C.cement],
    weightGrams: 620,
    featured: true,
    attributes: { activity: "Training", material: "Knit mesh", cushioning: "Firm", drop: "4 mm" },
    related: ["seam-vent-tee", "seam-court-short", "roost-gym-duffel"],
    daysAgo: 80,
    sales: 274,
  },
  {
    code: "OWL-0013",
    name: "Talon Lift",
    slug: "talon-lift",
    brandLine: "Talon",
    gender: "MEN",
    kind: "footwear",
    type: "training-shoes",
    price: 7499,
    hsn: "64041190",
    short: "A raised heel and a strap. Built for squats and cleans.",
    description: `The Lift is a proper lifting shoe. The heel is a solid 18 mm block, the midfoot has a single strap, and the sole does not compress.

It is not for running or for class. It is for the rack, and it makes the bottom of a squat feel like a different place.

- Synthetic leather upper with midfoot strap
- 18 mm solid heel, incompressible
- Flat rubber outsole
- 380 g in UK 8`,
    materials: "Upper: synthetic leather. Heel: TPU block. Outsole: rubber.",
    care: CARE.footwear,
    colors: [C.slate, C.rust],
    weightGrams: 760,
    attributes: { activity: "Training", material: "Nylon", cushioning: "Firm" },
    related: ["seam-core-tee-men", "roost-gym-duffel"],
    daysAgo: 55,
    sales: 88,
  },
  {
    code: "OWL-0014",
    name: "Talon Circuit",
    slug: "talon-circuit",
    brandLine: "Talon",
    gender: "WOMEN",
    kind: "footwear",
    type: "training-shoes",
    price: 5999,
    hsn: "64041190",
    short: "For the class that changes every five minutes.",
    description: `The Circuit is the Grip with more give. A balanced foam midsole takes the edge off box jumps and short runs, and the base is still wide enough to lift on.

The upper is a soft knit with a padded collar. It is the shoe for a session that is a bit of everything.

- Soft knit upper, padded collar
- Balanced foam midsole, wide base
- Rubber outsole with a pivot point under the ball
- 6 mm drop, 250 g in UK 5`,
    materials: "Upper: soft knit. Midsole: EVA foam. Outsole: rubber.",
    care: CARE.footwear,
    colors: [C.fog, C.dusk],
    weightGrams: 500,
    attributes: {
      activity: "Training",
      material: "Knit mesh",
      cushioning: "Balanced",
      drop: "6 mm",
    },
    related: ["seam-core-tee-women", "seam-track-jogger-women"],
    daysAgo: 40,
    sales: 121,
  },
  {
    code: "OWL-0015",
    name: "Talon Base",
    slug: "talon-base",
    brandLine: "Talon",
    gender: "UNISEX",
    kind: "footwear",
    type: "training-shoes",
    price: 4999,
    compareAt: 5999,
    hsn: "64041190",
    short: "A simple gym shoe. Flat sole, mesh upper, sensible price.",
    description: `The Base is the trainer you buy first. It is flat, it grips, and it does not pretend to be anything else. The mesh upper breathes and the sole is a single piece of rubber.

We use the same last as the Grip so the fit carries over when you move up.

- Mesh upper with synthetic overlays
- Firm EVA midsole
- One-piece rubber outsole
- 4 mm drop, 290 g in UK 8`,
    materials: "Upper: mesh with synthetic overlays. Midsole: EVA. Outsole: rubber.",
    care: CARE.footwear,
    colors: [{ name: "Black", hex: "#111316" }, C.bone],
    weightGrams: 580,
    attributes: { activity: "Training", material: "Knit mesh", cushioning: "Firm", drop: "4 mm" },
    related: ["seam-crew-sweat", "roost-crew-sock-3-pack"],
    daysAgo: 150,
    sales: 340,
  },

  // ------------------------------------------------------------------ t-shirts
  {
    code: "OWL-0016",
    name: "Seam Core Tee",
    slug: "seam-core-tee-men",
    brandLine: "Seam",
    gender: "MEN",
    kind: "apparel",
    type: "t-shirts",
    price: 1299,
    hsn: "61091000",
    short: "The 200 gsm cotton tee. Cut straight, sits right.",
    description: `The Core Tee is a 200 gsm combed cotton jersey that holds its shape through a hundred washes. The collar is a tight rib that does not bacon.

It is cut straight through the body with a slightly dropped shoulder. Not boxy, not slim. The hem is finished with a double needle and sits at the hip.

- 200 gsm combed cotton, pre-shrunk
- Ribbed collar with a taped back neck
- Straight cut, dropped shoulder
- Made in Tiruppur`,
    materials: "100% combed cotton, 200 gsm.",
    care: CARE.cotton,
    colors: [C.ink, C.moon, C.olive],
    weightGrams: 180,
    badges: ["BESTSELLER"],
    featured: true,
    attributes: { activity: "Everyday", material: "Cotton", fit: "Regular" },
    related: ["seam-track-jogger-men", "roost-six-panel-cap"],
    daysAgo: 300,
    sales: 1240,
  },
  {
    code: "OWL-0017",
    name: "Seam Core Tee",
    slug: "seam-core-tee-women",
    brandLine: "Seam",
    gender: "WOMEN",
    kind: "apparel",
    type: "t-shirts",
    price: 1199,
    hsn: "61091000",
    short: "The Core Tee on a women's block. Same cotton, shorter body.",
    description: `The same 200 gsm cotton as the men's Core Tee on a block cut for women. The body is shorter, the shoulder sits on the shoulder, and the sleeve is a touch narrower.

The collar rib is the same tight knit. It is a tee to wear on its own or under everything.

- 200 gsm combed cotton, pre-shrunk
- Ribbed collar with a taped back neck
- Regular fit, cropped a little above the hip
- Made in Tiruppur`,
    materials: "100% combed cotton, 200 gsm.",
    care: CARE.cotton,
    colors: [C.moon, C.dusk, C.clay],
    weightGrams: 160,
    attributes: { activity: "Everyday", material: "Cotton", fit: "Regular" },
    related: ["seam-track-jogger-women", "hush-lane"],
    daysAgo: 300,
    sales: 980,
  },
  {
    code: "OWL-0018",
    name: "Seam Vent Tee",
    slug: "seam-vent-tee",
    brandLine: "Seam",
    gender: "UNISEX",
    kind: "apparel",
    type: "t-shirts",
    price: 1799,
    hsn: "61099090",
    short: "A recycled polyester run tee with a mesh back panel.",
    description: `The Vent Tee is the shirt for running in a humid city. The front is a light recycled polyester and the whole back is an open mesh.

Seams are flat-locked so nothing rubs at the shoulder under a pack strap. A reflective strip sits at the back neck.

- Recycled polyester front, open-mesh back
- Flat-locked seams
- Reflective back-neck strip
- Regular fit, 110 g in M`,
    materials: "100% recycled polyester.",
    care: CARE.synthetic,
    colors: [C.storm, C.fog],
    weightGrams: 110,
    attributes: { activity: "Running", material: "Recycled polyester", fit: "Regular" },
    collections: ["night-run"],
    related: ["boom-strider-3", "seam-split-short-men"],
    daysAgo: 25,
    sales: 356,
  },
  {
    code: "OWL-0019",
    name: "Seam Long Sleeve Tee",
    slug: "seam-long-sleeve-tee",
    brandLine: "Seam",
    gender: "MEN",
    kind: "apparel",
    type: "t-shirts",
    price: 1699,
    hsn: "61091000",
    short: "The Core Tee with sleeves. A thumbhole, if you want it.",
    description: `Same 200 gsm cotton as the Core Tee, with a long sleeve that ends in a ribbed cuff with a thumbhole. The thumbhole is subtle enough to ignore.

It is the layer for a cool morning that will not stay cool.

- 200 gsm combed cotton
- Ribbed cuffs with thumbholes
- Straight cut
- Made in Tiruppur`,
    materials: "100% combed cotton, 200 gsm.",
    care: CARE.cotton,
    colors: [C.charcoal, C.sand],
    weightGrams: 230,
    attributes: { activity: "Everyday", material: "Cotton", fit: "Regular" },
    collections: ["cold-start"],
    related: ["seam-loft-jogger", "seam-quilt-jacket"],
    daysAgo: 20,
    sales: 145,
  },
  {
    code: "OWL-0020",
    name: "Seam Heavy Tee",
    slug: "seam-heavy-tee",
    brandLine: "Seam",
    gender: "UNISEX",
    kind: "apparel",
    type: "t-shirts",
    price: 1999,
    compareAt: 2299,
    hsn: "61091000",
    short: "280 gsm. Boxy. Holds a crease like a shirt.",
    description: `The Heavy Tee is a 280 gsm cotton with a hand you can feel through a jacket. It is cut boxy, short in the body and wide through the chest, with a sleeve that ends above the elbow.

It is the tee that stops being a tee after a few washes and becomes the thing you wear.

- 280 gsm heavy cotton, garment-washed
- Boxy, relaxed fit
- Wide ribbed collar
- Made in Tiruppur`,
    materials: "100% heavy cotton, 280 gsm, garment-washed.",
    care: CARE.cotton,
    colors: [C.ink, C.bone],
    weightGrams: 260,
    badges: ["NEW"],
    attributes: { activity: "Everyday", material: "Heavy cotton", fit: "Relaxed" },
    related: ["hush-terrace", "seam-court-short"],
    stock: "mixed",
    daysAgo: 6,
    sales: 89,
  },

  // ------------------------------------------------------------------ polos
  {
    code: "OWL-0021",
    name: "Seam Piqué Polo",
    slug: "seam-pique-polo-men",
    brandLine: "Seam",
    gender: "MEN",
    kind: "apparel",
    type: "polos",
    price: 2299,
    hsn: "61051020",
    short: "A cotton piqué polo with a collar that stays down.",
    description: `The Piqué Polo is a mid-weight cotton piqué with a knitted collar that has a little more body than most. It does not curl, and it does not need a fusing to stay flat.

The placket is two buttons. The hem is straight with short side vents. It is cut regular, with a sleeve that ends mid-bicep.

- 220 gsm cotton piqué
- Knitted collar and cuffs
- Two-button placket, side vents
- Regular fit`,
    materials: "100% cotton piqué, 220 gsm.",
    care: CARE.cotton,
    colors: [C.ink, C.moss, C.moon],
    weightGrams: 240,
    attributes: { activity: "Everyday", material: "Piqué", fit: "Regular" },
    related: ["hush-court-1-low", "roost-six-panel-cap"],
    daysAgo: 130,
    sales: 210,
  },
  {
    code: "OWL-0022",
    name: "Seam Piqué Polo",
    slug: "seam-pique-polo-women",
    brandLine: "Seam",
    gender: "WOMEN",
    kind: "apparel",
    type: "polos",
    price: 2199,
    hsn: "61062000",
    short: "The Piqué Polo cut for women. Slightly shaped, not fitted.",
    description: `Same piqué, same collar, on a women's block. It is shaped through the waist but not fitted, and the body is shorter than the men's.

The placket is two buttons and the sleeve is a little narrower. It is the polo that works with joggers.

- 220 gsm cotton piqué
- Knitted collar and cuffs
- Two-button placket, side vents
- Regular fit, shaped`,
    materials: "100% cotton piqué, 220 gsm.",
    care: CARE.cotton,
    colors: [C.moon, C.dusk],
    weightGrams: 210,
    attributes: { activity: "Everyday", material: "Piqué", fit: "Regular" },
    related: ["hush-lane", "seam-track-jogger-women"],
    daysAgo: 130,
    sales: 168,
  },
  {
    code: "OWL-0023",
    name: "Seam Court Polo",
    slug: "seam-court-polo",
    brandLine: "Seam",
    gender: "UNISEX",
    kind: "apparel",
    type: "polos",
    price: 2799,
    hsn: "61051020",
    short: "A performance polo for the court. Light knit, mesh under the arms.",
    description: `The Court Polo is a light polyester knit with mesh panels under the arms and down the sides. It is made to be played in, not just worn.

The collar is a self-fabric stand that does not flap. The placket is hidden. The hem is slightly longer at the back.

- Light polyester knit with mesh side panels
- Self-fabric stand collar, hidden placket
- Drop hem at the back
- Regular fit, 140 g in M`,
    materials: "92% recycled polyester, 8% elastane.",
    care: CARE.synthetic,
    colors: [C.bone, C.slate],
    weightGrams: 140,
    attributes: { activity: "Court", material: "Recycled polyester", fit: "Regular" },
    collections: ["court-edit"],
    related: ["hush-court-1", "seam-court-short"],
    daysAgo: 35,
    sales: 122,
  },

  // ------------------------------------------------------------------ jackets
  {
    code: "OWL-0024",
    name: "Seam Shell Jacket",
    slug: "seam-shell-jacket-men",
    brandLine: "Seam",
    gender: "MEN",
    kind: "apparel",
    type: "jackets",
    price: 5999,
    hsn: "62019990",
    short: "A packable nylon shell. Keeps rain off, folds into its own pocket.",
    description: `The Shell is a ripstop nylon with a water-repellent finish and taped seams at the shoulders. It is not a storm jacket. It is the jacket for the forty minutes it rains.

It packs into its own chest pocket. The hood has a stiffened peak and a single rear adjuster. The cuffs are elastic and the hem has a drawcord.

- Ripstop nylon, DWR finish, taped shoulder seams
- Packs into the chest pocket
- Stiffened hood, elastic cuffs, drawcord hem
- Regular fit, 210 g in M`,
    materials: "100% ripstop nylon with a PFC-free water-repellent finish.",
    care: CARE.synthetic,
    colors: [C.ink, C.olive],
    weightGrams: 210,
    badges: ["NEW"],
    attributes: { activity: "Running", material: "Nylon", fit: "Regular" },
    collections: ["cold-start"],
    related: ["seam-track-jogger-men", "hush-ridge"],
    daysAgo: 4,
    sales: 34,
  },
  {
    code: "OWL-0025",
    name: "Seam Shell Jacket",
    slug: "seam-shell-jacket-women",
    brandLine: "Seam",
    gender: "WOMEN",
    kind: "apparel",
    type: "jackets",
    price: 5799,
    hsn: "62029990",
    short: "The packable Shell on a women's block.",
    description: `The same ripstop nylon and the same pack-away pocket, cut for women. The body is shorter, the hem drawcord pulls in at the waist rather than the hip, and the hood is a size smaller.

- Ripstop nylon, DWR finish, taped shoulder seams
- Packs into the chest pocket
- Stiffened hood, elastic cuffs, drawcord hem
- Regular fit, 190 g in M`,
    materials: "100% ripstop nylon with a PFC-free water-repellent finish.",
    care: CARE.synthetic,
    colors: [C.ink, C.dusk],
    weightGrams: 190,
    attributes: { activity: "Running", material: "Nylon", fit: "Regular" },
    collections: ["cold-start"],
    related: ["seam-track-jogger-women", "quill-tempo"],
    daysAgo: 4,
    sales: 29,
  },
  {
    code: "OWL-0026",
    name: "Seam Quilt Jacket",
    slug: "seam-quilt-jacket",
    brandLine: "Seam",
    gender: "UNISEX",
    kind: "apparel",
    type: "jackets",
    price: 7499,
    compareAt: 8999,
    hsn: "62019990",
    short: "A synthetic-fill quilt for the coldest weeks. Warm when damp.",
    description: `The Quilt is a recycled synthetic fill in a channel quilt. Synthetic because it stays warm when it gets damp, and because it goes in the wash.

The collar stands high and the front is a two-way zip. There are two hand pockets and one inside. It is cut roomy so it goes over a hood.

- Recycled polyester fill, 120 gsm
- Ripstop shell and lining
- Two-way zip, three pockets
- Relaxed fit, 480 g in M`,
    materials:
      "Shell and lining: 100% recycled ripstop polyester. Fill: 100% recycled polyester, 120 gsm.",
    care: CARE.synthetic,
    colors: [C.charcoal, C.sand],
    weightGrams: 480,
    badges: ["LIMITED"],
    attributes: { activity: "Everyday", material: "Recycled polyester", fit: "Relaxed" },
    collections: ["cold-start"],
    related: ["seam-hood-men", "seam-loft-jogger"],
    stock: "low",
    daysAgo: 12,
    sales: 58,
  },

  // ------------------------------------------------------------------ sweatshirts
  {
    code: "OWL-0027",
    name: "Seam Crew Sweat",
    slug: "seam-crew-sweat",
    brandLine: "Seam",
    gender: "UNISEX",
    kind: "apparel",
    type: "sweatshirts",
    price: 2999,
    hsn: "61101120",
    short: "A brushed-back fleece crew. The warm-up and the walk home.",
    description: `The Crew Sweat is a 380 gsm cotton fleece brushed on the inside. It has a raglan sleeve so the shoulder moves, and a ribbed hem that holds without gripping.

The neck is a wide rib with a V insert. It is cut regular. This is the sweatshirt you leave at the gym and are glad you did.

- 380 gsm brushed-back cotton fleece
- Raglan sleeve, ribbed hem and cuffs
- V-insert neck
- Regular fit`,
    materials: "80% cotton, 20% recycled polyester fleece, 380 gsm.",
    care: CARE.fleece,
    colors: [C.fog, C.ink, C.moss],
    weightGrams: 420,
    featured: true,
    attributes: { activity: "Everyday", material: "Brushed fleece", fit: "Regular" },
    collections: ["cold-start"],
    related: ["seam-loft-jogger", "talon-base"],
    daysAgo: 90,
    sales: 386,
  },
  {
    code: "OWL-0028",
    name: "Seam Hood",
    slug: "seam-hood-men",
    brandLine: "Seam",
    gender: "MEN",
    kind: "apparel",
    type: "sweatshirts",
    price: 3499,
    hsn: "61101120",
    short: "The Crew Sweat with a hood that actually stays up.",
    description: `The Hood is the Crew Sweat fleece with a three-panel hood and a lined kangaroo pocket. The hood is cut with a centre panel so it stays up without a drawcord.

The cuffs are long enough to pull over the hand. The pocket is lined with the same fleece, turned smooth side out.

- 380 gsm brushed-back cotton fleece
- Three-panel hood, no drawcord
- Fleece-lined kangaroo pocket
- Regular fit`,
    materials: "80% cotton, 20% recycled polyester fleece, 380 gsm.",
    care: CARE.fleece,
    colors: [C.ink, C.bone],
    weightGrams: 560,
    badges: ["BESTSELLER"],
    attributes: { activity: "Everyday", material: "Brushed fleece", fit: "Regular" },
    collections: ["cold-start"],
    related: ["seam-track-jogger-men", "seam-quilt-jacket"],
    daysAgo: 100,
    sales: 512,
  },
  {
    code: "OWL-0029",
    name: "Seam Hood",
    slug: "seam-hood-women",
    brandLine: "Seam",
    gender: "WOMEN",
    kind: "apparel",
    type: "sweatshirts",
    price: 3299,
    hsn: "61102000",
    short: "The Hood on a women's block. Shorter body, same hood.",
    description: `Same fleece, same three-panel hood, cut for women. The body is shorter and the sleeve is set in rather than raglan so the shoulder line is cleaner.

- 380 gsm brushed-back cotton fleece
- Three-panel hood, no drawcord
- Fleece-lined kangaroo pocket
- Regular fit, set-in sleeve`,
    materials: "80% cotton, 20% recycled polyester fleece, 380 gsm.",
    care: CARE.fleece,
    colors: [C.blush, C.slate],
    weightGrams: 500,
    attributes: { activity: "Everyday", material: "Brushed fleece", fit: "Regular" },
    collections: ["cold-start"],
    related: ["seam-track-jogger-women", "hush-ember"],
    daysAgo: 100,
    sales: 402,
  },

  // ------------------------------------------------------------------ joggers
  {
    code: "OWL-0030",
    name: "Seam Track Jogger",
    slug: "seam-track-jogger-men",
    brandLine: "Seam",
    gender: "MEN",
    kind: "apparel",
    type: "joggers",
    price: 2799,
    hsn: "61034200",
    short: "A tapered jogger in a mid-weight knit. Not too slim, not a sweatpant.",
    description: `The Track Jogger is a 300 gsm cotton knit cut slim through the thigh with a clean taper to a ribbed cuff. The rise sits at the waist.

There are two hand pockets and one zipped back pocket that will hold a phone. The drawcord is flat and the waistband is a wide, soft elastic.

- 300 gsm cotton knit
- Slim through the thigh, tapered leg, ribbed cuff
- Two hand pockets, one zipped back pocket
- Slim fit, 32 in inseam in M`,
    materials: "95% cotton, 5% elastane, 300 gsm.",
    care: CARE.cotton,
    colors: [C.ink, C.charcoal],
    weightGrams: 400,
    attributes: { activity: "Everyday", material: "Cotton", fit: "Slim" },
    related: ["seam-core-tee-men", "seam-hood-men", "hush-ridge"],
    daysAgo: 140,
    sales: 468,
  },
  {
    code: "OWL-0031",
    name: "Seam Track Jogger",
    slug: "seam-track-jogger-women",
    brandLine: "Seam",
    gender: "WOMEN",
    kind: "apparel",
    type: "joggers",
    price: 2699,
    hsn: "61046200",
    short: "The Track Jogger cut for women. High rise, same taper.",
    description: `Same 300 gsm knit, with a higher rise and a shorter inseam. The waistband is wider and sits flat under a tee.

- 300 gsm cotton knit
- High rise, tapered leg, ribbed cuff
- Two hand pockets, one zipped back pocket
- Slim fit, 28 in inseam in M`,
    materials: "95% cotton, 5% elastane, 300 gsm.",
    care: CARE.cotton,
    colors: [C.ink, C.dusk],
    weightGrams: 360,
    attributes: { activity: "Everyday", material: "Cotton", fit: "Slim" },
    related: ["seam-core-tee-women", "seam-hood-women", "talon-circuit"],
    daysAgo: 140,
    sales: 395,
  },
  {
    code: "OWL-0032",
    name: "Seam Loft Jogger",
    slug: "seam-loft-jogger",
    brandLine: "Seam",
    gender: "UNISEX",
    kind: "apparel",
    type: "joggers",
    price: 3299,
    hsn: "61034200",
    short: "A relaxed fleece jogger with an open hem. The winter one.",
    description: `The Loft is the Crew Sweat fleece as a trouser. It is cut relaxed and straight with an open hem, so it sits over a sneaker rather than on top of it.

The waistband is a wide rib with an internal drawcord. Pockets are deep and lined with jersey.

- 380 gsm brushed-back cotton fleece
- Relaxed, straight leg, open hem
- Deep jersey-lined pockets
- Relaxed fit, 30 in inseam in M`,
    materials: "80% cotton, 20% recycled polyester fleece, 380 gsm.",
    care: CARE.fleece,
    colors: [C.fog, C.sand],
    weightGrams: 480,
    attributes: { activity: "Everyday", material: "Brushed fleece", fit: "Relaxed" },
    collections: ["cold-start"],
    related: ["seam-crew-sweat", "seam-long-sleeve-tee"],
    daysAgo: 22,
    sales: 176,
  },

  // ------------------------------------------------------------------ shorts
  {
    code: "OWL-0033",
    name: "Seam Split Short",
    slug: "seam-split-short-men",
    brandLine: "Seam",
    gender: "MEN",
    kind: "apparel",
    type: "shorts",
    price: 1799,
    hsn: "61034200",
    short: "A 3 in split short with a brief liner. For running, only.",
    description: `The Split Short is a 3 in inseam with a side split that lets the leg move all the way through. The liner is a soft brief with a small key pocket.

The waistband is a wide, flat elastic with an internal drawcord. There is one zipped pocket at the back for a gel or a card.

- Light woven recycled polyester
- 3 in inseam, side split
- Brief liner with key pocket, zipped back pocket
- 95 g in M`,
    materials: "Shell: 100% recycled polyester. Liner: 88% polyester, 12% elastane.",
    care: CARE.synthetic,
    colors: [C.ink, C.storm],
    weightGrams: 95,
    attributes: { activity: "Running", material: "Recycled polyester", fit: "Regular" },
    collections: ["night-run"],
    related: ["boom-strider-3", "seam-vent-tee"],
    daysAgo: 48,
    sales: 288,
  },
  {
    code: "OWL-0034",
    name: "Seam Split Short",
    slug: "seam-split-short-women",
    brandLine: "Seam",
    gender: "WOMEN",
    kind: "apparel",
    type: "shorts",
    price: 1699,
    hsn: "61046200",
    short: "The Split Short with a 2.5 in inseam and a higher waist.",
    description: `Same woven shell and side split, with a 2.5 in inseam and a waistband that sits higher and wider. The liner is a soft brief.

- Light woven recycled polyester
- 2.5 in inseam, side split
- Brief liner with key pocket, zipped back pocket
- 85 g in M`,
    materials: "Shell: 100% recycled polyester. Liner: 88% polyester, 12% elastane.",
    care: CARE.synthetic,
    colors: [C.ink, C.moss],
    weightGrams: 85,
    attributes: { activity: "Running", material: "Recycled polyester", fit: "Regular" },
    collections: ["night-run"],
    related: ["quill-tempo", "boom-easy-mile"],
    daysAgo: 48,
    sales: 244,
  },
  {
    code: "OWL-0035",
    name: "Seam Court Short",
    slug: "seam-court-short",
    brandLine: "Seam",
    gender: "UNISEX",
    kind: "apparel",
    type: "shorts",
    price: 1999,
    hsn: "61034200",
    short: "A 7 in woven short with real pockets. Court, gym, street.",
    description: `The Court Short is a 7 in inseam in a stretch woven with two deep hand pockets and a zipped back pocket. No liner, so it works with whatever you already wear.

The waistband is elastic with an external drawcord. The hem has a small vent.

- Stretch woven recycled polyester
- 7 in inseam, no liner
- Two hand pockets, zipped back pocket
- Regular fit, 150 g in M`,
    materials: "90% recycled polyester, 10% elastane.",
    care: CARE.synthetic,
    colors: [C.bone, C.slate],
    weightGrams: 150,
    attributes: { activity: "Court", material: "Recycled polyester", fit: "Regular" },
    collections: ["court-edit"],
    related: ["seam-court-polo", "talon-grip"],
    daysAgo: 66,
    sales: 201,
  },

  // ------------------------------------------------------------------ caps
  {
    code: "OWL-0036",
    name: "Roost Six-Panel Cap",
    slug: "roost-six-panel-cap",
    brandLine: "Roost",
    gender: "UNISEX",
    kind: "cap",
    type: "caps",
    price: 999,
    hsn: "65050090",
    short: "A low-profile cotton cap with a brass slider.",
    description: `A six-panel cap in brushed cotton twill with an unstructured crown and a pre-curved peak. The strap closes with a solid brass slider.

The owl mark is embroidered small at the back, not the front.

- Brushed cotton twill
- Unstructured crown, pre-curved peak
- Brass slider strap
- One size`,
    materials: "100% cotton twill.",
    care: CARE.cap,
    colors: [C.ink, C.bone, C.olive],
    weightGrams: 80,
    attributes: { activity: "Everyday", material: "Cotton" },
    collections: ["court-edit"],
    related: ["seam-core-tee-men", "hush-court-1"],
    daysAgo: 160,
    sales: 690,
  },
  {
    code: "OWL-0037",
    name: "Roost Run Cap",
    slug: "roost-run-cap",
    brandLine: "Roost",
    gender: "UNISEX",
    kind: "cap",
    type: "caps",
    price: 1299,
    hsn: "65050090",
    short: "A five-panel run cap that dries before you get home.",
    description: `The Run Cap is a light ripstop with laser-cut vents and a soft, foldable peak. The sweatband is a quick-dry mesh. Reflective piping runs the seams.

It folds into a pocket and comes back out flat.

- Ripstop polyester with laser-cut vents
- Soft peak, folds flat
- Reflective piping, quick-dry sweatband
- One size, elastic back`,
    materials: "100% recycled polyester ripstop.",
    care: CARE.cap,
    colors: [C.moon, C.storm],
    weightGrams: 45,
    badges: ["NEW"],
    attributes: { activity: "Running", material: "Recycled polyester" },
    collections: ["night-run"],
    related: ["boom-strider-3", "quill-tempo"],
    daysAgo: 8,
    sales: 97,
  },

  // ------------------------------------------------------------------ socks
  {
    code: "OWL-0038",
    name: "Roost Crew Sock, 3-pack",
    slug: "roost-crew-sock-3-pack",
    brandLine: "Roost",
    gender: "UNISEX",
    kind: "socks",
    type: "socks",
    price: 799,
    hsn: "61159500",
    short: "Three pairs of combed cotton crew socks. Cushioned foot, ribbed leg.",
    description: `A crew sock in combed cotton with a terry-cushioned foot and a ribbed leg that stays up. Three pairs in one colour.

The toe is hand-linked so there is no seam to feel.

- Combed cotton with a little elastane
- Terry-cushioned foot, ribbed leg
- Hand-linked toe
- Three pairs`,
    materials: "78% combed cotton, 20% polyamide, 2% elastane.",
    care: CARE.socks,
    colors: [C.ink, C.moon],
    weightGrams: 150,
    attributes: { activity: "Everyday", material: "Cotton" },
    collections: ["court-edit"],
    related: ["hush-court-1", "hush-terrace"],
    daysAgo: 220,
    sales: 1120,
  },
  {
    code: "OWL-0039",
    name: "Roost Run Sock, 2-pack",
    slug: "roost-run-sock-2-pack",
    brandLine: "Roost",
    gender: "UNISEX",
    kind: "socks",
    type: "socks",
    price: 699,
    hsn: "61159600",
    short: "Two pairs of thin run socks with an arch band and a heel tab.",
    description: `A thin run sock in a polyamide blend that wicks and does not slip. There is a band across the arch, a tab at the heel and a left and right foot.

- Polyamide blend, thin
- Arch band, heel tab, anatomical left and right
- Mesh top for airflow
- Two pairs`,
    materials: "70% polyamide, 27% polyester, 3% elastane.",
    care: CARE.socks,
    colors: [C.moon, C.storm],
    weightGrams: 70,
    attributes: { activity: "Running", material: "Recycled polyester" },
    collections: ["night-run"],
    related: ["boom-strider-3", "boom-long-haul"],
    daysAgo: 75,
    sales: 830,
  },

  // ------------------------------------------------------------------ bags
  {
    code: "OWL-0040",
    name: "Roost Gym Duffel",
    slug: "roost-gym-duffel",
    brandLine: "Roost",
    gender: "UNISEX",
    kind: "bag",
    type: "bags",
    price: 3499,
    compareAt: 3999,
    hsn: "42029200",
    short: "A 28 L duffel with a vented shoe pocket. Sized for one session.",
    description: `The Gym Duffel is 28 litres in a coated recycled polyester with a vented shoe compartment at one end and a wet pocket at the other. The main opening is a wide U-zip.

It has grab handles, a detachable shoulder strap and a sleeve that slides over a suitcase handle. It stands up on its own when empty.

- 28 L, coated recycled polyester
- Vented shoe compartment, wet pocket
- Grab handles, detachable shoulder strap, trolley sleeve
- 52 x 26 x 24 cm, 650 g`,
    materials: "Shell: 100% recycled polyester with a PU coating. Lining: 100% recycled polyester.",
    care: CARE.bag,
    colors: [C.ink, C.olive],
    weightGrams: 650,
    featured: true,
    attributes: { activity: "Training", material: "Recycled polyester" },
    collections: ["cold-start"],
    related: ["talon-grip", "talon-lift"],
    daysAgo: 50,
    sales: 164,
  },
];

export function sizesFor(kind: Kind, gender: Gender): string[] {
  switch (kind) {
    case "footwear":
      if (gender === "MEN") return ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"];
      if (gender === "WOMEN") return ["UK 3", "UK 4", "UK 5", "UK 6", "UK 7", "UK 8"];
      return ["UK 4", "UK 5", "UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"];
    case "apparel":
      if (gender === "MEN") return ["S", "M", "L", "XL", "XXL"];
      if (gender === "WOMEN") return ["XS", "S", "M", "L", "XL"];
      return ["XS", "S", "M", "L", "XL", "XXL"];
    case "socks":
      return ["S/M", "L/XL"];
    case "cap":
    case "bag":
      return ["One size"];
  }
}
