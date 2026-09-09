# Progress

## Phase 1: Data & auth (done)

### Data

- `prisma/schema.prisma`: 49 tables covering everything in CLAUDE.md section 4 plus what later phases need: order events for the timeline, stock reservations, back-in-stock requests, product relations for "complete the look", a pincode directory, menu items, homepage sections, customer notes, one-time auth tokens and the Auth.js adapter tables.
- Single init migration. Hand-written additions at the end of the SQL: a trigger that maintains `Product.searchVector` (weighted name, brand line, short and long copy), and a sequence for order numbers in the form `OWL-2026-000123`. Prisma owns the GIN full-text index and the trigram index on product names, so `prisma migrate dev` reports zero drift.
- Seed (`pnpm db:seed`, idempotent):

  | Entity         | Count                                                                 |
  | -------------- | --------------------------------------------------------------------- |
  | Categories     | 32 (Men and Women → Footwear, Clothing, Accessories → 12 leaves each) |
  | Collections    | 3 (Night Run, Court Edit, Cold Start)                                 |
  | Products       | 40 across five brand lines: Hush, Boom, Quill, Talon, Seam, Roost     |
  | Variants       | 454 (size × colour, stable SKUs, deterministic stock)                 |
  | Product images | 170 generated SVGs                                                    |
  | Users          | 3 (admin, staff, customer with two addresses)                         |
  | Coupons        | 7 (all four rule types, one expired, one inactive)                    |
  | Shipping       | 3 zones, 4 rates, 32 pincodes                                         |
  | CMS pages      | 9                                                                     |
  | Banners        | 5 (one scheduled for the future)                                      |
  | Menu items     | 58 across main and three footer menus                                 |
  | Settings       | 18                                                                    |

- Business logic in `lib/`: `money.ts` (paise), `tax.ts` (GST by HSN chapter and price threshold, inclusive tax back-out, CGST/SGST split), `shipping.ts` (longest-prefix zone match, rate calculation), `slug.ts`. 20 unit tests pass.

### Auth

- Auth.js v5 with JWT sessions. `lib/auth.config.ts` is edge-safe for middleware; `lib/auth.ts` adds the Prisma adapter and an argon2id credentials provider. Google is enabled only when its env vars exist.
- The JWT re-reads role and ban state from the database every five minutes, so demotions and bans take effect without waiting for expiry.
- `lib/auth/guards.ts`: `requireUser`, `requireRole`, `requireStaff`, `requireAdmin`. Non-staff hitting `/admin` get a 404 from the guard and a redirect home from middleware.
- Pages: `/login`, `/register` (server actions, Zod validation, inline field errors, pending state, safe `next` redirect), `/account` (real profile data, sign out), `/admin` (light theme shell with live counts).

### Verified

- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all pass.
- Seed run twice produces identical counts.
- Full-text query "running shoe soft" ranks Talon Circuit and Boom Strider 3 first; trigram search finds "Boom Strider 3" from the typo "strdier".
- Browser check against the production build: wrong password shows an inline error, the customer lands on `/account`, a customer is bounced from `/admin`, the admin sees the overview, and `/account` while signed out redirects to `/login?next=/account`.

### Decisions worth knowing

- **Search column is trigger-maintained, not generated.** Prisma's diff engine reads a generated column's expression as a default and tries to drop it on every `migrate dev`. A `BEFORE INSERT OR UPDATE` trigger is invisible to Prisma and gives the same result.
- **`@auth/core` is a direct dependency.** `next-auth/jwt` star-re-exports the `JWT` type, and TypeScript cannot merge an augmentation through a star export. Augmenting `@auth/core/jwt` works, so the package is pinned at the exact version next-auth uses.
- **Google account linking is on.** Google verifies email ownership, so a Google sign-in with an email that already has a password account links to it instead of failing.
- **GST** follows the schedule in force from 22 September 2025: apparel, footwear and headgear 5% at or under ₹2,500, 18% above; bags 18%. Rates are stored per product and recomputed by the seed.
- **Prisma reset needs a human.** The Prisma CLI refuses `migrate reset` when driven by an agent. During this phase the empty dev schema was dropped with psql instead; `pnpm db:reset` works normally from a terminal.
- **Menu links to virtual collections** (`/collections/new`, `bestsellers`, `footwear`, `clothing`, `accessories`) are resolved by the PLP in Phase 3 alongside real category and collection slugs.

## Phase 0: Foundation (done)

- Next.js 15.5 + React 19 + TypeScript strict, scaffolded by hand so versions match the spec (the current `create-next-app` targets Next 16).
- Tailwind CSS v4 with Owlyn tokens in `app/globals.css`, `.theme-admin` for the light admin, 12 to 96 type scale, 2px radius on controls.
- Fonts via `next/font`: Archivo with the width axis, Inter Tight.
- shadcn/ui on the `radix-ui` package; button, input, label, badge, separator restyled.
- ESLint 9 flat config, Prettier with the Tailwind sorter, Vitest, Docker Compose for Postgres on 5436.
- `app/page.tsx` is a token sheet for reviewing palette, type and controls. Phase 2 replaces it.

### Tagline

Direction given: "Built for the hours nobody sees." Alternatives considered:

1. For the hours nobody sees.
2. Made before sunrise.
3. Quiet work, done right.

Picked **1**.

## Phase 2: Storefront shell (next)

- Layout, header with mega menu driven by `MenuItem`, mobile drawer, footer, home page sections driven by `HomepageSection` and `Banner`, CMS pages at `/pages/[slug]`.
- Design review against CLAUDE.md section 3 before writing components.

## Known gaps

- `/forgot-password`, `/reset-password` and `/verify-email` wait for the email layer (Phase 5 introduces Resend; Phase 8 wires the flows). The `AuthToken` model is ready for them.
- No rate limiting on login or register until Phase 9.
- Phone OTP sign-in is modelled (`phone`, `phoneVerified`, `AuthToken.PHONE_OTP`) but has no provider yet.
- The home route is still the Phase 0 token sheet.
- Playwright is installed but has no tests until Phase 9.
