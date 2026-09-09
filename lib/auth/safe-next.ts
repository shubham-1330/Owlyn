/**
 * Only allow redirects to same-origin paths. Anything that could leave the site
 * (absolute URLs, protocol-relative `//`, backslash tricks) falls back.
 */
export function safeNextPath(value: unknown, fallback = "/account"): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }
  if (/[\r\n]/.test(trimmed) || trimmed.length > 2048) return fallback;
  return trimmed;
}
