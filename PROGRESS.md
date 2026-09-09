# Progress

## Phase 2: Storefront shell (done)

### Design review before building

Token plan checked against CLAUDE.md section 3 before any component was written:

- Ink ground, moon text, brass only for the primary CTA, the count badge and small icon accents. Dusk appears on tiles and badges, never as a wash.
- Header is fixed and transparent over the hero, solid slate when the hero scrolls past, when a menu, drawer or the search overlay is open, or when the pointer is over it. A functional scrim keeps header and headline legible over imagery.
- Sections are separated by whitespace (`py-16` to `py-24`), not rules. The only borders are the footer's top rule and form controls.
- Images are 3:4 for products and 4:5 for tiles with zero radius. Controls stay at 2px. The bag count badge is a 1px-radius square, not a pill.
- Headings are Archivo at 112% stretch in sentence case. Group labels in menus are muted sentence-case text, never tracked caps. Links have no arrows. Prices use tabular numerals.
- Motion only on user action: the mega menu, drawer and search overlay animate in; nothing animates on scroll. Reduced-motion users get the poster image and no transitions.

### Built

- **Layout**: `app/(storefront)/layout.tsx` with skip link, fixed header, main offset by the header height, footer. Auth pages keep their own quiet layout.
- **Header** (`components/storefront/header/`): server half loads the menu, session and bag/wishlist counts; client shell handles overlay state. Mega menu on Radix NavigationMenu with three sentence-case columns and two image tiles per panel, all from `MenuItem` rows. Mobile drawer on Radix Dialog with a two-level back stack. Search overlay with trending searches from settings and recent searches in localStorage.
- **Home** (`app/(storefront)/page.tsx`): sections render in `HomepageSection` order, each streamed inside its own Suspense boundary: hero banner (video-capable, poster fallback, reduced-motion aware), featured rail, category tiles, Cold Start collection block with four products, new-this-week rail, Men and Women editorial split, newsletter form, trust strip. Organization and WebSite JSON-LD with a SearchAction.
- **Footer** from the three seeded footer menus plus store settings.
- **CMS pages** at `/pages/[slug]`: Markdown (GitHub flavoured) through rehype-sanitize with Owlyn typography, HTML comments stripped server-side. The contact page carries a working contact form that files `SupportTicket` rows.
- **Search** at `/search`: full-text on the weighted vector, widened by trigram similarity and substring match, ranked by relevance then sales. Loading skeleton and empty state included.
- **Bag** (`/cart`) and **wishlist** (`/account/wishlist`) pages read real rows with empty states so header links resolve. Mutations arrive in Phases 4 and 6.
- **Not-found** and a storefront error boundary.
- **Query layer** in `lib/queries/` wrapped in `unstable_cache` with tags (`home`, `products`, `banners`, `menus`, `settings`, `pages`, `collections`) so admin publishes can call `revalidateTag`. Cached results are JSON-safe by construction.
- **Seed additions**: menu image tiles, section configs for tiles, collection block and editorial split, trending searches. Tile and banner placeholders are now colour and shape only because the components render their own labels.

### Verified in a browser against the running app

- Home renders all eight sections from seed data at 1280px and 390px with no horizontal overflow; the headline is 96px on desktop and 40px on a phone.
- Header: transparent at the top of the home page, solid after scrolling past the hero, transparent again on return.
- Mega menu opens on hover with the full-width panel, three columns and two tiles.
- Search overlay submits to `/search`, stores the term locally, and the results page ranks Boom Strider 3 first for "strider".
- Mobile drawer opens, drills into Women, returns with Back, closes on Escape.
- Contact page: empty submit shows four inline errors with `aria-invalid`; a filled submit stores a ticket with the phone normalised and the order number upper-cased.
- Newsletter form stores a subscriber with `source=home`.
- `/cart` shows the empty state, `/account/wishlist` redirects to login when signed out, unknown routes show the Owlyn 404.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (20 tests) and `pnpm build` pass.

### Decisions worth knowing

- **Markdown, not MDX, for CMS bodies.** MDX would let an admin-authored page execute JSX. GitHub-flavoured Markdown through rehype-sanitize covers headings, lists, tables and links and cannot run code. Added `react-markdown` and `remark-gfm` alongside the spec's `rehype-sanitize` for this.
- **Mega menu panel is `position: fixed`** under the header. Radix wraps the menu list in a relatively positioned element, which would otherwise clip the panel to the width of the nav.
- **Header overlay detection** uses an IntersectionObserver on the `[data-hero]` element with a negative top margin equal to the header height, so any page with a hero gets the transparent treatment without props.
- **Product and collection links** point at `/products/[slug]` and `/collections/[slug]`, which Phase 3 builds. Until then they 404 and Next logs prefetch misses in the console.

## Phase 1: Data & auth (done)

- 49-table Prisma schema, single init migration with a trigger-maintained search vector, GIN and trigram indexes, and an order-number sequence. Zero drift.
- Idempotent seed: 32 categories, 3 collections, 40 products with 454 variants and generated placeholders, 3 users, 7 coupons, 3 zones, 32 pincodes, 9 pages, 5 banners, 64 menu items, 19 settings.
- Auth.js v5 with JWT sessions, argon2id credentials, optional Google, periodic role re-check, server-side guards, middleware for `/account` and `/admin`, login and register pages, account page, admin shell.
- Decisions: trigger over generated column (Prisma diff), `@auth/core` as a direct dependency for JWT type augmentation, Google account linking on, GST per the September 2025 schedule, Prisma reset needs a human.

## Phase 0: Foundation (done)

- Next.js 15.5, React 19, TypeScript strict, Tailwind v4 tokens, shadcn on Radix restyled, Archivo and Inter Tight, ESLint 9, Prettier, Vitest, Docker Compose for Postgres on port 5436.
- Tagline picked: "For the hours nobody sees."

## Phase 3: Catalog (next)

- `/collections/[slug]` PLP shared by categories, collections and the virtual slugs the menu already links to (`new`, `bestsellers`, `footwear`, `clothing`, `caps`, `accessories`, `men`, `women`), with URL-driven filters, sort and pagination.
- `/products/[slug]` PDP with gallery, colour and size selection, size guide, back-in-stock, delivery estimate, related rails, JSON-LD.
- Search page grows filters and trending queries from real search logs.
- `sitemap.xml`, `robots.txt`, breadcrumbs.

## Known gaps

- Product and collection routes 404 until Phase 3.
- No hero video asset yet; the slot renders the poster image.
- Newsletter double opt-in email and the contact acknowledgement email wait for Phase 8.
- Password reset, email verification and rate limiting are unchanged from Phase 1's gaps.
- The demo database now holds one support ticket and one newsletter subscriber from the Phase 2 browser checks.
