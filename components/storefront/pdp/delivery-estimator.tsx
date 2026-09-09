"use client";

import { useEffect, useState, useTransition } from "react";

import {
  getDeliveryEstimate,
  type DeliveryEstimate,
} from "@/app/(storefront)/products/[slug]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatINR } from "@/lib/money";

const STORAGE_KEY = "owlyn:pincode";

/** Pincode check with the last pincode remembered on this device. */
export function DeliveryEstimator({ unitPrice }: { unitPrice: number }) {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState<DeliveryEstimate | null>(null);
  const [pending, startTransition] = useTransition();

  const check = (value: string) => {
    startTransition(async () => {
      const estimate = await getDeliveryEstimate({ pincode: value, unitPrice });
      setResult(estimate);
      if (estimate.status === "ok") {
        try {
          localStorage.setItem(STORAGE_KEY, value);
        } catch {
          // storage is optional
        }
      }
    });
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && /^[1-9]\d{5}$/.test(stored)) {
        setPincode(stored);
        check(stored);
      }
    } catch {
      // storage is optional
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          check(pincode);
        }}
        className="flex gap-2"
      >
        <Label htmlFor="pdp-pincode" className="sr-only">
          Pincode
        </Label>
        <Input
          id="pdp-pincode"
          name="pincode"
          inputMode="numeric"
          maxLength={6}
          placeholder="Pincode for delivery estimate"
          value={pincode}
          onChange={(event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          aria-invalid={result?.status === "error" ? true : undefined}
          className="max-w-56"
        />
        <Button type="submit" variant="outline" disabled={pending || pincode.length !== 6}>
          {pending ? "Checking" : "Check"}
        </Button>
      </form>

      {result?.status === "ok" ? (
        <div className="flex flex-col gap-1 text-sm" aria-live="polite">
          <p className="font-medium">
            Delivers to {result.place} {result.pincode}
          </p>
          <ul className="flex flex-col gap-0.5 text-muted-foreground">
            {result.options.map((o) => (
              <li key={o.name} className="num">
                {o.name}: {o.window},{" "}
                {o.charge === 0 ? (
                  <span className="text-success">free</span>
                ) : (
                  <>
                    {formatINR(o.charge)}
                    {o.freeAbove ? ` (free over ${formatINR(o.freeAbove)})` : ""}
                  </>
                )}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            {result.cod ? "Cash on delivery available." : "Prepaid only for this pincode."}
            {result.afterCutoff ? " Orders after 2 pm dispatch the next working day." : ""}
          </p>
        </div>
      ) : null}
      {result?.status === "unserviceable" || result?.status === "error" ? (
        <p className="text-sm text-alert-2" role="alert">
          {result.message}
        </p>
      ) : null}
    </div>
  );
}
