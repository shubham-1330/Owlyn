import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = React.ComponentProps<typeof Input> & {
  label: string;
  name: string;
  error?: string;
  hint?: string;
};

/** Label + input + inline error, wired with aria attributes. */
export function Field({ label, name, error, hint, className, id, ...props }: FieldProps) {
  const inputId = id ?? name;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-alert-2">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Form-level message. `tone` picks the colour; role="alert" announces errors. */
export function FormMessage({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn("text-sm", tone === "error" ? "text-alert-2" : "text-success")}
    >
      {children}
    </p>
  );
}
