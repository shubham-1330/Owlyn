"use client";

import { useState } from "react";

import { useCart } from "@/components/storefront/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CouponForm({ idPrefix = "coupon" }: { idPrefix?: string }) {
  const cart = useCart();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const applied = cart.view.coupon;

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 text-sm" aria-live="polite">
        <p>
          <span className="font-medium num">{applied.code}</span> applied
          {applied.description ? (
            <span className="text-muted-foreground">: {applied.description}</span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={cart.removeCoupon}
          className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (!code.trim()) {
          setError("Enter a code.");
          return;
        }
        setBusy(true);
        const result = await cart.applyCoupon(code);
        setBusy(false);
        setError(result);
        if (!result) setCode("");
      }}
      className="flex flex-col gap-2"
    >
      <Label htmlFor={`${idPrefix}-code`} className="sr-only">
        Coupon code
      </Label>
      <div className="flex gap-2">
        <Input
          id={`${idPrefix}-code`}
          name="code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="Coupon code"
          autoComplete="off"
          autoCapitalize="characters"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${idPrefix}-error` : undefined}
          className="num"
        />
        <Button type="submit" variant="outline" disabled={busy} className="shrink-0">
          {busy ? "Checking" : "Apply"}
        </Button>
      </div>
      {error ? (
        <p id={`${idPrefix}-error`} className="text-sm text-alert-2" role="alert">
          {error}
        </p>
      ) : cart.view.couponError ? (
        <p className="text-sm text-alert-2" role="alert">
          {cart.view.couponError}
        </p>
      ) : null}
    </form>
  );
}
