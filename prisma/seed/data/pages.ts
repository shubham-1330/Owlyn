export type PageSeed = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
};

const LEGAL_NOTE = "<!-- REVIEW WITH A LAWYER -->\n\n";

export const pages: PageSeed[] = [
  {
    slug: "about",
    title: "About Owlyn",
    excerpt: "Who we are and why the owl.",
    body: `Owlyn makes shoes and clothes for the hours nobody sees. The 5 am run. The last set after everyone has left. The walk home in the rain.

We started in Bengaluru in 2024 with one court shoe and one t-shirt. The plan was to make a few things well and keep making them. It still is.

## Why the owl

Owls work at night, quietly, with precision. That is the standard we hold our kit to. Nothing on it is there for show.

## How we make things

- Footwear is built on our own lasts, one for men and one for women, so a size carries across the range.
- Apparel is knitted and sewn in Tiruppur by partners we visit.
- We use recycled polyester wherever a synthetic is the right choice and cotton wherever it is not.
- We do not chase seasons. A product stays in the range until we can make it better.

## Where to find us

Studio and returns centre: 42, 1st Main Road, Indiranagar, Bengaluru 560038. Open weekdays, 10 am to 6 pm.`,
  },
  {
    slug: "contact",
    title: "Contact",
    excerpt: "How to reach us and how quickly we reply.",
    body: `We answer email within one working day and usually faster.

- Orders and returns: support@owlyn.example
- Wholesale and press: hello@owlyn.example
- Phone: +91 80 4000 0000, weekdays 10 am to 6 pm IST

If your question is about an order, include the order number. It starts with OWL and is on your confirmation email.

## Studio

42, 1st Main Road, Indiranagar, Bengaluru 560038. Walk-ins welcome on weekdays.`,
  },
  {
    slug: "faqs",
    title: "Questions",
    excerpt: "Sizing, shipping, returns and payment, answered short.",
    body: `## Sizing

**How do your shoes fit?**
True to size on the UK scale. If you are between sizes, go up. Every product page has a size guide with foot lengths in centimetres.

**How do your clothes fit?**
Regular unless the product says otherwise. Regular means room to move, not room to hide.

## Shipping

**How long does delivery take?**
Metro cities in 2 to 4 days, the rest of India in 4 to 7, remote and North-East pincodes in 7 to 12. You see the estimate before you pay.

**Is shipping free?**
Standard shipping is free over ₹1,999. Under that it is ₹79 in metros and ₹99 elsewhere.

**Do you offer cash on delivery?**
Yes, for orders up to ₹10,000 to serviceable pincodes.

## Returns

**Can I return something?**
Yes, within 7 days of delivery, unworn, with tags. Exchanges for a different size are free. Read the full returns policy for the details.

## Payment

**What can I pay with?**
UPI, cards, net banking and wallets through Razorpay, or cash on delivery. We never see your card details.

**Do you charge GST?**
All prices include GST. Your invoice shows the split.`,
  },
  {
    slug: "shipping",
    title: "Shipping",
    excerpt: "Zones, times and costs.",
    body: `Orders placed before 2 pm IST on a working day are dispatched the same day. Everything else goes out the next working day.

| Zone | Standard | Express |
| --- | --- | --- |
| Metro (Delhi NCR, Mumbai, Pune, Bengaluru, Chennai, Hyderabad, Kolkata) | ₹79, free over ₹1,999, 2 to 4 days | ₹199, 1 to 2 days |
| Rest of India | ₹99, free over ₹1,999, 4 to 7 days | Not available |
| Remote and North-East | ₹149 plus weight, free over ₹2,999, 7 to 12 days | Not available |

Cash on delivery is available in Metro and Rest of India zones for orders up to ₹10,000.

You will get a tracking link by email when the parcel leaves us. You can also track any order on the Track order page with the order number and your email or phone.`,
  },
  {
    slug: "returns",
    title: "Returns and exchanges",
    excerpt: "7 days, unworn, with tags. Exchanges are free.",
    body: `${LEGAL_NOTE}This is a draft policy for review. It is not legal advice.

## The short version

You can return or exchange anything within 7 days of delivery if it is unworn, unwashed and has its tags. Exchanges for another size or colour are free. Returns are refunded to the original payment method within 5 to 7 working days of the item reaching us.

## How to start

Sign in and open the order, or use the Track order page as a guest. Choose the items, pick a reason, and we will schedule a pickup. If pickup is not available at your pincode, we will give you a prepaid label.

## What we cannot take back

- Socks and innerwear, for hygiene reasons, unless faulty
- Items marked final sale on the product page
- Anything worn outside, washed, or altered

## Faulty items

If something arrives damaged or fails within 90 days of normal use, contact us with photos. We will replace it or refund it, including shipping.

## Cash on delivery refunds

COD refunds are paid to a bank account or UPI ID you give us during the return.`,
  },
  {
    slug: "privacy",
    title: "Privacy",
    excerpt: "What we collect, why, and how to get it removed.",
    body: `${LEGAL_NOTE}This is a draft policy for review. It is not legal advice.

## What we collect

- Account details: name, email, phone, password hash
- Addresses you save or ship to
- Orders, payments (via Razorpay; we never store card numbers) and returns
- Products you view and add to your bag, tied to a cookie so your bag survives a refresh
- Support messages you send us

## Why

To take and deliver orders, answer your questions, prevent fraud, and understand which products people want. If you opt in, to send you email about new products. Nothing else.

## Who we share it with

Couriers (to deliver), Razorpay (to take payment), Resend (to send email), and our hosting providers. No one else, and never for their own marketing.

## Your rights

Email support@owlyn.example to see, correct or delete your data. We delete accounts within 30 days of a request, except records we must keep for tax law.

## Cookies

See the cookies page.`,
  },
  {
    slug: "terms",
    title: "Terms of sale",
    excerpt: "The agreement when you buy from Owlyn.",
    body: `${LEGAL_NOTE}This is a draft policy for review. It is not legal advice.

## Orders

An order is accepted when we send the confirmation email. We may cancel an order before dispatch if an item is out of stock or a price was listed in error; you will be refunded in full.

## Prices

All prices are in Indian rupees and include GST. Shipping is shown before you pay.

## Payment

Payments are processed by Razorpay. Cash on delivery is available on eligible orders and must be paid in full to the courier.

## Delivery

Delivery estimates are estimates. Risk passes to you when the courier records delivery.

## Returns

See the returns policy.

## Liability

Our liability for any order is limited to the amount you paid for it, except where the law says otherwise.

## Law

These terms are governed by the laws of India. Disputes go to the courts of Bengaluru.

Owlyn is a trading name of Owlyn Apparel Private Limited, GSTIN pending.`,
  },
  {
    slug: "warranty",
    title: "Warranty",
    excerpt: "90 days against defects. Wear is not a defect.",
    body: `${LEGAL_NOTE}This is a draft policy for review. It is not legal advice.

Everything we sell is covered against manufacturing defects for 90 days from delivery. A defect is a seam that fails, a sole that separates, a zip that breaks in normal use.

Wear is not a defect. Outsoles wear down. Cotton fades. Fleece pills a little. We will tell you honestly which one it is.

To claim, email support@owlyn.example with the order number and photos. We will replace the item, or refund it if we cannot.`,
  },
  {
    slug: "cookies",
    title: "Cookies",
    excerpt: "The cookies we set and what they do.",
    body: `${LEGAL_NOTE}This is a draft policy for review. It is not legal advice.

We set a small number of cookies. None of them are for advertising.

| Cookie | Purpose | Lasts |
| --- | --- | --- |
| Session | Keeps you signed in | 30 days |
| Cart token | Keeps your bag while you browse as a guest | 30 days |
| Recently viewed | Remembers products you looked at, so we can show them again | 30 days |
| Consent | Remembers that you have seen this notice | 1 year |

Recent searches are stored in your browser only and never sent to us.

If we add analytics later, this page will change first.`,
  },
];
