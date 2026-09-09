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

### Resetting the database

`pnpm db:reset` drops and recreates the database, re-applies migrations and re-seeds. Prisma asks for confirmation before doing this.

## Scripts

| Script            | What it does                                     |
| ----------------- | ------------------------------------------------ |
| `pnpm dev`        | Next.js dev server with Turbopack                |
| `pnpm build`      | Production build                                 |
| `pnpm start`      | Serve the production build                       |
| `pnpm lint`       | ESLint (Next + TypeScript rules, Prettier-aware) |
| `pnpm typecheck`  | `tsc --noEmit`                                   |
| `pnpm format`     | Prettier write                                   |
| `pnpm test`       | Vitest unit tests                                |
| `pnpm test:e2e`   | Playwright end-to-end tests                      |
| `pnpm db:up`      | Start Postgres in Docker                         |
| `pnpm db:down`    | Stop Postgres                                    |
| `pnpm db:migrate` | Create and apply migrations in development       |
| `pnpm db:deploy`  | Apply pending migrations (CI, production)        |
| `pnpm db:seed`    | Seed the database                                |
| `pnpm db:reset`   | Drop, migrate and seed                           |
| `pnpm db:studio`  | Prisma Studio                                    |

## Project layout

```
app/
  globals.css           Design tokens and base styles
  layout.tsx            Root layout, fonts, metadata
  (auth)/               Login and register pages plus their server actions
  (storefront)/         Customer-facing routes (account for now)
  admin/                Admin dashboard, light theme, staff-only
  api/auth/             Auth.js route handler
components/
  ui/                   shadcn primitives restyled to Owlyn
  forms/                Field and message helpers shared by forms
  storefront/           Storefront components
  admin/                Admin components (Phase 7)
lib/
  auth.config.ts        Edge-safe Auth.js config (used by middleware)
  auth.ts               Full Auth.js config with Prisma adapter and credentials
  auth/                 Password hashing, guards, safe redirect helper
  db.ts                 Prisma client singleton
  money.ts, tax.ts, shipping.ts   Pure business logic with unit tests
  validations/          Zod schemas shared by client and server
middleware.ts           Protects /account and /admin, bounces signed-in users off /login
prisma/
  schema.prisma         Data model
  migrations/           SQL migrations (init includes the search trigger and order sequence)
  seed.ts, seed/        Idempotent seed and its data modules
types/                  Auth.js type augmentation
tests/                  Playwright e2e (Phase 9)
public/images/          Generated SVG placeholders (see ASSETS.md)
```

## Conventions

- Money is always an integer number of paise. Format with `formatINR` from `lib/money.ts`.
- GST rates are whole percents on the product. `lib/tax.ts` picks the rate from the HSN code and price.
- Brand colours, type scale and radius live in `app/globals.css`. The storefront is dark by default; the admin wraps its layout in `.theme-admin` for the light palette.
- Server Actions for mutations. Route handlers only for webhooks and public APIs.
- Every protected page calls a guard from `lib/auth/guards.ts`. Middleware is a convenience, not the check.

## Progress

See [PROGRESS.md](./PROGRESS.md) for what is done, what is next and known gaps. The build plan and requirements are in [CLAUDE.md](./CLAUDE.md).
