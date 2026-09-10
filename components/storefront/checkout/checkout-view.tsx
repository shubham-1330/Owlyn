"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Field, FormMessage } from "@/components/forms/field";
import { useCart } from "@/components/storefront/cart/cart-provider";
import {
  AddressFields,
  emptyAddress,
  type AddressFormValues,
} from "@/components/storefront/checkout/address-fields";
import { CheckoutSummary } from "@/components/storefront/checkout/order-summary";
import { openRazorpay } from "@/components/storefront/checkout/razorpay-checkout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/lib/money";
import type { PlaceOrderResult } from "@/lib/orders/create";
import type { CheckoutQuote, ShippingOption } from "@/lib/orders/quote";
import { cn } from "@/lib/utils";
import { addressSchema, contactSchema } from "@/lib/validations/checkout";

import {
  confirmRazorpayPaymentAction,
  lookupPincodeAction,
  placeOrderAction,
  quoteShippingAction,
} from "@/app/(storefront)/checkout/actions";

export type SavedAddress = AddressFormValues & { id: string; isDefault: boolean };

type Props = {
  user: { email: string; name: string | null; phone: string | null } | null;
  savedAddresses: SavedAddress[];
  razorpayEnabled: boolean;
  storeName: string;
  reservationMinutes: number;
};

type Step = 1 | 2 | 3;
type FieldErrors = Partial<Record<keyof AddressFormValues | "email" | "contactPhone", string>>;

function splitName(name: string | null): string {
  return name ?? "";
}

export function CheckoutView({
  user,
  savedAddresses,
  razorpayEnabled,
  storeName,
  reservationMinutes,
}: Props) {
  const router = useRouter();
  const cart = useCart();
  const view = cart.view;

  const defaultSaved = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0] ?? null;
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState(user?.email ?? "");
  const [selectedSavedId, setSelectedSavedId] = useState<string>(defaultSaved?.id ?? "new");
  const [address, setAddress] = useState<AddressFormValues>(() =>
    defaultSaved
      ? { ...defaultSaved }
      : { ...emptyAddress, fullName: splitName(user?.name ?? null), phone: user?.phone ?? "" },
  );
  const [saveAddress, setSaveAddress] = useState(Boolean(user) && savedAddresses.length === 0);
  const [billingSame, setBillingSame] = useState(true);
  const [billing, setBilling] = useState<AddressFormValues>({ ...emptyAddress });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [billingErrors, setBillingErrors] = useState<FieldErrors>({});
  const [pincodeHint, setPincodeHint] = useState<string | undefined>(undefined);

  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [rateId, setRateId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"RAZORPAY" | "COD">(
    razorpayEnabled ? "RAZORPAY" : "COD",
  );
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [placing, startPlacing] = useTransition();
  const [held, setHeld] = useState<PlaceOrderResult | null>(null);
  const quoteSeq = useRef(0);

  const usingSaved = selectedSavedId !== "new";
  const activeAddress: AddressFormValues = usingSaved
    ? (savedAddresses.find((a) => a.id === selectedSavedId) ?? address)
    : address;
  const option: ShippingOption | null =
    quote?.status === "ok" ? (quote.options.find((o) => o.rateId === rateId) ?? null) : null;

  const patchAddress = useCallback((patch: Partial<AddressFormValues>) => {
    setAddress((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch) as Array<keyof AddressFormValues>) delete next[key];
      return next;
    });
  }, []);

  const autofill = useCallback(
    async (pincode: string, target: "shipping" | "billing") => {
      const result = await lookupPincodeAction(pincode);
      if (!result.ok) {
        setPincodeHint("We do not know this pincode yet. Fill in the city and state.");
        return;
      }
      setPincodeHint(
        result.serviceable
          ? `${result.city}, ${result.state}`
          : `We do not deliver to ${result.city} ${pincode} yet.`,
      );
      if (target === "shipping") patchAddress({ city: result.city, state: result.state });
      else setBilling((b) => ({ ...b, city: result.city, state: result.state }));
    },
    [patchAddress],
  );

  const runQuote = useCallback(
    async (pincode: string) => {
      const seq = ++quoteSeq.current;
      setQuoting(true);
      setQuote(null);
      const result = await quoteShippingAction(pincode);
      if (seq !== quoteSeq.current) return;
      setQuoting(false);
      if ("ok" in result && result.ok === false) {
        setFormError(result.message);
        setStep(1);
        return;
      }
      const q = result as CheckoutQuote;
      setQuote(q);
      if (q.status === "ok") {
        setRateId((current) =>
          current && q.options.some((o) => o.rateId === current)
            ? current
            : (q.options[0]?.rateId ?? null),
        );
        if (!q.codAvailable && paymentMethod === "COD")
          setPaymentMethod(razorpayEnabled ? "RAZORPAY" : "COD");
      } else if (q.status === "invalid_pincode") {
        setErrors((e) => ({ ...e, pincode: "Enter a 6-digit pincode." }));
        setStep(1);
      }
      // "empty": the bag view below turns into the empty state on its own.
    },
    [paymentMethod, razorpayEnabled],
  );

  // If the bag changes underneath (another tab), re-quote so totals stay exact.
  // Not once an order is placed: the server empties the bag at that point.
  const done = useRef(false);
  const cartStamp = view?.updatedAt;
  const lastStamp = useRef(cartStamp);
  useEffect(() => {
    if (lastStamp.current === cartStamp) return;
    lastStamp.current = cartStamp;
    if (done.current || placing) return;
    if (step >= 2 && quote?.status === "ok") void runQuote(quote.pincode);
  }, [cartStamp, step, quote, runQuote, placing]);

  function validateStep1(): boolean {
    const nextErrors: FieldErrors = {};
    const contact = contactSchema.safeParse({ email, phone: activeAddress.phone });
    if (!contact.success) {
      for (const issue of contact.error.issues) {
        if (issue.path[0] === "email") nextErrors.email = issue.message;
        if (issue.path[0] === "phone") nextErrors.phone = issue.message;
      }
    }
    const parsed = addressSchema.safeParse({ ...activeAddress, country: "IN" });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof AddressFormValues;
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
    }
    if (!billingSame) {
      const b = addressSchema.safeParse({ ...billing, country: "IN" });
      const be: FieldErrors = {};
      if (!b.success)
        for (const issue of b.error.issues)
          be[issue.path[0] as keyof AddressFormValues] ||= issue.message;
      setBillingErrors(be);
      if (Object.keys(be).length > 0) return false;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function continueToShipping() {
    setFormError(null);
    if (!validateStep1()) return;
    setStep(2);
    void runQuote(activeAddress.pincode);
  }

  function continueToPayment() {
    if (!option) return;
    setFormError(null);
    setStep(3);
  }

  function payload(method: "RAZORPAY" | "COD") {
    const ship = {
      ...activeAddress,
      country: "IN" as const,
      line2: activeAddress.line2 || undefined,
      landmark: activeAddress.landmark || undefined,
    };
    return {
      paymentMethod: method,
      contact: { email, phone: activeAddress.phone },
      shippingAddress: ship,
      billingSameAsShipping: billingSame,
      billingAddress: billingSame
        ? undefined
        : {
            ...billing,
            country: "IN" as const,
            line2: billing.line2 || undefined,
            landmark: billing.landmark || undefined,
          },
      shippingRateId: rateId,
      saveAddress: !usingSaved && saveAddress,
      savedAddressId: usingSaved ? selectedSavedId : undefined,
      customerNote: note || undefined,
      expectedTotal: option?.grandTotal,
    };
  }

  const successUrl = (result: PlaceOrderResult) =>
    `/checkout/success/${result.orderId}?t=${encodeURIComponent(result.accessToken)}`;

  async function runRazorpay(result: PlaceOrderResult) {
    if (!result.razorpay) return;
    const outcome = await openRazorpay({
      keyId: result.razorpay.keyId,
      amount: result.razorpay.amount,
      currency: result.razorpay.currency,
      razorpayOrderId: result.razorpay.orderId,
      storeName,
      description: `Order ${result.orderNumber}`,
      prefill: { name: activeAddress.fullName, email, contact: activeAddress.phone },
      notes: { orderNumber: result.orderNumber },
    });
    if (outcome.status === "success") {
      done.current = true;
      const confirm = await confirmRazorpayPaymentAction({
        orderId: result.orderId,
        razorpayOrderId: outcome.response.razorpay_order_id,
        razorpayPaymentId: outcome.response.razorpay_payment_id,
        razorpaySignature: outcome.response.razorpay_signature,
      });
      if (!confirm.ok) setFormError(confirm.message);
      router.push(successUrl(result));
      return;
    }
    if (outcome.status === "unavailable") {
      setHeld(result);
      setFormError(
        "The payment window could not open. Check your connection and try again; your order is held meanwhile.",
      );
      return;
    }
    setHeld(result);
    setFormError(
      `Payment not completed. We are holding your order and stock for ${reservationMinutes} minutes so you can try again.`,
    );
  }

  function placeOrder() {
    if (!option || !rateId) return;
    setFormError(null);
    startPlacing(async () => {
      if (held?.razorpay && paymentMethod === "RAZORPAY") {
        await runRazorpay(held);
        return;
      }
      const result = await placeOrderAction(payload(paymentMethod));
      if (!result.ok) {
        setFormError(result.message);
        if (
          result.code === "TOTAL_CHANGED" ||
          result.code === "STOCK" ||
          result.code === "UNAVAILABLE" ||
          result.code === "COUPON"
        ) {
          cart.refresh();
          if (quote?.status === "ok") void runQuote(quote.pincode);
        }
        if (result.code === "UNSERVICEABLE" || result.code === "RATE") setStep(1);
        if (result.code === "COD") setPaymentMethod("RAZORPAY");
        return;
      }
      if (result.order.paymentMethod === "COD") {
        // The success page refreshes the bag on arrival; doing it here would
        // re-render this view with an empty bag before navigation lands.
        done.current = true;
        router.push(successUrl(result.order));
        return;
      }
      await runRazorpay(result.order);
    });
  }

  if (!view || view.lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 py-16">
        <h2 className="text-xl">Nothing to check out yet.</h2>
        <p className="measure text-muted-foreground">
          Your bag is empty. The new arrivals are a good place to start.
        </p>
        <Button asChild>
          <Link href="/collections/new-in">Shop new in</Link>
        </Button>
      </div>
    );
  }
  const blocked = view.lines.filter((l) => !l.available);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
      <div className="flex flex-col gap-8">
        {blocked.length > 0 ? (
          <FormMessage tone="error">
            {blocked.length === 1
              ? `${blocked[0]!.name} is unavailable.`
              : `${blocked.length} items are unavailable.`}{" "}
            <Link href="/cart" className="underline underline-offset-4">
              Remove them from your bag
            </Link>{" "}
            to continue.
          </FormMessage>
        ) : null}

        {/* Step 1: contact and address */}
        <section aria-labelledby="step-address" className="flex flex-col gap-5">
          <StepHeading
            n={1}
            current={step}
            id="step-address"
            title="Contact and address"
            done={step > 1}
            onEdit={() => setStep(1)}
          />
          {step === 1 ? (
            <div className="flex flex-col gap-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="checkout-email"
                  name="email"
                  type="email"
                  label="Email"
                  autoComplete="email"
                  hint="Order updates go here."
                  value={email}
                  error={errors.email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((er) => ({ ...er, email: undefined }));
                  }}
                />
                {!user ? (
                  <p className="self-end pb-2 text-sm text-muted-foreground">
                    Have an account?{" "}
                    <Link
                      href="/login?next=/checkout"
                      className="underline underline-offset-4 hover:text-primary"
                    >
                      Sign in
                    </Link>{" "}
                    for saved addresses.
                  </p>
                ) : null}
              </div>

              {savedAddresses.length > 0 ? (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-sm font-medium">Deliver to</legend>
                  {savedAddresses.map((a) => (
                    <label
                      key={a.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-sm border p-4 text-sm transition-colors",
                        selectedSavedId === a.id
                          ? "border-foreground bg-muted"
                          : "border-input hover:border-fog",
                      )}
                    >
                      <input
                        type="radio"
                        name="savedAddress"
                        value={a.id}
                        className="mt-1"
                        checked={selectedSavedId === a.id}
                        onChange={() => {
                          setSelectedSavedId(a.id);
                          setErrors({});
                        }}
                      />
                      <span className="flex flex-col">
                        <span className="font-medium">
                          {a.fullName}{" "}
                          <span className="ml-1 text-xs text-muted-foreground uppercase">
                            {a.type.toLowerCase()}
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          {a.line1}
                          {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}
                        </span>
                        <span className="text-muted-foreground">{a.phone}</span>
                      </span>
                    </label>
                  ))}
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-sm border p-4 text-sm",
                      selectedSavedId === "new"
                        ? "border-foreground bg-muted"
                        : "border-input hover:border-fog",
                    )}
                  >
                    <input
                      type="radio"
                      name="savedAddress"
                      value="new"
                      checked={selectedSavedId === "new"}
                      onChange={() => setSelectedSavedId("new")}
                    />
                    New address
                  </label>
                </fieldset>
              ) : null}

              {!usingSaved ? (
                <AddressFields
                  idPrefix="ship"
                  values={address}
                  errors={errors}
                  onChange={patchAddress}
                  onPincodeComplete={(p) => void autofill(p, "shipping")}
                  pincodeHint={pincodeHint}
                />
              ) : null}

              {user && !usingSaved ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={saveAddress}
                    onChange={(e) => setSaveAddress(e.target.checked)}
                  />
                  Save this address to my account
                </label>
              ) : null}

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={billingSame}
                  onChange={(e) => setBillingSame(e.target.checked)}
                />
                Billing address is the same as delivery
              </label>
              {!billingSame ? (
                <div className="flex flex-col gap-3 border-l-2 border-border pl-4">
                  <h3 className="text-sm font-medium">Billing address</h3>
                  <AddressFields
                    idPrefix="bill"
                    values={billing}
                    errors={billingErrors}
                    onChange={(patch) => {
                      setBilling((b) => ({ ...b, ...patch }));
                      setBillingErrors({});
                    }}
                    onPincodeComplete={(p) => void autofill(p, "billing")}
                  />
                </div>
              ) : null}

              <div>
                <Button size="lg" onClick={continueToShipping} disabled={blocked.length > 0}>
                  Continue to shipping
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {activeAddress.fullName}, {activeAddress.line1}, {activeAddress.city}{" "}
              {activeAddress.pincode}. {email}.
            </p>
          )}
        </section>

        {/* Step 2: shipping */}
        <section aria-labelledby="step-shipping" className="flex flex-col gap-5">
          <StepHeading
            n={2}
            current={step}
            id="step-shipping"
            title="Shipping"
            done={step > 2}
            onEdit={() => setStep(2)}
          />
          {step === 2 ? (
            <div className="flex flex-col gap-5" aria-busy={quoting}>
              {quoting ? (
                <p className="text-sm text-muted-foreground">
                  Checking delivery to {activeAddress.pincode}…
                </p>
              ) : null}
              {quote?.status === "unserviceable" ? (
                <div className="flex flex-col items-start gap-3">
                  <FormMessage tone="error">{quote.message}</FormMessage>
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Change address
                  </Button>
                </div>
              ) : null}
              {quote?.status === "ok" ? (
                <>
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 text-sm text-muted-foreground">
                      Delivering to{" "}
                      {quote.city ? `${quote.city}, ${quote.state}` : activeAddress.pincode} (
                      {quote.zoneName}).
                    </legend>
                    {quote.options.map((o) => (
                      <label
                        key={o.rateId}
                        className={cn(
                          "flex cursor-pointer items-start justify-between gap-4 rounded-sm border p-4 text-sm transition-colors",
                          rateId === o.rateId
                            ? "border-foreground bg-muted"
                            : "border-input hover:border-fog",
                        )}
                      >
                        <span className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="shippingRate"
                            value={o.rateId}
                            className="mt-1"
                            checked={rateId === o.rateId}
                            onChange={() => setRateId(o.rateId)}
                          />
                          <span className="flex flex-col">
                            <span className="font-medium">{o.name}</span>
                            <span className="text-muted-foreground">
                              Arrives {o.deliveryWindow}
                            </span>
                            <span className="text-xs text-muted-foreground">{o.reason}</span>
                          </span>
                        </span>
                        <span className="font-medium num">
                          {o.shippingTotal === 0 ? "Free" : formatINR(o.shippingTotal)}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  {option && option.shippingTotal !== view.shippingTotal ? (
                    <p className="text-xs text-muted-foreground">
                      Your bag estimated{" "}
                      {view.shippingTotal === 0 ? "free shipping" : formatINR(view.shippingTotal)}{" "}
                      before we knew the pincode; {quote.zoneName} rates apply here.
                    </p>
                  ) : null}
                  <div>
                    <Button size="lg" onClick={continueToPayment} disabled={!option}>
                      Continue to payment
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          ) : step > 2 && option ? (
            <p className="text-sm text-muted-foreground">
              {option.name}, {option.shippingTotal === 0 ? "free" : formatINR(option.shippingTotal)}
              . Arrives {option.deliveryWindow}.
            </p>
          ) : null}
        </section>

        {/* Step 3: payment */}
        <section aria-labelledby="step-payment" className="flex flex-col gap-5">
          <StepHeading n={3} current={step} id="step-payment" title="Payment" done={false} />
          {step === 3 && quote?.status === "ok" && option ? (
            <div className="flex flex-col gap-5">
              <fieldset className="flex flex-col gap-2">
                <legend className="sr-only">Payment method</legend>
                {razorpayEnabled ? (
                  <PaymentChoice
                    checked={paymentMethod === "RAZORPAY"}
                    onChange={() => setPaymentMethod("RAZORPAY")}
                    title="Pay now"
                    detail="UPI, cards, net banking and wallets through Razorpay."
                    disabled={Boolean(held) && held?.paymentMethod !== "RAZORPAY"}
                  />
                ) : (
                  <p className="rounded-sm border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Online payment is not switched on in this environment. Cash on delivery is
                    available below.
                  </p>
                )}
                {quote.codAvailable ? (
                  <PaymentChoice
                    checked={paymentMethod === "COD"}
                    onChange={() => setPaymentMethod("COD")}
                    title="Cash on delivery"
                    detail="Pay the courier by cash or UPI at the door."
                    disabled={Boolean(held)}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{quote.codReason}</p>
                )}
              </fieldset>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="checkout-note" className="text-sm font-medium">
                  Note for us (optional)
                </label>
                <Textarea
                  id="checkout-note"
                  rows={2}
                  maxLength={500}
                  placeholder="Gate code, delivery hours, anything the courier should know."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              {formError ? <FormMessage tone="error">{formError}</FormMessage> : null}

              {!razorpayEnabled && !quote.codAvailable ? (
                <p className="text-sm text-alert-2">
                  No payment method is available for this order.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <Button
                    size="lg"
                    onClick={placeOrder}
                    disabled={placing || (!razorpayEnabled && paymentMethod === "RAZORPAY")}
                  >
                    {placing
                      ? "One moment…"
                      : held
                        ? `Retry payment ${formatINR(held.grandTotal)}`
                        : paymentMethod === "COD"
                          ? `Place order · ${formatINR(option.grandTotal)}`
                          : `Pay ${formatINR(option.grandTotal)}`}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    By placing the order you agree to our{" "}
                    <Link href="/pages/terms" className="underline underline-offset-4">
                      terms
                    </Link>{" "}
                    and{" "}
                    <Link href="/pages/returns" className="underline underline-offset-4">
                      returns policy
                    </Link>
                    . Prices include GST.
                  </p>
                </div>
              )}
            </div>
          ) : null}
          {step < 3 && formError ? <FormMessage tone="error">{formError}</FormMessage> : null}
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Order summary">
        <CheckoutSummary cart={view} option={step >= 2 ? option : null} />
      </aside>
    </div>
  );
}

function StepHeading({
  n,
  current,
  id,
  title,
  done,
  onEdit,
}: {
  n: Step;
  current: Step;
  id: string;
  title: string;
  done: boolean;
  onEdit?: () => void;
}) {
  const active = current === n;
  return (
    <div className="flex items-center justify-between border-b border-border pb-3">
      <h2
        id={id}
        className={cn(
          "flex items-center gap-3 text-lg",
          !active && !done && "text-muted-foreground",
        )}
      >
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-full text-xs font-medium num",
            done
              ? "bg-success text-moon"
              : active
                ? "bg-talon text-moon"
                : "bg-muted text-muted-foreground",
          )}
          aria-hidden
        >
          {done ? <Check className="size-4" /> : n}
        </span>
        {title}
      </h2>
      {done && onEdit ? (
        <Button variant="link" size="sm" onClick={onEdit}>
          Edit
        </Button>
      ) : null}
    </div>
  );
}

function PaymentChoice({
  checked,
  onChange,
  title,
  detail,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  detail: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-sm border p-4 text-sm transition-colors",
        checked ? "border-foreground bg-muted" : "border-input hover:border-fog",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <input
        type="radio"
        name="paymentMethod"
        className="mt-1"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="flex flex-col">
        <span className="font-medium">{title}</span>
        <span className="text-muted-foreground">{detail}</span>
      </span>
    </label>
  );
}
