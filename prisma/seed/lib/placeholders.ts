import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Generated SVG placeholders. Flat colour, one geometric shape, the product
 * name. Original work with no third-party rights. Listed in ASSETS.md.
 */

const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const FONT = "Archivo, 'Inter Tight', Inter, Helvetica, Arial, sans-serif";

export function writeSvg(relativePath: string, svg: string): string {
  const full = path.join(PUBLIC_DIR, relativePath);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, svg, "utf8");
  return "/" + relativePath.replace(/\\/g, "/");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/** Relative luminance, 0 (black) to 1 (white). */
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Mix `hex` toward black (negative) or white (positive) by `amount` in [-1, 1]. */
function shade(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  const target = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  return rgbToHex(rgb.map((v) => v + (target - v) * t) as [number, number, number]);
}

function textOn(hex: string): string {
  return luminance(hex) > 0.35 ? "#0e1116" : "#f3f4f2";
}

export type ProductSvgInput = {
  name: string;
  line: string;
  colorName: string;
  colorHex: string;
  view: 1 | 2;
};

/** 3:4 product placeholder. View 1 is the "front", view 2 the "detail". */
export function productSvg({ name, line, colorName, colorHex, view }: ProductSvgInput): string {
  const w = 900;
  const h = 1200;
  const fg = textOn(colorHex);
  const shape = shade(colorHex, luminance(colorHex) > 0.35 ? -0.14 : 0.16);
  const bg = view === 1 ? colorHex : shade(colorHex, luminance(colorHex) > 0.35 ? -0.05 : 0.06);
  const figure =
    view === 1
      ? `<circle cx="${w * 0.62}" cy="${h * 0.5}" r="${w * 0.36}" fill="${shape}"/>`
      : `<polygon points="0,${h * 0.78} ${w},${h * 0.32} ${w},${h * 0.52} 0,${h * 0.98}" fill="${shape}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXml(name)}, ${escapeXml(colorName)}">
<rect width="${w}" height="${h}" fill="${bg}"/>
${figure}
<text x="64" y="104" font-family="${FONT}" font-size="30" font-weight="600" fill="${fg}" opacity="0.72">${escapeXml(line)}</text>
<text x="64" y="${h - 128}" font-family="${FONT}" font-size="64" font-weight="700" letter-spacing="-1.5" fill="${fg}">${escapeXml(name)}</text>
<text x="64" y="${h - 72}" font-family="${FONT}" font-size="30" fill="${fg}" opacity="0.72">${escapeXml(colorName)}${view === 2 ? " · detail" : ""}</text>
</svg>
`;
}

export type TileSvgInput = {
  title: string;
  subtitle?: string;
  width: number;
  height: number;
  bg: string;
  accent: string;
};

/**
 * Category tiles, collection heroes and banners. Colour and one shape only:
 * the components that use these render their own headline or label on top.
 */
export function tileSvg({ title, width, height, bg, accent }: TileSvgInput): string {
  const r = Math.min(width, height) * 0.42;
  const ring = shade(bg, luminance(bg) > 0.35 ? -0.08 : 0.08);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)}">
<rect width="${width}" height="${height}" fill="${bg}"/>
<circle cx="${width * 0.72}" cy="${height * 0.44}" r="${r * 1.18}" fill="${ring}"/>
<circle cx="${width * 0.72}" cy="${height * 0.44}" r="${r}" fill="${accent}" opacity="0.92"/>
</svg>
`;
}
