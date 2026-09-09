# Progress

## Phase 4: Cart & wishlist (done)

### Pricing engine first

`lib/pricing/` is pure: no clock, no database, no settings lookups; everything is passed in and all money is integer paise.

- `lineTotal`, `cartSubtotal`, `evaluateCoupon`, `shippingEstimate`, `taxBreakdown`, `grandTotal`, and `priceCart` which runs the whole cart and **throws if line nets do not sum to subtotal minus discount**.
- Coupons cover PERCENT, FLAT, FREE_SHIPPING and BXGY with minOrderValue, maxDiscount, usageLimit, perUserLimit, date window, first-order-only and appliesTo ALL / CATEGORY / PRODUCT / COLLECTION. Every rejection has a specific, showable message ("Add ₹1,500 more to use FLAT300.", "LAUNCH25 expired on 11 Aug 2026.").
- **23 pricing tests** in `lib/pricing/pricing.test.ts` (58 across the suite): percent rounding on odd amounts, maxDiscount cap, partially eligible carts, expired, not started, exhausted, per-user and first-order gates, FLAT larger than the eligible subtotal, BXGY with the cheaper unit free across lines and with ineligible lines, an incomplete BXGY set, free-shipping stacking with a flat discount, GST back-out by rate, and the sum-of-lines invariant.

Rounding calls made, all in one place so they can be changed:

| Case                                   | Rule chosen                                                                                                                                                                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Percent discount                       | Half-up at the line level (`roundHalfUp`), then summed. 12.5% of ₹1,299 is 16,237.5 paise and rounds to 16,238.                                                                                                                   |
| A binding maxDiscount or a FLAT amount | Spread across eligible lines proportionally with the largest-remainder method, so line discounts sum to the cap exactly and never exceed a line. The leftover paise go to the largest fractional parts, ties to the earlier line. |
| BXGY                                   | For every (buy + get) eligible units, the `get` cheapest units in the whole cart are free, even when they sit on a different line from the "buy" units.                                                                           |
| minOrderValue                          | Checked against the whole cart subtotal before any discount.                                                                                                                                                                      |
| Free-shipping threshold                | Evaluated on the discounted merchandise total, so a flat discount can pull a cart back under the threshold. A FREE_SHIPPING coupon always wins.                                                                                   |
| Empty cart                             | No shipping charged; this was a real bug the test caught.                                                                                                                                                                         |
| GST                                    | Backed out of each line's discounted net, half-up per line, then summed. ₹799 at 5% and ₹5,499 at 18% give ₹876.88.                                                                                                               |

### Cart

- Guest carts key off an httpOnly, SameSite=Lax `cartToken` cookie set only by server actions; user carts sit on `Cart.userId`. `CartItem.priceAtAdd` (new column) records the unit price at add time.
- `lib/cart/load.ts` builds the JSON-safe read model once per cart: live price and stock per line, per-line max from the new `cart.maxQtyPerLine` setting, price-change and stock notices, coupon re-evaluation with the engine, the default zone's standard rate as the shipping estimate, and an upsell rail from `ProductRelation`. It is cached per cart and tagged `cart:<id>`, `products`, `settings`, `shipping`, so any mutation, product edit or setting change invalidates it.
- `lib/cart/service.ts`: every mutation resolves the cart from the session or cookie, re-reads the variant's price and stock, clamps quantity to min(stock, per-line max), ignores anything the client says about prices, then revalidates the tag and returns the fresh cart. A changed price keeps the line and surfaces "Price updated" until the shopper changes the quantity, which acknowledges the live price.
- **Merge on login** (`mergeGuestCartIntoUser`): one Serializable transaction, retried on conflict. Same variant keeps the larger quantity, not the sum; the guest coupon fills an empty slot; the guest cart is deleted. A second sign-in callback finds no guest cart and does nothing. It runs from the Auth.js `signIn` event and again lazily if a signed-in request still carries a guest token.
- **Client**: `CartProvider` holds server truth and a `useOptimistic` view. Quantity and remove apply instantly; a failed action reverts the view and posts an error in a live region. Adds open the drawer with the server's result. A tab that becomes visible refreshes from the server.
- **Drawer and page share components**: `CartLines`, `CartSummary`, `CouponForm`, `FreeShippingBar`, `UpsellRail`, `CartNotices`. Subtotal, count and the shipping bar are `aria-live`.
- The header's bag count reads `cart.view.itemCount` from the same provider the drawer renders from. The old separate count query is deleted.

### Wishlist and recently viewed

- Signed-in wishlists live in `WishlistItem` and are cached per user under `wishlist:<userId>`; guests keep `owlyn:wishlist` in localStorage. `WishlistProvider` merges the browser list into the account on the first signed-in render and clears it. The heart on every card and on the PDP, the header count and the wishlist pages all read the provider.
- Wishlist page: move to bag for a saved variant, a size picker when only the product was saved, notify-me on sold-out variants, remove. Guests get the same page at `/wishlist`.
- Recently viewed: the PDP records a view through a server action keyed by the user or a `visitorToken` cookie, deduplicated, capped at 12. Rails on the PDP and the bag page.

### Cleanup

- PDP "Add to bag", the mobile sticky bar and a new quick-add on every product card call the same `AddToBagButton` / `QuickAdd`, which call the real action. The Phase 3 inert placeholders are gone.
- **Checkout** is the one inert control left: the drawer and bag page show a disabled "Checkout" with a note, until Phase 5.

### Verified in a real browser against the production build

- Sock added from the PDP with Ink and S/M: drawer opened with the Ink image, "Ink · S/M", quantity 1, the shipping bar at 40% asking for ₹1,200 more, the header at 1 item.
- FLAT300 on that ₹799 bag: "Add ₹1,700 more to use FLAT300."
- Hush Court 1 in Ink, UK 8 added: two lines, "Free shipping unlocked", shipping "Free", GST ₹876.88. Added again: quantity 2, still two lines, three items; the database agrees.
- Signed in as Asha, whose account cart already held a Seam Core Tee: the bag showed three lines, the guest cart was deleted, the header read four items.
- Two tabs on the bag: removing the sock in one updated it instantly; a refresh of the other showed two lines.
- "Move to wishlist" from the bag put the tee on the account wishlist with a working "Move to bag".
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (58) and `pnpm build` pass.

### Decisions worth knowing

- **Cached payload shapes are versioned.** Adding `variants` to product cards broke a client component reading data cached by the previous deploy; the fix was a defensive read plus a `:v2` suffix on the affected cache keys. Any future change to a cached shape should bump its key.
- **Optimistic maths is intentionally shallow** (line total × qty, subtotal, threshold check). The server's full pricing replaces it within the same transition, so shown totals are never stale for more than a round trip.
- **Load more, filters and quick add share the product card**, so every listing now has quick add and a wishlist heart without extra queries: variants ride along in the card payload.

## Phase 3: Catalog (done)

Shared URL parser, single-statement listing query with facets, PLP with real-link filters and crawlable pagination, PDP with a CLS-free gallery, colour URLs, notify-me, size guide, delivery estimate, reviews, JSON-LD; sitemap and robots. See git history for the full notes and the query plan.

## Phase 2: Storefront shell (done)

Header with mega menu, drawer and search; home page from `HomepageSection` and `Banner`; footer; Markdown CMS pages; tagged query cache.

## Phase 1: Data & auth (done)

49-table schema, init migration with search trigger, idempotent seed, Auth.js v5 with credentials and Google, guards and middleware.

## Phase 0: Foundation (done)

Next.js 15.5, React 19, Tailwind v4 tokens, shadcn on Radix restyled, Archivo and Inter Tight, tooling, Postgres on port 5436.

## Sequencing note for Phase 6

Phase 6 (account area: orders, cancellations, returns, invoices, tracking) was requested while Phase 4 was mid-build. Phase 5 (checkout, Razorpay, COD, order creation, emails, invoice PDF) has not been built, so no orders exist yet. Phase 6 can be built next either on top of seeded orders that stand in for checkout, or after Phase 5 creates real ones. The account routes, ownership checks, cancellation restocking and return flows are the same either way; only how the orders get there differs.

## Known gaps

- Checkout is inert until Phase 5.
- Back-in-stock and coupon emails wait for the email layer.
- Review submission waits for Phase 8.
- `/track` links in the drawer and footer are a Phase 6 route.
- The demo database holds one support ticket, one newsletter subscriber, one back-in-stock request and Asha's merged cart from the browser checks.
