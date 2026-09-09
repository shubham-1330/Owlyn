# Progress

## Phase 3: Catalog (done)

### Pre-work

- `BackInStockRequest` already existed from Phase 1 with `variantId`, `email`, `userId?`, `status`, `notifiedAt`, timestamps and a unique on `(email, variantId)`, so no new model was needed. The Phase 3 migration (`catalog_indexes_and_media`) adds indexes on `Product(status, salesCount)`, `Product(status, basePrice)`, `ProductVariant(size)`, `ProductVariant(colorName)`, plus `ProductImage.kind` (IMAGE | VIDEO) and `posterUrl` for gallery video.
- `lib/search-params.ts` is the single parser for listing URLs: category, size, colour, price range, gender, activity, brand line, discount, in-stock, sort and page. It accepts repeated and comma-joined values, drops invalid values without failing the page, folds the price form's two inputs into one `price` param, serialises to a canonical sorted query string, and decides indexability. The PLP and the search page both use it; there is no second parser.

### One query per listing

`lib/catalog/query.ts` builds one SQL statement per page load. A `base` CTE scopes products (category subtree, collection, virtual listing or full-text search) and joins variant aggregates laterally. `matched` applies every filter. `page` orders and limits. `items` returns the page as JSON with each product's first two images pulled in a correlated subquery. Nine facet CTEs count with every _other_ filter applied, so the number beside a size stays true after a colour is ticked. The whole thing comes back as one row. There is no per-product follow-up query.

Worst case measured with `pnpm exec tsx scripts/explain-catalog.ts` (men's subtree, three categories, four sizes, three colours, a price band, gender, two activities, three brand lines, a discount floor, in-stock only, sorted by price):

| Measure                                 | Value       |
| --------------------------------------- | ----------- |
| Round trip from Node (single statement) | 44 to 53 ms |
| Postgres execution time                 | 6.3 ms      |
| Postgres planning time                  | 23.4 ms     |
| Shared buffers hit                      | 594         |
| Plan length                             | 775 lines   |

Scans in the plan: index scans on `ProductVariant_productId_colorName_idx`, `_ProductAttributeValues_B_index`, `AttributeValue_pkey`, `Attribute_slug_key`, `ProductImage_productId_position_idx` and `Category_parentId_position_idx`; sequential scans only on `Product` (40 rows), `Category` (32 rows) and `_ProductCategories` (58 rows), which the planner rightly prefers at this size. The full plan is reproducible with the script. Planning outweighs execution because the statement is wide; at scale the wins are prepared-statement plan caching (Prisma reuses prepared statements per connection) and, if listings grow past tens of thousands of products, denormalising the minimum variant price onto `Product`.

### PLP at `/collections/[slug]`

- Slug resolution (`lib/catalog/scope.ts`): real categories with their subtree, live collections, the virtual listings `new`, `bestsellers`, `sale`, `all`, and cross-gender types like `footwear` or `sneakers` that union the men's and women's categories. All of the menu's links now resolve.
- Every filter is a real link, so state lives in the URL, works without JavaScript and is keyboard reachable. Active-filter chips, result count with a live region, colour swatches with hex, a price form whose hidden inputs keep the rest of the state, sort as a select, and an in-stock toggle.
- "Load more" is a real `?page=n` link enhanced to fetch in place through a server action, append, and move the URL with `replaceState`. The first two extra pages load as the sentinel scrolls into view; after that it takes a click. Crawlers also get prev/next links.
- SEO: canonical always points at the bare listing. Bare and single-facet pages are `index,follow`; multi-facet, price, discount, sorted and search pages are `noindex,follow`. Filter links that would land on a noindex combination carry `rel="nofollow"`.
- Sizes order naturally (UK numerically, then XS to XXL, paired sizes, one size); colours group by name so two products with slightly different hex values for "Ink" produce one option; category options order by department then leaf.

### PDP at `/products/[slug]`

- Gallery: a single scroll-snap strip that swipes on touch and takes thumbnails, arrows and hover-to-zoom on a fine pointer. Every slide is a fixed 3:4 box, the first image is `priority` with a preload link, `sizes` is set for the two-column layout, and each image has a blur placeholder from its seeded `blurData`. Video media renders as `<video>` with its poster. Measured layout shift on load: 0.
- Colour swatches switch the media set and mirror the choice into `?color=` with `replaceState`; the page reads the same param on the server so a shared URL opens on that colour.
- Size selector with low-stock notes; sold-out sizes show a "Notify me" form that writes a `BackInStockRequest`, rate limited per email (3 an hour) and per IP (20 an hour) with an in-memory sliding window, or Upstash when its env vars are set.
- Size guide dialog from the category's `SizeChart`. Pincode delivery estimate from the pincode directory, shipping zones and the dispatch cut-off, with COD availability.
- Accordions for description, materials and care, shipping and returns. Reviews from seed with average, histogram, verified badges, brand replies and client-side sorting.
- Mobile sticky bar appears once the purchase panel scrolls away. **Its "Add to bag" button is inert until Phase 4**, as is the main one; both say so on the page.
- JSON-LD `Product` with `AggregateOffer`, availability and `AggregateRating`, plus `BreadcrumbList` from the breadcrumbs component.
- "Complete the look" from `ProductRelation` and "You may also like" from the primary category.

### Also in this phase

- Seed: 72 approved reviews from eight fictional customers across 39 products, review counters recomputed, blur placeholders on all 170 images.
- `app/sitemap.ts` (89 URLs) and `app/robots.ts`.
- Cache tags on every new query: `products`, `categories`, `collections`, `reviews`, `shipping`, and `product:<slug>` for the detail page, so Phase 7 can invalidate exactly what changed.
- Unknown listing and product slugs return a real 404 status: the existence check runs in `generateMetadata`, before the route's loading boundary starts streaming.

### Verified in a real browser against the production build

- Filter, filter again, back, back: each step restored the previous URL, chips, selected states and count exactly.
- The two-filter URL fetched with a cookie-less client rendered the same count, chips, selections and four products.
- Tab from the sort control moves straight into the filter links with a visible outline; all 65 sidebar controls are focusable and named.
- On the product page: CLS 0 on load; Ink swatch changed both slides, both thumbnails, the legend and the URL; size guide opened with the men's footwear table and closed on Escape; UK 8 on the sold-out Terrace showed the notify form and stored a pending request; pincode 560034 returned Bengaluru metro rates with COD.
- At phone width: the strip swipes with snapping, thumbnails hide, the sticky bar appears after scrolling with the current selection, and nothing overflows horizontally.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (35 tests) and `pnpm build` pass.

### Decisions worth knowing

- **Facet counts exclude their own dimension.** Standard faceted-search behaviour: within a dimension options are OR, across dimensions AND, and counts show what ticking the option would yield.
- **Gender filter is inclusive of unisex.** "Men" matches MEN and UNISEX products, which is what a shopper means.
- **Load more updates the URL.** A refresh after loading page 3 shows page 3, which is what the URL says; the trade-off is that items from earlier pages are not repeated on refresh.
- **Search results are not cached**; listing pages are, keyed by scope and params, five minutes, tagged.
- **Upstash packages added** (`@upstash/ratelimit`, `@upstash/redis`, both on the approved list). Without env vars the in-memory limiter is used.

## Phase 2: Storefront shell (done)

Header with mega menu, mobile drawer and search overlay; home page sections from `HomepageSection` and `Banner`; footer; Markdown CMS pages with a contact form; bag and wishlist read-only pages; tagged query cache. See git history for the full notes.

## Phase 1: Data & auth (done)

49-table schema, single init migration with a trigger-maintained search vector, idempotent seed, Auth.js v5 with credentials and Google, guards and middleware.

## Phase 0: Foundation (done)

Next.js 15.5, React 19, Tailwind v4 tokens, shadcn on Radix restyled, Archivo and Inter Tight, tooling, Postgres on port 5436. Tagline: "For the hours nobody sees."

## Phase 4: Cart & wishlist (next)

- Guest and user carts, cart drawer, merge on login, server-side revalidation of price and stock on every mutation, coupon evaluation, wishlist toggle, recently viewed.
- The PDP's "Add to bag" buttons become live.

## Known gaps

- "Add to bag" on the product page and its mobile sticky bar are inert until Phase 4.
- Review submission and helpful votes wait for Phase 8; reviews are read-only from seed.
- Back-in-stock notifications are stored but not sent until the email layer lands (Phase 5 introduces Resend, Phase 8 wires the job).
- No hero video or product video assets yet; both code paths exist.
- `/track` in the mobile drawer and footer is a Phase 6 route.
- The demo database holds one support ticket, one newsletter subscriber and one back-in-stock request from the browser checks.
