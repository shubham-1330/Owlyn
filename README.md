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

Package manager is pnpm. Node 20 or newer.

## Local setup

1. Install dependencies.

   ```bash
   pnpm install
   ```

2. Copy the environment file and fill in what you have. Only `DATABASE_URL` and `AUTH_SECRET` are needed to run locally.

   ```bash
   cp .env.example .env
   # AUTH_SECRET: openssl rand -base64 32
   ```

3. Start Postgres. The container listens on host port **5436** because 5432 to 5435 are commonly taken on developer machines. Change the port mapping in `docker-compose.yml` and `DATABASE_URL` together if you need a different one.

   ```bash
   pnpm db:up
   ```

4. Run the dev server.

   ```bash
   pnpm dev
   ```

   Open http://localhost:3000.

## Scripts

| Script           | What it does                                     |
| ---------------- | ------------------------------------------------ |
| `pnpm dev`       | Next.js dev server with Turbopack                |
| `pnpm build`     | Production build                                 |
| `pnpm start`     | Serve the production build                       |
| `pnpm lint`      | ESLint (Next + TypeScript rules, Prettier-aware) |
| `pnpm typecheck` | `tsc --noEmit`                                   |
| `pnpm format`    | Prettier write                                   |
| `pnpm test`      | Vitest unit tests                                |
| `pnpm test:e2e`  | Playwright end-to-end tests                      |
| `pnpm db:up`     | Start Postgres in Docker                         |
| `pnpm db:down`   | Stop Postgres                                    |

## Project layout

```
app/                  Next.js App Router
  globals.css         Design tokens and base styles
  layout.tsx          Root layout, fonts, metadata
components/
  ui/                 shadcn primitives restyled to Owlyn
  storefront/         Storefront components (Phase 2+)
  admin/              Admin components (Phase 7)
lib/                  Pure business logic and helpers (money, pricing, tax, shipping)
prisma/               Schema, migrations, seed (Phase 1)
emails/               React Email templates
tests/unit, tests/e2e Vitest and Playwright
public/               Static assets (see ASSETS.md)
```

## Design tokens

Brand colours, type scale and radius live in `app/globals.css`. The storefront is dark by default. The admin dashboard wraps its layout in `.theme-admin`, which swaps the semantic tokens to the light palette so the two surfaces never look alike.

Money is always an integer number of paise. Use `formatINR` from `lib/money.ts` to display it.

## Progress

See [PROGRESS.md](./PROGRESS.md) for what is done, what is next and known gaps. The build plan and requirements are in [CLAUDE.md](./CLAUDE.md).
