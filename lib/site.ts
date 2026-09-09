export const SITE_NAME = "Owlyn";
export const SITE_TAGLINE = "For the hours nobody sees.";
export const SITE_DESCRIPTION =
  "Performance and lifestyle apparel, footwear and accessories, made in India for early starts and late finishes.";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString();
}
