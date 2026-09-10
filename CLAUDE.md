# OWLYN — Master Build Prompt (for Claude Code)

> **How to use this file**
> 1. `mkdir owlyn && cd owlyn && git init`
> 2. Save this file as `CLAUDE.md` in the project root. Claude Code reads it automatically on every session.
> 3. Start Claude Code and say: *"Read CLAUDE.md. Confirm the plan, then build Phase 0 and Phase 1 only. Stop and show me before Phase 2."*
> 4. After each phase: review, run it, commit, then say *"Proceed to Phase N."*
> Do **not** ask for the whole thing in one shot — it will half-build 200 files. Phase by phase is the whole trick.

---

## 1. Role and objective

You are the lead full-stack engineer building **Owlyn**, a production-grade direct-to-consumer e-commerce store for India (INR, GST, Indian address format, Razorpay + COD).

Owlyn sells **performance and lifestyle apparel, footwear and accessories** — sneakers, running shoes, training shoes, t-shirts, polos, jackets, sweatshirts, joggers, shorts, caps, socks, bags.

The reference for **layout and feature depth** is a modern athletic D2C brand site (full-bleed video hero, mega menu, editorial collection blocks, cart drawer, wishlist). Build an equivalent structure, but **all copy, colours, type, imagery and component design must be original Owlyn work**. Never copy text, logos or images from any real brand. Use placeholder/generated imagery and write your own copy.

Deliver a working store **plus a full admin dashboard**, not a mockup. Every button must do something real against the database.

---

## 2. Tech stack (fixed — do not substitute without asking)

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, React 19, Server Components, Server Actions) |
| Language | TypeScript, `strict: true` |
| Styling | Tailwind CSS v4 + CSS variables for design tokens |
| UI primitives | shadcn/ui (Radix) — restyled to Owlyn tokens, not default look |
| DB | PostgreSQL |
| ORM | Prisma (migrations, not `db push`, after Phase 1) |
| Auth | Auth.js (NextAuth v5): email+password (bcrypt/argon2), Google OAuth, plus OTP-ready phone field |
| Payments | Razorpay (Orders API + webhook signature verification) and Cash on Delivery |
| File storage | UploadThing or S3-compatible (Cloudflare R2). Abstract behind `lib/storage.ts` |
| Email | Resend + React Email templates |
| Validation | Zod on every input, shared between client and server |
| State | Server state via RSC; cart/wishlist via React context + server persistence |
| Search | Postgres full-text + trigram (`pg_trgm`) — no external search service in v1 |
| Cache/rate limit | Upstash Redis (optional; fall back to in-memory in dev) |
| Testing | Vitest (unit), Playwright (e2e for cart → checkout → order) |
| Deploy target | Vercel + Neon/Supabase Postgres |

Package manager: `pnpm`. Node 20+.

**Rule:** before adding any dependency not listed above, ask me first and give the reason in one line.

---

## 3. Brand and design direction

Do not produce a generic AI-looking template. Follow these tokens exactly, then make deliberate choices within them.

### Identity
- Name: **Owlyn**. Wordmark set in the display face, lowercase, tight tracking.
- Concept: the owl — night training, precision, quiet focus. Tagline direction: *"Built for the hours nobody sees."* (write 3 alternatives and pick one).
- Voice: plain, confident, short sentences. No hype adjectives, no exclamation marks. CTA is literal: "Add to bag", "Pay ₹4,499", "Track order".

### Colour tokens (`app/globals.css` as CSS vars)
```
--paper:  #F7F6F3   /* off-white base, very slightly warm, NOT #F4F1EA */
--ink:    #17191C   /* body text, headings                            */
--slate:  #E8E6E1   /* raised surfaces, borders, section bands        */
--talon:  #8A6A2F   /* brass accent, darkened for AA on paper         */
--dusk:   #3B3566   /* secondary accent                               */
--fog:    #6B7076   /* muted text — must hit 4.5:1 on paper           */
--alert:  #A3341F
```
Light storefront (paper base, ink text). Text over photography and on ink surfaces uses a light working tint (`--moon`) defined in `globals.css`, not a brand token. The admin dashboard shares the paper base and is told apart by its dark ink sidebar and a persistent "Admin" label (see §6).

### Type
- Display / headings: **Archivo** (use Expanded + weights 600–800), tight leading, sentence case.
- Body / UI: **Inter Tight**, 400/500.
- Numerals (price, order IDs, dashboard tables): tabular figures.
- Type scale: 12 / 14 / 16 / 20 / 28 / 40 / 64 / 96. Body line length under 72ch.

### Layout principles
- Hero: full-bleed muted autoplay video (or image fallback), headline bottom-left, one CTA. `prefers-reduced-motion` shows the poster image.
- Product grid: 2 columns mobile, 4 desktop, 3:4 image ratio, hover swaps to second image on desktop only.
- Whitespace over dividers. Border radius: 2px on inputs/buttons, 0 on images. Do not round everything.
- Motion only on user action (drawer open, add-to-bag confirm, filter apply). No section-by-section fade-ins on scroll.

### Explicitly avoid
Cream `#F4F1EA` backgrounds with terracotta accents; identical rounded cards with soft grey shadows; all-caps tracked-out eyebrow labels above every heading; "→" appended to link text; gradient washes as decoration.

---

## 4. Data model

Generate `prisma/schema.prisma` with at least these models. Use `cuid()` ids, `createdAt`/`updatedAt` on everything, soft delete (`deletedAt`) on Product and Category.

**Catalog**
- `Product` — name, slug (unique), description (rich text/MDX), shortDescription, brandLine (e.g. "Seam", "Boom"), gender enum (MEN|WOMEN|UNISEX|KIDS), status enum (DRAFT|ACTIVE|ARCHIVED), basePrice, compareAtPrice, taxRate, hsnCode, isFeatured, badges (NEW|BESTSELLER|SOLD_OUT|LIMITED), metaTitle, metaDescription
- `ProductVariant` — productId, sku (unique), size, colorName, colorHex, price override, compareAtPrice, stock, lowStockThreshold, weightGrams, barcode, position
- `ProductImage` — productId, variantId (nullable), url, alt, position, isPrimary
- `Category` — name, slug, parentId (self-relation, 3 levels: Men → Footwear → Sneakers), image, description, position
- `Collection` — curated sets ("Night Run", "Court Edit"), many-to-many with Product, heroImage, isActive, startsAt/endsAt
- `Attribute` / `AttributeValue` — for filters (material, fit, activity, drop, cushioning)
- `Review` — userId, productId, orderId (verified purchase), rating 1–5, title, body, images[], status (PENDING|APPROVED|REJECTED), helpfulCount
- `SizeChart` — per category, JSON of rows

**Customer**
- `User` — name, email (unique), phone, passwordHash, emailVerified, role enum (CUSTOMER|STAFF|ADMIN), isBanned
- `Address` — userId, fullName, phone, line1, line2, landmark, city, state, pincode, country, type (HOME|WORK), isDefault
- `Cart` / `CartItem` — supports guest carts via cookie `cartToken`, merged into the user cart on login
- `WishlistItem` — userId, productId, variantId
- `RecentlyViewed` — userId or cookie token, productId, viewedAt

**Commerce**
- `Order` — orderNumber (human readable `OWL-2026-000123`), userId (nullable for guest), email, phone, status enum (PENDING|CONFIRMED|PACKED|SHIPPED|OUT_FOR_DELIVERY|DELIVERED|CANCELLED|RETURN_REQUESTED|RETURNED|REFUNDED), paymentStatus (PENDING|PAID|FAILED|REFUNDED|PARTIALLY_REFUNDED), subtotal, discountTotal, shippingTotal, taxTotal, grandTotal, currency, couponCode, shippingAddress (JSON snapshot), billingAddress (JSON snapshot), notes
- `OrderItem` — snapshot of name, sku, size, color, image, unitPrice, qty, taxRate, lineTotal (never join to live product for historical accuracy)
- `Payment` — orderId, provider, providerOrderId, providerPaymentId, signature, method, amount, status, rawPayload
- `Refund` — orderId, amount, reason, status, providerRefundId
- `Shipment` — orderId, courier, awb, trackingUrl, shippedAt, deliveredAt
- `ReturnRequest` — orderId, items[], reason, type (RETURN|EXCHANGE), status, pickupAddress, refundId
- `Coupon` — code, type (PERCENT|FLAT|FREE_SHIPPING|BXGY), value, minOrderValue, maxDiscount, usageLimit, perUserLimit, usedCount, startsAt, endsAt, appliesTo (ALL|CATEGORY|PRODUCT|COLLECTION), isActive
- `CouponRedemption` — couponId, userId, orderId
- `ShippingZone` / `ShippingRate` — pincode prefix ranges, flat/weight-based rate, free-shipping threshold, ETA days
- `InventoryLog` — variantId, delta, reason (SALE|RESTOCK|RETURN|MANUAL|CANCEL), refId, actorId

**Content & ops**
- `Page` — CMS pages: about, contact, FAQs, privacy, terms, returns policy, warranty, cookies (slug, title, body MDX, isPublished)
- `Banner` — homepage/hero slots, image, videoUrl, headline, subhead, ctaLabel, ctaUrl, position, isActive, schedule
- `NewsletterSubscriber` — email, source, isConfirmed, unsubscribedAt
- `SupportTicket` — from contact form: name, email, orderNumber, subject, message, status
- `AuditLog` — actorId, action, entity, entityId, before/after JSON, ip
- `Setting` — key/value JSON for store config (store name, GSTIN, support email, COD limit, free-shipping threshold, maintenance mode)

Add indexes on: slug fields, `Order.orderNumber`, `Order.userId`, `ProductVariant.sku`, `Product.status + isFeatured`, and a GIN index for product full-text search.

---

## 5. Storefront — routes and features

```
/                              home
/collections/[slug]            category & collection listing (shared PLP)
/products/[slug]               product detail
/search?q=                     search results
/cart                          full cart page (drawer is primary)
/checkout                      address → shipping → payment
/checkout/success/[orderId]    thank you + order summary
/account                       dashboard
/account/orders                order history
/account/orders/[id]           order detail + timeline + invoice download
/account/addresses             address book CRUD
/account/wishlist
/account/profile               name, phone, password change
/account/returns               raise + track returns/exchanges
/track                         guest order tracking (order no + email/phone)
/pages/[slug]                  CMS pages
/login /register /forgot-password /reset-password /verify-email
/sitemap.xml /robots.txt /feed  (Google Merchant product feed)
```

### Home
Hero video/banner slots driven by `Banner`; featured product rail; shop-by-category tiles (Footwear / Clothing / Caps / Accessories); a curated collection block; "New this week" rail; editorial split section for Men / Women; newsletter block; trust strip (7-day returns, free shipping over ₹1,999, secure payments, COD available).

### Navigation
Sticky header, transparent over hero then solid on scroll. Desktop mega menu: **Featured / Women / Men** with three columns (By Collection, By Product, By Activity) plus two image tiles per panel. Mobile: full-screen drawer with back-stack navigation. Header holds: search (overlay with trending searches + recent searches from localStorage), account, wishlist count, bag count.

### PLP (`/collections/[slug]`)
Server-rendered, URL-driven filters (`?size=9&color=black&price=2000-6000&sort=price_asc&page=2`) so filtered pages are shareable and indexable. Filters: category, size, colour swatches, price range, gender, activity, brand line, discount %, in-stock only. Sort: featured, newest, price asc/desc, best selling. Infinite scroll with a "Load more" fallback and correct pagination links for SEO. Show result count and active-filter chips.

### PDP (`/products/[slug]`)
Image gallery with thumbnails, zoom on hover, mobile swipe, video support. Colour variants shown as swatches that switch images and update the URL. Size selector with a size guide modal and "Notify me" when a size is out of stock (creates a `BackInStockRequest`). Price with strike-through MRP and discount %. Delivery-date estimator by pincode. Add to bag → opens cart drawer with a confirmation. Wishlist toggle. Accordions: description, materials & care, shipping & returns. Reviews with rating histogram, photo reviews, verified-purchase badge, sorting. "Complete the look" and "You may also like" rails. Sticky add-to-bag bar on mobile. JSON-LD `Product` schema with price, availability, aggregateRating.

### Cart & checkout
Cart drawer: line items with size/colour/image, qty stepper, remove, move to wishlist, live subtotal, coupon input, free-shipping progress bar, upsell rail. Server-side re-validation of price and stock on every mutation — never trust client prices.

Checkout in three steps on one page:
1. Contact + shipping address (saved addresses, pincode auto-fills city/state, phone validation for India)
2. Shipping method from `ShippingRate`, with ETA
3. Payment: Razorpay (UPI/cards/netbanking/wallets) or COD (only if grand total ≤ COD limit and pincode is serviceable)

Order is created as PENDING → Razorpay order created → on success verify `razorpay_signature` **server-side**, then mark PAID and decrement stock **inside a transaction**. Handle the webhook as the source of truth (idempotent by `providerPaymentId`) so closed browsers still complete. Release reserved stock on failure/timeout via a cleanup job.

### Post-purchase
Order confirmation email + order timeline UI (Confirmed → Packed → Shipped → Out for delivery → Delivered). Downloadable GST invoice PDF. Cancel before shipping. Return/exchange request within the policy window with reason codes. Guest tracking page.

---

## 6. Admin dashboard (`/admin`, role STAFF or ADMIN)

Separate layout: the same `--paper` base as the storefront, a dark `--ink` left sidebar (moon text) and a persistent "Admin" label in the top bar so the two are never confused; command palette (⌘K), data tables with server-side pagination, sorting, column filters, bulk actions and CSV export.

**Overview** — revenue today/7d/30d with sparkline, orders count, AOV, conversion, top products, low-stock alerts, recent orders, revenue chart with date-range picker, traffic-to-order funnel.

**Orders** — filterable list (status, payment status, date, amount, coupon); detail view with items, customer, addresses, payment info, timeline; actions: change status, add tracking (courier + AWB), issue full/partial refund via Razorpay, cancel + restock, add internal note, resend confirmation email, print packing slip and invoice; bulk status update and bulk label export.

**Products** — list with thumbnail, stock, status, price; create/edit form with variant matrix generator (size × colour → SKUs with individual price/stock), drag-and-drop image upload with reordering and alt text, category/collection assignment, SEO fields, live storefront preview; duplicate product; bulk price/stock edit; CSV import/export with a dry-run validation report.

**Inventory** — stock by variant, quick adjust with reason, low-stock and out-of-stock views, inventory movement log, back-in-stock request list with a "notify all" action.

**Categories & collections** — tree editor with drag reorder, images, SEO.

**Customers** — list with lifetime value, order count, last order; detail with orders, addresses, cart contents, wishlist; actions: impersonate (audit-logged), ban, send password reset, add tags/notes; export segment CSV.

**Coupons** — full CRUD with all rule types, usage report, per-coupon revenue.

**Reviews** — moderation queue, approve/reject with reason, reply as brand.

**Content** — banners/hero slots with scheduling and live preview; CMS pages with an MDX editor; navigation menu builder; homepage section ordering.

**Marketing** — newsletter subscriber list and export, abandoned-cart list with a recovery email trigger.

**Shipping** — zones, rates, pincode serviceability upload (CSV), free-shipping threshold, COD limit.

**Reports** — sales by day/category/product, tax (GST) summary by month, coupon performance, refund report, all CSV-exportable.

**Settings** — store profile, GSTIN, support contacts, payment keys status (never render secrets), policy windows, maintenance mode, staff users and roles.

**Audit log** — every admin mutation recorded with actor, entity, diff and IP.

---

## 7. Cross-cutting requirements

**Security**
- Zod-validate every server action and route handler input.
- Authorization checked server-side on every admin action; middleware alone is not enough.
- Rate limit: login, register, forgot-password, OTP, coupon apply, checkout, contact form, review submit.
- CSRF-safe mutations, httpOnly + secure + sameSite cookies, hashed passwords (argon2id), no secrets in client bundles.
- Sanitize all rich text before render (DOMPurify / rehype-sanitize).
- Signed URLs for uploads; validate MIME and size.
- Verify Razorpay webhook signatures; make webhook handling idempotent.
- Security headers via `next.config` (CSP, HSTS, X-Frame-Options, Referrer-Policy).

**Performance**
- `next/image` everywhere with correct `sizes` and AVIF/WebP; blur placeholders.
- ISR/tag-based revalidation for PLP and PDP; `revalidateTag` on admin publish.
- Lighthouse mobile target: Performance ≥ 90, LCP < 2.5s, CLS < 0.1.
- Streaming + Suspense skeletons; no client-side data fetching waterfalls.
- Route-level code splitting; keep the client bundle lean.

**SEO**
- Per-page metadata, canonical URLs, OG images (dynamic via `opengraph-image.tsx`).
- JSON-LD: Organization, WebSite+SearchAction, BreadcrumbList, Product, AggregateRating, FAQPage.
- `sitemap.xml` generated from DB, `robots.txt`, and a Google Merchant Center product feed.

**Accessibility**
- Semantic HTML, keyboard-operable menus/drawers/modals with focus trap and restore, visible focus rings, aria-live for cart and filter updates, colour contrast ≥ 4.5:1, `prefers-reduced-motion` respected. Target WCAG 2.1 AA.

**Analytics**
- Thin `lib/analytics.ts` wrapper emitting standard e-commerce events (view_item, add_to_cart, begin_checkout, purchase) so GA4/Meta Pixel can be plugged in later without touching components.

**Emails (React Email)**
- Welcome, verify email, password reset, order confirmation, order shipped, out for delivery, delivered, order cancelled, refund processed, return approved, back-in-stock, abandoned cart, newsletter confirm.

---

## 8. Build phases

Do exactly one phase, then stop, summarise what changed, list files touched, and wait for my go-ahead.

**Phase 0 — Foundation.** Next.js + TS + Tailwind v4 + shadcn init. Design tokens in `globals.css`, fonts, `README.md`, `.env.example`, ESLint/Prettier, folder structure, Docker Compose for Postgres, git commit.

**Phase 1 — Data & auth.** Full Prisma schema, migration, seed script (8 categories, 3 collections, 40 products with realistic variants/prices in INR, 3 users incl. an admin, coupons, shipping zones, CMS pages). Auth.js with credentials + Google, role guard, protected route middleware.

**Phase 2 — Storefront shell.** Layout, header with mega menu, mobile drawer, footer, home page with all sections wired to seed data, CMS pages. Design review against §3 before writing components: write the token plan first, check nothing reads as a generic default, then build.

**Phase 3 — Catalog.** PLP with URL-driven filters/sort/pagination, PDP with gallery, variants, size guide, related rails, search with trigram + trending queries, breadcrumbs, JSON-LD.

**Phase 4 — Cart & wishlist.** Guest + user carts, drawer, merge on login, coupon application with full rule evaluation, wishlist, recently viewed.

**Phase 5 — Checkout & payments.** Address flow, pincode serviceability, shipping rates, Razorpay integration + webhook + COD, stock decrement in a transaction, order confirmation, transactional emails, invoice PDF.

**Phase 6 — Account area.** Orders, order detail + timeline, tracking, cancellations, returns/exchanges, addresses, profile, wishlist.

**Phase 7 — Admin dashboard.** Everything in §6, built in this order: overview → orders → products/variants/images → inventory → customers → coupons → categories/collections → reviews → content/banners → shipping → reports → settings → audit log.

**Phase 8 — Reviews, notifications, marketing.** Review submission and moderation, back-in-stock, abandoned-cart job, newsletter.

**Phase 9 — Hardening.** Rate limiting, security headers, error boundaries and 404/500 pages, empty and loading states everywhere, Vitest unit tests for pricing/coupon/tax logic, Playwright e2e for browse → cart → checkout → order → admin fulfil, Lighthouse and a11y pass, seed reset script, deployment guide.

Definition of done for a phase: it compiles, `pnpm lint` and `pnpm typecheck` pass, the feature works end-to-end against the seeded DB, and no `TODO` stubs are left in the paths you touched.

---

## 9. Working rules for you (Claude Code)

1. Start by restating the plan for the current phase in ≤10 bullets and listing the files you will create. Wait for my "go" only on Phase 0; after that proceed within the phase without asking for permission per file.
2. Never leave placeholder logic (`// TODO: implement`) in a shipped phase. If something can't be done, say so explicitly in the summary.
3. Business logic (pricing, discounts, tax, shipping, stock) lives in `lib/` as pure, testable functions — never inline in components.
4. All money is stored in **paise as integers**. Format for display with `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`. No floats for money, ever.
5. Server Actions for mutations; route handlers only for webhooks and public APIs.
6. Every list view needs empty, loading and error states. Every form needs inline validation, a disabled/pending state and a success confirmation.
7. Write the copy yourself, in Owlyn's voice. No lorem ipsum anywhere.
8. Keep components under ~200 lines; extract instead of nesting deeply.
9. After each phase, update `README.md` (setup steps) and `PROGRESS.md` (what's done, what's next, known gaps).
10. Commit per logical unit with conventional-commit messages.
11. If a requirement here conflicts with a security or correctness concern, flag it and propose the fix rather than silently doing something else.

---

## 10. Environment variables (`.env.example`)

```
DATABASE_URL=
AUTH_SECRET=
AUTH_URL=http://localhost:3000
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RESEND_API_KEY=
EMAIL_FROM="Owlyn <orders@owlyn.example>"
UPLOADTHING_TOKEN=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ADMIN_SEED_EMAIL=
ADMIN_SEED_PASSWORD=
```

---

## 11. Legal / content rules

- Do not copy any existing brand's images, product photos, logos, marketing copy or fonts. Reference sites are for **structure and feature parity only**.
- Product names, descriptions and marketing copy must be original Owlyn writing.
- Use placeholder imagery from a permissively licensed source or generated gradients/solid-colour blocks with the product name, and record where every asset came from in `ASSETS.md`.
- Policy pages (returns, privacy, terms, warranty) should be written as clearly-marked drafts with a `<!-- REVIEW WITH A LAWYER -->` note at the top — they are not legal advice.

---

**First message to send Claude Code after saving this file:**

> Read CLAUDE.md fully. Summarise the Phase 0 plan and the exact file list, then build Phase 0 and Phase 1. Stop after Phase 1 and show me the schema and seed output.
