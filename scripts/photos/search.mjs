/**
 * Collects candidate photos from Unsplash's search for each subject, saves
 * their metadata and a thumbnail, and builds a numbered contact sheet per
 * subject so a person can vet frames for logos before any download.
 *
 *   node scripts/photos/search.mjs            # all subjects
 *   node scripts/photos/search.mjs sneakers   # one subject
 *
 * Output: scripts/photos/out/<subject>.json, thumbs/, sheets/<subject>.jpg
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sharpDir = (await import("node:fs"))
  .readdirSync(path.join(root, "node_modules/.pnpm"))
  .find((d) => d.startsWith("sharp@"));
const sharp = require(path.join(root, "node_modules/.pnpm", sharpDir, "node_modules/sharp"));

const SUBJECTS = {
  sneakers: [
    "white leather sneaker",
    "minimal sneakers studio",
    "sneaker product photography",
    "white sneaker isolated",
    "canvas sneaker plain",
    "black sneaker plain",
  ],
  running: [
    "running shoes studio",
    "running shoe product photo",
    "running shoe isolated",
    "trail running shoe close up",
    "knit running shoe",
  ],
  training: [
    "training shoes gym",
    "cross training shoe",
    "gym shoe product",
    "workout shoes flat lay",
  ],
  tee: [
    "plain t-shirt studio",
    "blank t-shirt",
    "black t-shirt man",
    "white t-shirt woman minimal",
    "long sleeve tee plain",
    "t-shirt mockup blank",
  ],
  polo: ["polo shirt man", "polo shirt woman", "pique polo", "plain polo shirt"],
  jacket: [
    "running jacket",
    "quilted jacket",
    "windbreaker jacket woman",
    "shell jacket",
    "puffer jacket plain",
  ],
  sweat: [
    "plain hoodie",
    "blank hoodie",
    "crewneck sweatshirt",
    "hoodie woman minimal",
    "sweatshirt mockup",
  ],
  jogger: ["joggers sweatpants", "track pants man", "joggers woman", "sweatpants plain"],
  shorts: ["running shorts", "gym shorts man", "athletic shorts woman", "shorts plain"],
  cap: ["baseball cap plain", "running cap", "cap minimal", "blank cap", "dad hat plain"],
  socks: ["crew socks", "athletic socks", "socks white", "socks plain minimal", "socks flat lay"],
  bag: ["gym duffel bag", "duffel bag", "sports bag", "canvas duffel", "weekender bag"],
  hero: [
    "night run city",
    "runner at dawn",
    "athlete training dark gym",
    "sprinter track night",
    "running stairs dusk",
  ],
};

const BLOCK =
  /nike|adidas|puma|reebok|new balance|asics|jordan|converse|vans|logo|brand|swoosh|under armour|supreme|gucci|champion/i;

async function search(query) {
  const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=30&orientation=portrait`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${query}: ${res.status}`);
  const data = await res.json();
  return data.results;
}

async function main() {
  const only = process.argv[2];
  const out = path.join(root, "scripts/photos/out");
  await mkdir(path.join(out, "thumbs"), { recursive: true });
  await mkdir(path.join(out, "sheets"), { recursive: true });

  for (const [subject, queries] of Object.entries(SUBJECTS)) {
    if (only && subject !== only) continue;
    const seen = new Map();
    for (const q of queries) {
      for (const r of await search(q)) {
        const text = `${r.description ?? ""} ${r.alt_description ?? ""} ${(r.tags ?? []).map((t) => t.title).join(" ")}`;
        if (BLOCK.test(text)) continue;
        // Unsplash+ photos are not under the free licence and 404 on images.unsplash.com.
        if (
          r.premium ||
          r.plus ||
          String(r.urls?.raw ?? "").includes("plus.unsplash.com") ||
          String(r.urls?.raw ?? "").includes("premium_photo")
        )
          continue;
        if (r.width < 1600 || r.height < 1600) continue;
        if (!seen.has(r.id)) {
          seen.set(r.id, {
            id: r.id,
            slug: r.slug,
            alt: r.alt_description,
            description: r.description,
            query: q,
            width: r.width,
            height: r.height,
            photographer: r.user?.name,
            username: r.user?.username,
            page: r.links?.html,
            raw: r.urls?.raw,
            thumb: r.urls?.small,
          });
        }
      }
    }
    const list = Array.from(seen.values()).slice(0, 60);
    await writeFile(path.join(out, `${subject}.json`), JSON.stringify(list, null, 2));

    // Thumbnails and a contact sheet (6 columns, 3:4 cells, numbered).
    const cellW = 200;
    const cellH = 267;
    const cols = 6;
    const rows = Math.ceil(list.length / cols);
    const composites = [];
    for (const [i, p] of list.entries()) {
      const file = path.join(out, "thumbs", `${p.id}.jpg`);
      let bytes;
      try {
        bytes = await readFile(file);
      } catch {
        const res = await fetch(
          `https://images.unsplash.com/${new URL(p.raw).pathname.slice(1)}?w=400&h=533&fit=crop&q=70&fm=jpg`,
        );
        if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) {
          console.warn(
            `thumb failed for ${p.id}: ${res.status} ${res.headers.get("content-type")}`,
          );
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }
        bytes = Buffer.from(await res.arrayBuffer());
        await writeFile(file, bytes);
        await new Promise((r) => setTimeout(r, 150));
      }
      let cell;
      try {
        cell = await sharp(bytes).resize(cellW, cellH, { fit: "cover" }).toBuffer();
      } catch {
        console.warn(`unreadable thumb for ${p.id}`);
        continue;
      }
      const label = Buffer.from(
        `<svg width="${cellW}" height="${cellH}"><rect x="4" y="4" width="46" height="22" fill="black" opacity="0.7"/><text x="10" y="21" font-size="16" font-family="Arial" fill="white">${i + 1}</text></svg>`,
      );
      const labelled = await sharp(cell)
        .composite([{ input: label, top: 0, left: 0 }])
        .toBuffer();
      composites.push({
        input: labelled,
        top: Math.floor(i / cols) * cellH,
        left: (i % cols) * cellW,
      });
    }
    await sharp({
      create: {
        width: cols * cellW,
        height: Math.max(1, rows) * cellH,
        channels: 3,
        background: "#ffffff",
      },
    })
      .composite(composites)
      .jpeg({ quality: 80 })
      .toFile(path.join(out, "sheets", `${subject}.jpg`));
    console.log(`${subject}: ${list.length} candidates`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
