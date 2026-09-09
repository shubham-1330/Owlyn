# Progress

## Phase 0: Foundation (done)

- Next.js 15.5 + React 19 + TypeScript strict, scaffolded by hand so the versions match the spec (the current `create-next-app` targets Next 16).
- Tailwind CSS v4 with Owlyn tokens in `app/globals.css`: brand palette, semantic shadcn tokens for the dark storefront, `.theme-admin` for the light admin, 12 to 96 type scale, 2px radius on controls.
- Fonts via `next/font`: Archivo (with the width axis so headings can sit at 112% stretch) and Inter Tight.
- shadcn/ui on the `radix-ui` package. Five primitives added and restyled: button, input, label, badge, separator.
- ESLint 9 flat config with Next rules and Prettier compatibility. Prettier with the Tailwind class sorter.
- Vitest configured. First unit test covers `lib/money.ts`.
- Docker Compose for Postgres 16 on host port 5436.
- `.env.example`, `README.md`, `ASSETS.md`.
- `app/page.tsx` is a token sheet for reviewing the palette, type and controls in a browser. Phase 2 replaces it with the real home page.

### Tagline

Direction given: "Built for the hours nobody sees." Alternatives considered:

1. For the hours nobody sees.
2. Made before sunrise.
3. Quiet work, done right.

Picked **1**. It keeps the idea, drops a word, and reads cleanly under the wordmark.

### Dependency notes

- `eslint-config-prettier` was added so ESLint does not fight Prettier. Tooling only.
- The shadcn CLI adds `radix-ui` (the single-package Radix distribution) rather than per-primitive packages. Pinned exactly.
- Razorpay, Resend, React Email, UploadThing and Upstash are installed in the phases that use them.

## Phase 1: Data & auth (next)

- Full Prisma schema per CLAUDE.md section 4, initial migration, seed with categories, collections, 40 products, users, coupons, shipping zones and CMS pages.
- Auth.js v5 with credentials (argon2id) and Google, role guard helpers, protected route middleware.

## Known gaps

- No storefront yet. The home route is the token sheet.
- Playwright is installed but has no tests until Phase 9.
