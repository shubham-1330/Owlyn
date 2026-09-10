/**
 * WCAG 2.1 contrast ratios for the Owlyn palette. Run with
 * `pnpm exec tsx scripts/contrast.ts` after changing tokens; the table it
 * prints is what PROGRESS.md quotes.
 */

const TOKENS = {
  paper: "#F7F6F3",
  ink: "#17191C",
  slate: "#E8E6E1",
  talon: "#8A6A2F",
  dusk: "#3B3566",
  fog: "#6B7076",
  alert: "#A3341F",
  moon: "#F3F4F2",
  // working tints
  "ink-2": "#2A2D33",
  "slate-2": "#DDDAD3",
  "fog-2": "#C9C6BF",
  "fog-3": "#5A5F65",
  "talon-2": "#6F5424",
  "talon-3": "#A8853F",
  "dusk-2": "#524A8A",
  "alert-2": "#8C2A17",
  success: "#2E6B3F",
} as const;

type Hex = string;

function luminance(hex: Hex): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!);
}

export function contrast(a: Hex, b: Hex): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Colour of `fg` at `alpha` over `bg`, as the browser will composite it. */
export function blend(fg: Hex, bg: Hex, alpha: number): Hex {
  const f = fg.replace("#", "");
  const b = bg.replace("#", "");
  const ch = (i: number) =>
    Math.round(
      parseInt(f.slice(i, i + 2), 16) * alpha + parseInt(b.slice(i, i + 2), 16) * (1 - alpha),
    );
  return "#" + [0, 2, 4].map((i) => ch(i).toString(16).padStart(2, "0")).join("");
}

const T = TOKENS;
const rows: Array<[string, Hex, Hex, number]> = [
  ["Body text: ink on paper", T.ink, T.paper, 4.5],
  ["Muted text: fog on paper", T.fog, T.paper, 4.5],
  ["Muted text: fog on slate", T.fog, T.slate, 4.5],
  ["Muted text: fog-3 on paper", T["fog-3"], T.paper, 4.5],
  ["Muted text on cards: fog-3 on slate", T["fog-3"], T.slate, 4.5],
  ["Disabled control: fog-3 on slate-2", T["fog-3"], T["slate-2"], 4.5],
  ["Muted badge: fog-3 on slate-2", T["fog-3"], T["slate-2"], 4.5],
  ["Success on slate", T.success, T.slate, 4.5],
  ["Sidebar primary: ink on talon-3", T.ink, T["talon-3"], 4.5],
  ["Price emphasis: talon on paper", T.talon, T.paper, 4.5],
  ["Primary button: paper on talon", T.paper, T.talon, 4.5],
  ["Primary button hover: paper on talon-2", T.paper, T["talon-2"], 4.5],
  ["Brass badge: paper on talon", T.paper, T.talon, 4.5],
  ["Dusk accent: dusk on paper", T.dusk, T.paper, 4.5],
  ["Dusk badge: paper on dusk", T.paper, T.dusk, 4.5],
  ["Error text: alert on paper", T.alert, T.paper, 4.5],
  ["Error text: alert-2 on paper", T["alert-2"], T.paper, 4.5],
  ["Alert badge: paper on alert", T.paper, T.alert, 4.5],
  ["Success text: success on paper", T.success, T.paper, 4.5],
  ["Success badge: paper on success", T.paper, T.success, 4.5],
  ["Ink badge / sidebar: moon on ink", T.moon, T.ink, 4.5],
  ["Sidebar muted: fog-2 on ink", T["fog-2"], T.ink, 4.5],
  ["Focus ring: talon on paper (UI, 3:1)", T.talon, T.paper, 3],
  ["Focus ring: talon on slate (UI, 3:1)", T.talon, T.slate, 3],
  ["Input border: fog on paper (UI, 3:1)", T.fog, T.paper, 3],
  ["Divider: fog-2 on paper (decorative)", T["fog-2"], T.paper, 1],
  ["Progress fill: talon on slate track (UI, 3:1)", T.talon, T.slate, 3],
  ["Progress fill: talon on slate-2 track (UI, 3:1)", T.talon, T["slate-2"], 3],
  [
    "Disabled primary at 50%: text vs button",
    blend(T.paper, T.paper, 0.5),
    blend(T.talon, T.paper, 0.5),
    4.5,
  ],
  [
    "Sold-out overlay text: ink on paper at 80% over mid-grey photo",
    T.ink,
    blend(T.paper, "#808080", 0.8),
    4.5,
  ],
  ["Selection: ink on talon-3", T.ink, T["talon-3"], 4.5],
  ["Selection: paper on talon", T.paper, T.talon, 4.5],
  ["Scrim text: moon on ink at 60% over mid-grey photo", T.moon, blend(T.ink, "#808080", 0.6), 4.5],
];

if (require.main === module) {
  for (const [label, fg, bg, min] of rows) {
    const ratio = contrast(fg, bg);
    const ok = ratio >= min ? "ok " : "LOW";
    console.log(`${ok}  ${ratio.toFixed(2).padStart(5)}  (min ${min})  ${label}  ${fg} on ${bg}`);
  }
}
