# Owlyn

Direct-to-consumer store for performance and lifestyle apparel, footwear and accessories, built for India: INR pricing in paise, GST, Indian address format, Razorpay and cash on delivery.

Tagline: **For the hours nobody sees.**

## Stack

| Layer      | Choice                                            |
| ---------- | ------------------------------------------------- |
| Framework  | Next.js 15 (App Router, React 19, Server Actions) |
| Language   | TypeScript, strict                                |
| Styling    | Tailwind CSS v4, design tokens as CSS variables   |
| UI         | shadcn/ui on Radix, restyled to Owlyn tokens      |
| Database   | PostgreSQL 16 via Prisma 6                        |
| Auth       | Auth.js v5 (credentials + Google)                 |
| Payments   | Razorpay + COD                                    |
| Email      | Resend + React Email                              |
| Validation | Zod 4                                             |
| Testing    | Vitest (unit), Playwright (e2e)                   |

Package manager is pnpm. Node 20 or newer. Docker for the local database.

## Local setup

1. Install dependencies. This also generates the Prisma client.

   ```bash
   pnpm install
   ```

2. Copy the environment file. `DATABASE_URL` and `AUTH_SECRET` are required; everything else can wait for the phase that uses it.

   ```bash
   cp .env.example .env
   # AUTH_SECRET: openssl rand -base64 32
   ```

3. Start Postgres. The container listens on host port **5436** because 5432 to 5435 are commonly taken on developer machines. If you change the port mapping in `docker-compose.yml`, change `DATABASE_URL` to match.

   ```bash
   pnpm db:up
   ```

4. Apply migrations and seed the catalogue. The seed is idempotent: run it again to refresh data without duplicates.

   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

   The seed prints three sign-in accounts. The admin email and password come from `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` in `.env`, with local-only defaults when unset.

5. Run the dev server and open http://localhost:3000.

   ```bash
   pnpm dev
   ```

### Google sign-in

Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` from a Google Cloud OAuth client with `http://localhost:3000/api/auth/callback/google` as an authorised redirect URI. The "Continue with Google" button only renders when both are set.

### Payments, email and invoices

Without Razorpay keys, checkout offers cash on delivery only and says so. With `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` set, online payment opens Razorpay Checkout; point a dashboard webhook at `/api/webhooks/razorpay` for `payment.captured`, `payment.failed` and `refund.processed`, and put its secret in `RAZORPAY_WEBHOOK_SECRET`. The webhook is what marks an order paid; the browser callback only speeds it up.

Without `RESEND_API_KEY`, every email is rendered to `.dev-outbox/` as HTML. Invoice PDFs are written under `STORAGE_DIR` (default `./storage`).

Unpaid orders hold stock for `orders.reservationMinutes` (seeded: 20). `vercel.json` schedules `/api/jobs/cleanup` every five minutes to release expired reservations and cancel stale orders; anywhere else, call it with `Authorization: Bearer $CRON_SECRET`.

### Resetting the database

`pnpm db:reset` drops and recreates the database, re-applies migrations and re-seeds. Prisma asks for confirmation before doing this.

## Scripts

| Script                  | What it does                                                         |
| ----------------------- | -------------------------------------------------------------------- |
| `pnpm dev`              | Next.js dev server with Turbopack                                    |
| `pnpm build`            | Production build                                                     |
| `pnpm start`            | Serve the production build                                           |
| `pnpm lint`             | ESLint (Next + TypeScript rules, Prettier-aware)                     |
| `pnpm typecheck`        | `tsc --noEmit`                                                       |
| `pnpm format`           | Prettier write                                                       |
| `pnpm test`             | Vitest unit tests                                                    |
| `pnpm test:integration` | Vitest tests against the local Postgres (orders, webhooks, cleanup)  |
| `pnpm test:e2e`         | Playwright end-to-end tests against the production build (see below) |
| `pnpm db:up`            | Start Postgres in Docker                                             |
| `pnpm db:down`          | Stop Postgres                                                        |
| `pnpm db:migrate`       | Create and apply migrations in development                           |
| `pnpm db:deploy`        | Apply pending migrations (CI, production)                            |
| `pnpm db:seed`          | Seed the database                                                    |
| `pnpm db:reset`         | Drop, migrate and seed                                               |
| `pnpm db:studio`        | Prisma Studio                                                        |

One-off: `pnpm exec tsx scripts/explain-catalog.ts` prints `EXPLAIN ANALYZE` for the heaviest listing query.

`pnpm test:e2e` expects `pnpm build` to have run; it reuses a server on :3000 or starts `pnpm start`. If Playwright cannot download its Chromium, run it on an installed browser with `PLAYWRIGHT_CHANNEL=chrome` (or `msedge`). The Razorpay test is skipped unless `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are set; cash on delivery runs everywhere.

## Project layout

```
app/
  globals.css           Design tokens, motion tokens, base styles
  layout.tsx            Root layout, fonts, metadata
  not-found.tsx         404 page
  (auth)/               Login and register pages plus their server actions
  (storefront)/         Header + footer layout, home, /collections/[slug], /products/[slug], /search, /pages/[slug], /cart, /wishlist, /account
    checkout/           Three-step checkout, its server actions, and /checkout/success/[orderId]
  admin/                Admin dashboard, light theme, staff-only
  api/auth/             Auth.js route handler
  api/webhooks/razorpay Razorpay webhook (signature check, idempotent)
  api/jobs/cleanup      Reservation and stale-order cleanup (cron)
  api/invoices/[orderId] Invoice PDF download, ownership checked in the data layer
components/
  ui/                   shadcn primitives restyled to Owlyn
  forms/                Field and message helpers shared by forms
  storefront/           Header, footer, product card and rail, home sections, Markdown, breadcrumbs
    plp/                Filters, chips, sort, grid with load more, pagination
    pdp/                Gallery, product view, notify form, size guide, delivery estimator, reviews
    cart/               Cart provider, drawer, lines, summary, coupon form, shipping bar, quick add
    wishlist/           Wishlist provider, heart button, wishlist page view
    checkout/           Checkout steps, address fields, summary, Razorpay loader, success page helper
  seo/                  JSON-LD helper
  admin/                Admin components (Phase 7)
hooks/                  Client hooks (recent searches)
lib/
  auth.config.ts        Edge-safe Auth.js config (used by middleware)
  auth.ts               Full Auth.js config with Prisma adapter and credentials
  auth/                 Password hashing, guards, safe redirect helper
  cache.ts              Tagged data-cache wrapper for queries
  catalog/              Listing scope resolution and the single-statement catalog query
  pricing/              Pure pricing engine: lines, coupons, shipping, tax, totals (unit tested)
  cart/                 Cart cookies, cached read model, mutations and the login merge
  wishlist/             Wishlist service
  orders/               Order creation, payment capture, cleanup, tax split, order numbers, guest access tokens, customer reads
  payments/             Razorpay SDK wrapper and webhook processing
  invoices/             GST invoice data and PDF rendering
  email/                Send through Resend or the local outbox
  storage.ts            File storage driver (local disk now; S3/UploadThing later)
  recently-viewed.ts    Recently viewed writes and reads
  search-params.ts      The one parser and serialiser for listing URLs
  rate-limit.ts         Sliding-window limiter (Upstash or in-memory)
  delivery.ts           Delivery window maths
  db.ts                 Prisma client singleton
  queries/              Read models for menus, settings, home, banners, products, product detail, categories, collections, shipping, pages
  money.ts, tax.ts, shipping.ts   Pure business logic with unit tests
  validations/          Zod schemas shared by client and server
emails/                 React Email templates (confirmation, shipped, delivered, cancelled, refund, needs review)
middleware.ts           Protects /account and /admin, bounces signed-in users off /login
prisma/
  schema.prisma         Data model
  migrations/           SQL migrations (init includes the search trigger and order sequence)
  seed.ts, seed/        Idempotent seed and its data modules
types/                  Auth.js type augmentation
tests/
  integration/          Vitest against Postgres: order lifecycle, webhooks, cleanup
  e2e/                  Playwright: browse, add, checkout, order placed
vercel.json             Cron schedule for the cleanup job
public/images/          Generated SVG placeholders (see ASSETS.md)
```

## Content model

The storefront reads its structure from the database, so the admin (Phase 7) can change it without a deploy:

- **Navigation**: `MenuItem` rows in the `main` menu become the mega menu and the mobile drawer. Children grouped by `group` become link columns; children in the `tiles` group become image tiles. Three `footer-*` menus feed the footer.
- **Home page**: `HomepageSection` rows set the order and per-section config; `Banner` rows fill the hero, the collection block and the editorial split, honouring their schedule windows.
- **Pages**: `Page` rows render at `/pages/[slug]` from GitHub-flavoured Markdown, sanitised on the server. Full MDX is deliberately not supported.
- **Settings**: `Setting` rows drive the trust strip, footer, trending searches, delivery cut-off and store contact details.
- **Bag**: guest bags key off an httpOnly `cartToken` cookie, account bags off the user. Every mutation re-reads price and stock on the server; the pricing engine in `lib/pricing/` does the maths. On sign-in the guest bag merges into the account bag (same variant keeps the larger quantity).
- **Listings**: `/collections/[slug]` resolves a category (with its subtree), a live collection, a virtual listing (`new`, `bestsellers`, `sale`, `all`) or a cross-gender type (`footwear`, `sneakers`). Filter state lives in the URL and is parsed by `lib/search-params.ts`; the search page shares it.

Reads go through `lib/queries/` and are cached with tags, so a publish can call `revalidateTag` on exactly what changed.

## Conventions

- Money is always an integer number of paise. Format with `formatINR` from `lib/money.ts`.
- GST rates are whole percents on the product. `lib/tax.ts` picks the rate from the HSN code and price.
- Brand colours, type scale and radius live in `app/globals.css`. The storefront is dark by default; the admin wraps its layout in `.theme-admin` for the light palette.
- Server Actions for mutations. Route handlers only for webhooks and public APIs.
- Every protected page calls a guard from `lib/auth/guards.ts`. Middleware is a convenience, not the check.
- Order totals come from `lib/pricing.priceCart` and nowhere else. Checkout, the shipping quote and order creation all call it; the client sends ids and quantities only.
- An order is paid when `capturePayment` says so, whether the webhook or the verified browser callback got there first. It is idempotent on the provider payment id.

## Progress

See [PROGRESS.md](./PROGRESS.md) for what is done, what is next and known gaps. The build plan and requirements are in [CLAUDE.md](./CLAUDE.md).
