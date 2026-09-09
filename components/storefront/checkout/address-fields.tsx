"use client";

import { Field } from "@/components/forms/field";
import { Label } from "@/components/ui/label";
import { INDIAN_STATES } from "@/lib/india";
import { cn } from "@/lib/utils";

export type AddressFormValues = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  type: "HOME" | "WORK";
};

export const emptyAddress: AddressFormValues = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  type: "HOME",
};

const selectClass =
  "h-10 w-full min-w-0 rounded-sm border border-input bg-transparent px-3 py-2 text-base text-foreground transition-colors outline-none hover:border-fog focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring aria-invalid:border-destructive md:text-sm";

export function AddressFields({
  idPrefix,
  values,
  errors,
  onChange,
  onPincodeComplete,
  pincodeHint,
  disabled,
}: {
  idPrefix: string;
  values: AddressFormValues;
  errors: Partial<Record<keyof AddressFormValues, string>>;
  onChange: (patch: Partial<AddressFormValues>) => void;
  onPincodeComplete?: (pincode: string) => void;
  pincodeHint?: string;
  disabled?: boolean;
}) {
  const id = (name: keyof AddressFormValues) => `${idPrefix}-${name}`;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        id={id("fullName")}
        name="fullName"
        label="Full name"
        autoComplete="name"
        value={values.fullName}
        error={errors.fullName}
        disabled={disabled}
        onChange={(e) => onChange({ fullName: e.target.value })}
      />
      <Field
        id={id("phone")}
        name="phone"
        label="Mobile number"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        hint="10 digits, for delivery updates."
        value={values.phone}
        error={errors.phone}
        disabled={disabled}
        onChange={(e) => onChange({ phone: e.target.value })}
      />
      <Field
        id={id("pincode")}
        name="pincode"
        label="Pincode"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={6}
        hint={pincodeHint ?? "City and state fill in from the pincode."}
        value={values.pincode}
        error={errors.pincode}
        disabled={disabled}
        onChange={(e) => {
          const pincode = e.target.value.replace(/\D/g, "").slice(0, 6);
          onChange({ pincode });
          if (pincode.length === 6) onPincodeComplete?.(pincode);
        }}
      />
      <Field
        id={id("city")}
        name="city"
        label="City"
        autoComplete="address-level2"
        value={values.city}
        error={errors.city}
        disabled={disabled}
        onChange={(e) => onChange({ city: e.target.value })}
      />
      <Field
        id={id("line1")}
        name="line1"
        label="Flat, building, street"
        autoComplete="address-line1"
        className="sm:col-span-2"
        value={values.line1}
        error={errors.line1}
        disabled={disabled}
        onChange={(e) => onChange({ line1: e.target.value })}
      />
      <Field
        id={id("line2")}
        name="line2"
        label="Area, locality (optional)"
        autoComplete="address-line2"
        value={values.line2}
        error={errors.line2}
        disabled={disabled}
        onChange={(e) => onChange({ line2: e.target.value })}
      />
      <Field
        id={id("landmark")}
        name="landmark"
        label="Landmark (optional)"
        value={values.landmark}
        error={errors.landmark}
        disabled={disabled}
        onChange={(e) => onChange({ landmark: e.target.value })}
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("state")}>State</Label>
        <select
          id={id("state")}
          name="state"
          autoComplete="address-level1"
          className={cn(selectClass)}
          value={values.state}
          disabled={disabled}
          aria-invalid={errors.state ? true : undefined}
          aria-describedby={errors.state ? `${id("state")}-error` : undefined}
          onChange={(e) => onChange({ state: e.target.value })}
        >
          <option value="">Choose a state</option>
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {errors.state ? (
          <p id={`${id("state")}-error`} className="text-sm text-alert-2">
            {errors.state}
          </p>
        ) : null}
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Address type</legend>
        <div className="flex gap-2">
          {(["HOME", "WORK"] as const).map((type) => (
            <label
              key={type}
              className={cn(
                "flex h-10 flex-1 cursor-pointer items-center justify-center rounded-sm border text-sm transition-colors",
                values.type === type
                  ? "border-foreground bg-muted"
                  : "border-input hover:border-fog",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              <input
                type="radio"
                name={`${idPrefix}-type`}
                value={type}
                className="sr-only"
                checked={values.type === type}
                disabled={disabled}
                onChange={() => onChange({ type })}
              />
              {type === "HOME" ? "Home" : "Work"}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
