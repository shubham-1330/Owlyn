/**
 * Close-up sheet for vetting picks: 3 columns at 400 px wide so small marks
 * and embroidered logos show. Usage:
 *   node scripts/photos/review.mjs sneakers 3,10,12,14
 * Numbers are the ones printed on the subject's contact sheet.
 */
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sharpDir = (await import("node:fs"))
  .readdirSync(path.join(root, "node_modules/.pnpm"))
  .find((d) => d.startsWith("sharp@"));
const sharp = require(path.join(root, "node_modules/.pnpm", sharpDir, "node_modules/sharp"));

const [subject, picks, name = subject] = process.argv.slice(2);
const list = JSON.parse(
  await readFile(path.join(root, "scripts/photos/out", `${subject}.json`), "utf8"),
);
const numbers = picks
  .split(",")
  .map((n) => Number(n.trim()))
  .filter(Boolean);
const cellW = 400;
const cellH = 533;
const cols = 3;
const composites = [];
let i = 0;
for (const n of numbers) {
  const p = list[n - 1];
  if (!p) continue;
  const res = await fetch(
    `https://images.unsplash.com/${new URL(p.raw).pathname.slice(1)}?w=800&h=1067&fit=crop&q=75&fm=jpg`,
  );
  if (!res.ok) {
    console.warn(`skip ${n}: ${res.status}`);
    continue;
  }
  const cell = await sharp(Buffer.from(await res.arrayBuffer()))
    .resize(cellW, cellH, { fit: "cover" })
    .toBuffer();
  const label = Buffer.from(
    `<svg width="${cellW}" height="${cellH}"><rect x="6" y="6" width="120" height="30" fill="black" opacity="0.7"/><text x="14" y="28" font-size="20" font-family="Arial" fill="white">${n} · ${p.id}</text></svg>`,
  );
  composites.push({
    input: await sharp(cell)
      .composite([{ input: label, top: 0, left: 0 }])
      .toBuffer(),
    top: Math.floor(i / cols) * cellH,
    left: (i % cols) * cellW,
  });
  i += 1;
  await new Promise((r) => setTimeout(r, 150));
}
await mkdir(path.join(root, "scripts/photos/out/review"), { recursive: true });
const rows = Math.max(1, Math.ceil(i / cols));
const file = path.join(root, "scripts/photos/out/review", `${name}.jpg`);
await sharp({
  create: { width: cols * cellW, height: rows * cellH, channels: 3, background: "#ffffff" },
})
  .composite(composites)
  .jpeg({ quality: 82 })
  .toFile(file);
console.log(file);
