# Progress

## Phase 6: Account area (done)

Authorization is the theme. Every route here reads a resource by id, so every read and write takes the user id into the query itself and treats a miss as "does not exist".

### Ownership in the data layer

- `lib/orders/queries.ts` (`orderExistsForUser`, `getOrderDetailForUser`, `listOrdersForUser`, `getAccountSummary`), `lib/orders/cancel.ts`, `lib/returns/service.ts`, `lib/account/addresses.ts` and `lib/account/profile.tsx` all filter by `userId` inside the Prisma `where`, or check the affected row count, and return null / false / throw `OrderError("NOT_FOUND")` on a miss. Pages turn null into `notFound()`. A logged-in customer requesting another customer's order id, invoice URL, return page or address id gets a 404 with no hint that the id exists.
- `/api/invoices/[orderId]` reuses `canAccessOrder`: the session owner, or a valid signed guest token from checkout, otherwise 404. Return photos are served by `/api/returns/[requestId]/photos/[index]` to the request owner or staff only.
- **Real 404 status.** `app/(storefront)/account/orders/[id]/layout.tsx` runs the existence-plus-ownership check above the segment's `loading.tsx`, so an unknown or foreign id is a 404 response, not a streamed 200 with a 404 body. The page below still scopes its own query by user; the layout decides the status code, the query decides the authorisation.
- The account `layout.tsx` only gates sign-in and draws the nav. It knows nothing about which order or address a page shows.

### Routes

- `/account` — recent orders, order count, default address, wishlist count, open returns.
- `/account/orders` — paginated (10 per page), status filter and order-number search as a plain GET form so the URL is shareable and works without JavaScript; "Newer / Older" links keep the filters.
- `/account/orders/[id]` — items from `OrderItem` snapshots (never the live product), payment rows and refunds, shipping and billing snapshots, customer note, invoice download, the timeline Confirmed → Packed → Shipped → Out for delivery → Delivered with the latest `Shipment` courier, AWB and tracking link, customer-visible activity, and the actions the state allows (cancel, return or exchange).
- `/account/orders/[id]/return` — per-item selection with quantity and a per-item reason, an overall reason code, optional photos, note, and a pickup address prefilled from the delivery snapshot. Items already in a live return are shown but not selectable.
- `/account/addresses` — add, edit, delete, set default, with pincode auto-fill. Deletion is always allowed because orders carry their own address snapshot; the integration test deletes an address and checks the order's `shippingAddress` JSON is unchanged. Deleting the default promotes the most recently updated address.
- `/account/profile` — name and phone; password change that requires the current password and signs out every other session; email change that only takes effect after the new address confirms a link.
- `/account/returns` — every request with status, items, reason, photos count, next step in plain words, and the linked refund when one exists.
- `/account/wishlist` — Phase 4's page inside the account shell (move to bag, remove, notify-me on sold-out).
- `/track` — guest lookup by order number plus the email or mobile on the order. Rate limited per IP (10 per 10 minutes). One generic miss message whether the number is wrong, the contact is wrong or the order does not exist.
- `/verify-email?token=` — confirms an email change; invalid, expired, used and already-taken links each get their own copy.

### Cancellation (`lib/orders/cancel.ts`)

Allowed while the order is CONFIRMED or PACKED, in one transaction with the order row locked: each item's variant is restocked with an `InventoryLog` CANCEL row (and `salesCount` reduced), any live reservation released, the `CouponRedemption` deleted and `Coupon.usedCount` decremented, a `Refund` row created PENDING for the full amount when the order was PAID, the order set CANCELLED with the reason and a customer-visible event, then the cancellation email. **The Razorpay refund API call is a Phase 7 admin action; Phase 6 only creates the PENDING refund row**, and the order page says the refund is queued. Staff will reuse the same function with `source: "staff"`.

### Returns and exchanges (`lib/returns/`)

- Window: `returns.windowDays` from settings (seeded 7), counted from `Order.deliveredAt`; `returnWindow` is pure and unit tested.
- Quantities: `returnableQuantities` nets every earlier return item whose request is still live (REQUESTED, APPROVED, PICKUP_SCHEDULED, RECEIVED, COMPLETED) against the ordered quantity, so a partial return leaves the remainder returnable and a rejected request gives its units back. The form shows "1 of 2 still returnable" and disables fully returned lines; the service refuses anything over the remainder.
- The request stores the type, reason code, note, pickup address snapshot, photo storage keys and per-item rows; the order moves to RETURN_REQUESTED from DELIVERED and an acknowledgement email goes out.
- **Returns never restock.** Stock moves only when staff mark the parcel received (Phase 7).

### Sessions and the password change

- `User.sessionVersion` (new column) rides in the JWT. `lib/auth.ts` re-reads role, ban state and version from the database when a token is older than 30 seconds; a mismatch returns null and the session is gone. Changing the password bumps the version, then calls Auth.js `unstable_update` so the current session's cookie carries the new value, then redirects to the profile with the confirmation. Every other session is signed out within 30 seconds of its next request.
- Found and fixed while verifying: the edge middleware used to bounce any request carrying a JWT off `/login`, and a stale-but-present cookie looped between `/account` and `/login`. The bounce now lives in the login and register pages, which use the full session check. A stale session lands on the sign-in page.
- Email change: `User.pendingEmail` plus an `AuthToken` (EMAIL_VERIFY, hashed, 24 hours) sent to the new address. The old email keeps working until the link is used; the change can be cancelled from the profile.

### Shared components

`components/orders/order-status-badge.tsx` (`OrderStatusBadge`, `PaymentStatusBadge`) and `components/orders/order-timeline.tsx` (`OrderTimeline`, vertical or horizontal, optional shipment block) render from status and event data alone, with labels and tones from `lib/orders/status.ts`. `buildTimeline` is pure and unit tested: current step, done steps, a cancelled order frozen at the last step it reached, post-delivery statuses as a terminal marker. The admin can drop both into tables and order pages.

### The cleanup job, answered

- **How it runs:** cron-driven. `vercel.json` calls `GET /api/jobs/cleanup` every five minutes with the `CRON_SECRET` bearer; anywhere else the same route can be hit by any scheduler. It is not request-driven; nothing in checkout triggers it.
- **Two concurrent runs:** they cannot double-process an order. `abandonUnpaidOrder` takes `SELECT … FOR UPDATE` on the order row and re-checks that it is still PENDING and unpaid before doing anything, so the second run finds CANCELLED and returns false. The reservation release is an `updateMany where releasedAt is null`, which is idempotent. The coupon reversal happens inside the same locked transaction.
- **A quiet night with no cron:** nothing is cancelled, but nothing is blocked either. Availability at checkout and at capture is stock minus reservations whose `expiresAt` is still in the future, so an expired reservation stops holding stock the moment its TTL passes, cleanup or not. What waits for the next run is bookkeeping: `releasedAt` on the reservation rows, the order flipping to CANCELLED, and the coupon use coming back. A late webhook in that gap captures normally (stock permitting) rather than being parked, which is the better outcome for the customer.

### Tests

- Unit (`pnpm test`, 79): timeline derivation and cancellability, return window boundaries and returnable quantities, plus the two new email templates.
- Integration (`pnpm test:integration`, 18): customer B's id is missing for customer A across order detail, order list, cancel and returns; cancelling a COD order restocks with CANCEL rows, frees a single-use coupon (a second order then succeeds with it) and creates no refund; cancelling a captured prepaid order restocks and queues a PENDING refund; a shipped order cannot be cancelled and nothing is restocked; a partial return of 1 of 3 leaves 2 returnable, an over-request is refused, the remaining 2 go through as an exchange, and stock never moves; a closed window and a foreign user are refused; deleting an address keeps the order snapshot and promotes a new default; tracking matches on email (any case) or a +91 phone and misses otherwise; the password change rejects a wrong current password, stores the new hash and bumps the version.
- `tests/integration/demo-orders.test.ts` is a fixture builder, skipped unless `DEMO_ORDERS=1`, that gives Asha a cancellable order, a delivered order and a shipped order and creates Ravi Menon (customer B) with one order for manual checks.

### Verified in a real browser against the production build

- Signed in as Asha (customer A): fetching Ravi's order page, invoice URL and return page from her session all returned HTTP 404, as did a made-up id; her own returned 200. Navigating to Ravi's order rendered the 404 page with a 404 status.
- Cancelled her CONFIRMED COD order with FLAT300: the page showed Cancelled, the timeline froze at Confirmed with a "Cancelled" marker, the activity read "Cancelled by you. Ordered by mistake". Database: variant stock 36 → 37, InventoryLog CANCEL +1 next to the SALE −1, FLAT300 `usedCount` 1 → 0, redemption row gone, no refund row, cancellation email in the outbox.
- Raised a return for 1 of 2 Hush Court 1 Low on the delivered order: the returns page listed it as Requested; reopening the form showed "1 of 2 still returnable" and the other line untouched; the order became RETURN_REQUESTED, no inventory row was written, the acknowledgement email went out.
- Opened a second session with curl, changed the password in the browser: the browser session stayed signed in and landed on the profile with the confirmation; the second session's next request was redirected to sign-in and `/api/auth/session` returned null. A signed-in visit to `/login` bounces to `/account`; a stale cookie lands on `/login` without looping.
- Address book: make default moved the badge and the overview's default address; add, edit and delete open in a modal with pincode auto-fill.
- Orders list: `?status=CANCELLED` and `?q=000131` filter correctly with the empty state for no matches.
- `/track` with the right order number and a wrong email: the generic message. With `+91 98765 43210`: the shipped order, its Bluedart AWB and the timeline at Shipped.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration` and `pnpm build` pass.

### Decisions and gaps

- Cancelling a COD order leaves `paymentStatus` PENDING (there is no "void" state) and the page says "not collected"; nothing was charged.
- The return photo upload writes files before the transaction; a request that then fails leaves orphan files under `storage/returns/`, which is cheaper than a half-written request. A sweep can come with the storage driver work.
- Exchanges record the wanted size in the note; staff pick the replacement variant when approving (Phase 7).
- Email change leaves the JWT's email stale until the next sign-in; account pages read the email from the database, so nothing shown is wrong.
- The 30-second session re-check is one indexed primary-key read per `auth()` call once the interval passes; it can be shortened or lengthened in `lib/auth.ts`.

## Phase 5: Checkout & payments (done)

Money moves here, so every rupee is computed once, server-side, by `lib/pricing.priceCart`. The client sends an address, a shipping rate id and a payment method; it never sends a price, and the invariant throw in the pricing engine stays live in production.

### Checkout (`/checkout`)

One route, three steps on the page, each collapsing to a summary with "Edit":

1. **Contact and address.** Email, Indian mobile (`indianPhoneSchema`, accepts +91/0 prefixes and spaces), address with pincode auto-fill from the `Pincode` table (city and state, or a "we do not know this pincode" hint), a state select (36 states and UTs, the place-of-supply source), saved addresses for signed-in shoppers with "New address", optional "save to my account", and a separate billing address. Validation runs client-side with the same Zod schemas the server uses, then again on the server.
2. **Shipping.** `lib/orders/quote.ts` looks up the zone for the pincode (`Pincode.zoneId`, then prefix match, then the default zone) and prices the whole bag through `priceCart` once per rate, so the shipping line and the total shown are the numbers the order will be created with. Every option shows the delivery window and a reason: "Free on bags over ₹1,999 after discounts.", "Charged per order.", "Free over ₹2,999. You are ₹1,401 short.", or, when a coupon pulled the bag under the threshold, "Your coupon brought the bag under ₹1,999, so shipping is charged. Free shipping counts the discounted total." A pincode marked unserviceable, or with no zone, gets "We do not deliver to Shillong 793001 yet. Try another address." and a button back to step 1. If the bag changes in another tab, the quote re-runs.
3. **Payment.** Razorpay ("Pay now") when keys are configured, cash on delivery when the pincode allows it and the total is within `checkout.codLimit` (seeded ₹10,000). A hidden method says why: "Cash on delivery is not offered for this pincode." or "Cash on delivery is available on orders up to ₹10,000." The button reads "Pay ₹1,677" or "Place order · ₹5,499".

The bag drawer and bag page now link to `/checkout`; the bag's shipping line is still labelled "(estimate)" because it uses the default zone before the pincode is known, and step 2 says so when the zone rate differs.

### Order creation (`lib/orders/create.ts`)

One transaction:

- Variants locked with `SELECT … FOR UPDATE` in id order; availability is stock minus active reservations; a shortfall throws a specific message ("Only 3 of Hush Court 1 (Ink, UK 8) left; your bag asks for 5.").
- The coupon row locked `FOR UPDATE`, `usageLimit` and `perUserLimit` re-checked at redemption, `usedCount` incremented and a `CouponRedemption` row written in the same transaction.
- `orderNumber` from the `order_number_seq` sequence (`OWL-2026-000074`); never SELECT MAX.
- `OrderItem` snapshots with unit price, per-line discount, tax rate, tax amount and HSN from the pricing engine; address snapshots as JSON; delivery window from `lib/delivery.ts`; place of supply from the shipping state against the store state, with CGST+SGST or IGST totals on the order.
- **Prepaid:** `Order` PENDING, `StockReservation` rows with a TTL, `Payment` row (RAZORPAY, CREATED). After the transaction, a Razorpay order for the same paise amount; if that call fails the order is abandoned (reservations released, coupon reversed) and the shopper sees "Nothing was charged."
- **COD:** stock decremented with `InventoryLog` SALE rows, `salesCount` bumped, `Payment` row (COD, CREATED), order CONFIRMED, bag emptied, all in the transaction.
- The server refuses to charge a total the shopper did not see (`expectedTotal` mismatch → "Your bag changed while you were checking out.").

### Payment capture (`lib/orders/capture.ts`)

`capturePayment` is the only PAID transition and both the webhook and the browser callback call it. It locks the order row and the variants, checks the captured amount equals `grandTotal`, decrements stock with `InventoryLog` rows, releases reservations, sets CONFIRMED/PAID, empties the bag, then (outside the transaction) sends the confirmation email and renders the invoice. A second call for the same `providerPaymentId`, or for an order already PAID, returns `already_captured` and touches nothing.

If the money arrived but the order cannot be fulfilled (stock gone, amount mismatch, or the order was already cancelled by the cleanup), the payment is still recorded, the order is marked PAID + `needsReview` with the reason, a `Refund` row is created PENDING for the Phase 7 admin refund action, and the customer gets the "we hit a snag" email. Stock is never decremented in that path.

**Browser callback** (`confirmRazorpayPaymentAction`): verifies the `razorpay_signature` HMAC over `order_id|payment_id`, checks the Razorpay order belongs to this order and this session, then fetches the payment from Razorpay's API and only captures when Razorpay itself reports `captured` with the amount it charged. The browser never supplies an amount.

**Webhook** (`/api/webhooks/razorpay`, `lib/payments/webhook.ts`): raw body read first, HMAC checked against `RAZORPAY_WEBHOOK_SECRET`, unsigned or altered bodies rejected with 400 before parsing. Each delivery is recorded in `WebhookEvent` keyed by `x-razorpay-event-id` (unique per provider); a replay is a `duplicate` 200 and does nothing. Handles `payment.captured`, `payment.failed` (records the attempt, order stays PENDING for a retry) and `refund.processed` (links to a PENDING refund row or records a new one, sets REFUNDED / PARTIALLY_REFUNDED). A processing error deletes the event row and returns 500 so Razorpay retries.

### Reservations and cleanup

- A prepaid order holds its stock for **`orders.reservationMinutes`, seeded to 20 minutes** (`Order.expiresAt`, `StockReservation.expiresAt`). COD needs no reservation because it decrements immediately.
- `lib/orders/cleanup.ts` releases expired reservations and cancels PENDING, unpaid, expired orders: reservations released, coupon redemption deleted and `usedCount` decremented, the payment row FAILED, the order CANCELLED with an event. It locks the order row, so it cannot race a late capture. `GET /api/jobs/cleanup` runs it behind `CRON_SECRET`; `vercel.json` schedules it every five minutes.

**If the webhook never arrives:** while the shopper is still on the page, the browser callback completes the order on its own. If they closed the tab as well, the order stays PENDING with its stock reserved until `expiresAt` (placed + 20 minutes); the next cleanup run cancels it, frees the stock and the coupon, and the success page (which polls every 4 seconds while pending) shows "This order was cancelled" with the refund note. If Razorpay then delivers a late `payment.captured` (or an admin re-sends it), the capture is recorded, the order becomes PAID + needs review with a PENDING refund, and the customer is emailed. Nothing double-counts in any order of arrival.

### Tax and invoices

- `lib/orders/tax.ts`: `placeOfSupply` normalises the shipping state (aliases like KA, New Delhi, Orissa) and compares it with the store state; `orderTaxSplit` / `lineTaxSplit` divide inclusive GST into CGST+SGST (in-state) or IGST, half-up on CGST with SGST taking the remainder so the pair always sums exactly.
- Invoice PDFs (`lib/invoices/render.tsx`, `@react-pdf/renderer`) carry the seller GSTIN, invoice number from `invoice_number_seq` (`OWL-INV-2026-000001`, assigned once, unique), order number and dates, bill-to and ship-to, place of supply, HSN per line, per-line taxable value, rate, CGST/SGST or IGST, and the split in the totals. Helvetica has no rupee glyph, so amounts print as "INR 5,499.00". The template is marked **REVIEW WITH AN ACCOUNTANT** in the source and in the footer.
- Stored through `lib/storage.ts` (local disk under `STORAGE_DIR`; the interface is the seam for S3/UploadThing) and served by `/api/invoices/[orderId]`, which returns 404 for anyone but the owner or a valid guest token.

### After the order

- `/checkout/success/[orderId]` shows the state (confirmed, confirming payment, cancelled, needs review), the items, address, delivery window, payment line and the invoice link. Guests reach it with a signed, 30-day `?t=` token (`lib/orders/access.ts`, HMAC over the order id); anyone else, a wrong token or a wrong id gets a real 404 because no loading boundary sits above the page. The page refreshes the bag on arrival so the header count drops to zero.
- Emails (`emails/`): order confirmation is sent on confirmation (COD at placement, prepaid at capture); shipped, out-for-delivery, delivered, cancelled, refund-processed and needs-review templates exist and are rendered in tests. Without `RESEND_API_KEY` the HTML lands in `.dev-outbox/`.
- The bag is emptied only inside the transaction that confirms the order.

### Tests

- Unit (`pnpm test`, 68): number formats, place of supply and the tax split, checkout and webhook signature accept/reject, guest token verify/expiry, and the invoice arithmetic case: a 40% coupon capped at ₹500 over lines of ₹1,299, ₹799 and ₹7.99 allocates [30,840, 18,970, 190] paise where the floors sum to 49,998 and two lines take the leftover paise; per-line tax sums to `taxTotal` and line nets plus shipping equal `grandTotal`, in-state and inter-state. Six email templates render with the right content.
- Integration (`pnpm test:integration`, 10, against the local Postgres): 30 concurrent `nextval` calls give 30 unique, gap-free numbers; a prepaid order reserves rather than decrements, the signed webhook captures once, a replay of the same payload is `duplicate`, the same payment under a new event id is `already_captured`, and the invoice built from the stored order rows balances; unsigned and tampered deliveries are 400 and leave no event row; IGST for an out-of-state address; two carts racing for 8 units with 5 each: exactly one wins; expiry releases reservations and returns a single-use coupon, the second bag then succeeds, and a late capture is parked with a PENDING refund; an amount mismatch is parked; COD decrements immediately with a COD payment row; COD is refused over the limit and for a COD-off pincode.
- E2E (`pnpm test:e2e`): browse → size → add to bag → checkout as a guest → pincode auto-fill → shipping reason visible → cash on delivery → success page → order CONFIRMED in the database with stock decremented and an inventory log per line; invoice downloads with the token and 404s without; header bag at zero. The Razorpay leg (Pay now → modal → signed webhook alone completes the order) runs only with test keys and is skipped, not faked, without them.

### Verified in a real browser against the production build

- Hush Court 1, UK 8, ₹5,499: empty submit shows an inline error under every required field with `aria-invalid`; pincode 560034 filled "Bengaluru, Karnataka"; step 2 offered Standard (free, "Free on bags over ₹1,999 after discounts.", Sat 12 to Tue 15 Sept) and Express (₹199); step 3 explained online payment is off in this environment; "Place order · ₹5,499" landed on the success page. Database: CONFIRMED, COD payment CREATED, CGST ₹419.41 + SGST ₹419.42 = ₹838.83, invoice `OWL-INV-2026-000001` stored, confirmation email in the outbox, one SALE inventory row.
- Three sock packs with SOCKS3 (third free): the bag said "Add ₹401 more for free shipping"; step 2 charged ₹79 with "Your coupon brought the bag under ₹1,999, so shipping is charged."
- Pincode 793001 (Shillong): Northeast rates, "Cash on delivery is not offered for this pincode." and, with Razorpay off, "No payment method is available for this order."
- Success page with the emailed token; the same URL with a wrong token, the invoice with a wrong or missing token, and a made-up order id all return 404.
- Against the running server with curl: cleanup 401 without the bearer and 200 with it; a signed webhook for an unknown order 200 `not_found`, its replay `duplicate`, a bad signature 400.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e` (Chrome channel) and `pnpm build` pass.

### Conflicts flagged and calls made

BLOCKER (deferred): Razorpay never tested against live test-mode keys.
Payload shape, retry/idempotency and failed-then-retried payment are
unverified. Must be cleared before any real traffic. Owner: Phase 9.

- **No Razorpay credentials in this environment.** The test-card and close-the-tab manual checks could not be run. Instead the same code paths were exercised with locally signed payloads (integration tests and curl), and the Playwright Razorpay test is gated on the keys. With keys, `RAZORPAY_WEBHOOK_SECRET` must be set or every delivery is rejected.
- **CLAUDE.md marks PAID after a verified client signature; the Phase 5 brief makes the webhook the source of truth.** Both are honoured by one idempotent capture: the callback verifies the signature, then confirms the amount and captured status against Razorpay's API before calling the same function the webhook calls. Whichever arrives first wins; the other is a no-op.
- **`PaymentRecordStatus` has no PENDING**, so a COD payment row is `CREATED` while `Order.paymentStatus` is `PENDING`, which is what the account and admin pages should read.
- **Coupon accounting happens at placement, not at capture**, so a limited coupon cannot be oversubscribed by parallel PENDING orders; expiry and abandonment reverse it.
- **`@react-pdf/renderer`** was added for the invoice PDF (server-side, no browser dependency). `razorpay`, `resend`, `@react-email/components` and `@react-email/render` are from the fixed stack.
- **Invoice number at confirmation.** It is assigned when the order confirms (COD at placement, prepaid at capture). Whether it should wait for dispatch is an accountant's call and is noted on the template.
- **Cached bag payloads** gained `weightGrams`, `sku` and `hsnCode`; additive and unread by the client, so the cache key was not bumped.

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

## Handover to Phase 7 (Admin dashboard)

What the admin picks up from Phases 5 and 6:

- `Refund` rows sitting PENDING (customer cancellations of paid orders, and orders parked with `needsReview`) need the Razorpay refund call and a status update; `refund.processed` on the webhook already closes the loop.
- Return requests need approve / reject / pickup booked / received; marking received is where restocking happens (InventoryLog RETURN) and where an exchange picks its replacement variant.
- Status transitions to PACKED, SHIPPED (with a `Shipment` row), OUT_FOR_DELIVERY and DELIVERED (set `deliveredAt`, which opens the return window) should send the emails that already exist in `emails/order-status.tsx`.
- `cancelOrder` accepts `source: "staff"` and an actor id; `OrderStatusBadge`, `PaymentStatusBadge` and `OrderTimeline` render from data alone and are ready for admin tables and order pages.
- Every admin mutation must check the role server-side and write an `AuditLog` row.

## Known gaps

- Razorpay is exercised only with locally signed payloads until test keys are added to `.env`; the Playwright Razorpay test is skipped without them.
- Shipped, out-for-delivery, delivered, cancelled and refund emails are rendered in tests but not yet sent: the status changes that trigger them arrive with Phase 6 (customer cancellation) and Phase 7 (admin fulfilment and refunds).
- Orders parked with `needsReview` (paid but unfulfillable) wait for the Phase 7 admin queue and refund action; the PENDING `Refund` row is already there.
- The invoice template and the place-of-supply rule (shipping state for B2C) need an accountant's review before launch; the store GSTIN is empty in the seed and prints as "Pending registration".
- Back-in-stock and coupon emails wait for their triggers.
- Review submission waits for Phase 8.
- Return photos are written before the request's transaction; a request that then fails leaves orphan files under `storage/returns/` until a sweep exists.
- Exchanges record the wanted size in the customer's note; the replacement variant is chosen by staff when approving (Phase 7).
- The demo database holds one support ticket, one newsletter subscriber, one back-in-stock request, the COD order `OWL-2026-000074` from the Phase 5 browser check, and the Phase 6 fixtures from `DEMO_ORDERS=1`: Ravi Menon (customer B, `ravi.menon@example.com` / `owlyn-demo-2026`) with one order, and Asha's cancelled, delivered-with-a-return and shipped orders. Asha's password was changed during the browser check; re-run `pnpm db:seed` to restore `owlyn-demo-2026`.
