import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatINR } from "@/lib/money";

/**
 * Phase 0 token sheet. This page exists so the brand tokens can be reviewed in a
 * real browser before the storefront is built in Phase 2, which replaces it.
 */

const palette = [
  { name: "ink", hex: "#0E1116", use: "Base" },
  { name: "slate", hex: "#1B2129", use: "Raised surfaces, nav, footer" },
  { name: "moon", hex: "#F3F4F2", use: "Light background, text on dark" },
  { name: "talon", hex: "#C79A4B", use: "Brass accent: CTAs, price emphasis" },
  { name: "dusk", hex: "#46407A", use: "Secondary accent, category tints" },
  { name: "fog", hex: "#8B9199", use: "Muted text, borders" },
  { name: "alert", hex: "#C1462F", use: "Errors, low stock, sale" },
] as const;

const scale = [
  { cls: "text-4xl", px: 96 },
  { cls: "text-3xl", px: 64 },
  { cls: "text-2xl", px: 40 },
  { cls: "text-xl", px: 28 },
  { cls: "text-lg", px: 20 },
  { cls: "text-base", px: 16 },
  { cls: "text-sm", px: 14 },
  { cls: "text-xs", px: 12 },
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-16">
      <header className="flex flex-col gap-6">
        <span className="wordmark text-3xl">owlyn</span>
        <p className="measure display text-2xl">For the hours nobody sees.</p>
        <p className="measure text-muted-foreground">
          Phase 0 token sheet. Storefront is dark first. The admin flips to the light palette with a
          single class on its layout.
        </p>
      </header>

      <section aria-labelledby="palette" className="flex flex-col gap-4">
        <h2 id="palette" className="text-xl">
          Colour
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {palette.map((c) => (
            <li key={c.name} className="flex flex-col gap-2">
              <div
                className="aspect-square w-full border border-border"
                style={{ backgroundColor: c.hex }}
              />
              <div className="text-sm">
                <div className="font-medium">{c.name}</div>
                <div className="text-muted-foreground num">{c.hex}</div>
                <div className="text-xs text-muted-foreground">{c.use}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="type" className="flex flex-col gap-4">
        <h2 id="type" className="text-xl">
          Type
        </h2>
        <ul className="flex flex-col gap-3">
          {scale.map((s) => (
            <li key={s.cls} className="flex items-baseline gap-6">
              <span className="w-12 shrink-0 text-xs text-muted-foreground num">{s.px}</span>
              <span className={`display ${s.cls} truncate`}>Night run, Sector 21</span>
            </li>
          ))}
        </ul>
        <p className="measure">
          Body is Inter Tight. Headings are Archivo, semi-expanded, tight leading, sentence case.
          Prices use tabular figures so columns line up:{" "}
          <span className="font-medium text-talon num">{formatINR(449900)}</span>,{" "}
          <span className="text-muted-foreground num line-through">{formatINR(599900)}</span>.
        </p>
      </section>

      <section aria-labelledby="controls" className="flex flex-col gap-4">
        <h2 id="controls" className="text-xl">
          Controls
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Add to bag</Button>
          <Button variant="secondary">Track order</Button>
          <Button variant="outline">Size guide</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="destructive">Remove</Button>
          <Button variant="link">Forgot password</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>New</Badge>
          <Badge variant="brass">Bestseller</Badge>
          <Badge variant="dusk">Limited</Badge>
          <Badge variant="outline">Unisex</Badge>
          <Badge variant="alert">Only 2 left</Badge>
          <Badge variant="success">Delivered</Badge>
        </div>
        <form className="flex max-w-sm flex-col gap-2">
          <Label htmlFor="pincode">Pincode</Label>
          <Input id="pincode" inputMode="numeric" placeholder="560001" maxLength={6} />
        </form>
      </section>

      <section className="theme-admin flex flex-col gap-4 bg-background p-6 text-foreground">
        <h2 className="text-xl">Admin surface</h2>
        <p className="measure text-muted-foreground">
          Same components, light tokens. Primary becomes ink so brass stays reserved for the
          storefront.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Save product</Button>
          <Button variant="outline">Export CSV</Button>
          <Badge variant="muted">Draft</Badge>
          <span className="num">OWL-2026-000123</span>
        </div>
      </section>
    </main>
  );
}
