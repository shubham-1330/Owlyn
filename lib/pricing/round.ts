import { assertPaise, type Paise } from "@/lib/money";

/** Half-up rounding for non-negative amounts. 0.5 paisa rounds to 1. */
export function roundHalfUp(value: number): Paise {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `roundHalfUp expects a finite non-negative number, received ${String(value)}`,
    );
  }
  return Math.floor(value + 0.5);
}

/**
 * Split `total` across `weights` proportionally so the parts sum to `total`
 * exactly (largest-remainder method) and no part exceeds its weight. Callers
 * guarantee `total <= sum(weights)`. Zero weights get zero.
 */
export function allocate(total: Paise, weights: readonly Paise[]): Paise[] {
  assertPaise(total, "total");
  const sum = weights.reduce((s, w) => s + w, 0);
  if (total > sum)
    throw new RangeError(`Cannot allocate ${total} across weights summing to ${sum}`);
  if (sum === 0 || total === 0) return weights.map(() => 0);

  const exact = weights.map((w) => (w * total) / sum);
  const parts = exact.map((x) => Math.floor(x));
  let remainder = total - parts.reduce((s, p) => s + p, 0);

  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .filter(({ i }) => parts[i]! < weights[i]!)
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remainder === 0) break;
    parts[i] = parts[i]! + 1;
    remainder -= 1;
  }
  if (remainder !== 0) throw new Error("allocate: remainder left over after distribution");
  return parts;
}
