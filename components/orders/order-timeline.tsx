import { Check } from "lucide-react";

import { SHIPMENT_STATUS_LABEL } from "@/lib/orders/status";
import type { Timeline } from "@/lib/orders/status";
import { cn } from "@/lib/utils";

/**
 * Confirmed → Packed → Shipped → Out for delivery → Delivered, with the
 * courier block once a shipment exists. Server component, no client state,
 * so the admin order page can render the same thing.
 */

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export type TimelineShipment = {
  courier: string;
  awb: string;
  trackingUrl: string | null;
  status?: string | null;
};

export function OrderTimeline({
  timeline,
  shipment,
  orientation = "vertical",
  className,
}: {
  timeline: Timeline;
  shipment?: TimelineShipment | null;
  orientation?: "vertical" | "horizontal";
  className?: string;
}) {
  const horizontal = orientation === "horizontal";
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <ol
        className={cn("flex", horizontal ? "flex-row items-start gap-0" : "flex-col gap-0")}
        aria-label="Order progress"
      >
        {timeline.steps.map((step, i) => {
          const last = i === timeline.steps.length - 1;
          const done = step.state === "done";
          const current = step.state === "current";
          return (
            <li
              key={step.key}
              className={cn(
                "relative flex",
                horizontal ? "flex-1 flex-col items-center text-center" : "gap-4 pb-6 last:pb-0",
              )}
              aria-current={current ? "step" : undefined}
            >
              {!last ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute bg-border",
                    horizontal ? "top-3 left-1/2 h-px w-full" : "top-6 left-3 h-full w-px",
                    done && "bg-talon",
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium num",
                  done && "border-talon bg-talon text-ink",
                  current && "border-talon bg-ink text-talon",
                  step.state === "upcoming" && "border-border bg-transparent text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span className={cn("flex flex-col", horizontal ? "mt-2 items-center px-1" : "")}>
                <span
                  className={cn(
                    "text-sm",
                    step.state === "upcoming" ? "text-muted-foreground" : "font-medium",
                  )}
                >
                  {step.label}
                </span>
                {step.at ? (
                  <time dateTime={step.at} className="text-xs text-muted-foreground num">
                    {DATE.format(new Date(step.at))}
                  </time>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>

      {timeline.terminal ? (
        <p className="border-l-2 border-alert pl-3 text-sm">
          <span className="font-medium">{timeline.terminal.label}</span>
          {timeline.terminal.at ? (
            <>
              {" "}
              <time dateTime={timeline.terminal.at} className="text-muted-foreground num">
                {DATE.format(new Date(timeline.terminal.at))}
              </time>
            </>
          ) : null}
        </p>
      ) : null}

      {shipment ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border border-border bg-slate p-4 text-sm">
          <dt className="text-muted-foreground">Courier</dt>
          <dd>{shipment.courier}</dd>
          <dt className="text-muted-foreground">Tracking no.</dt>
          <dd className="num">
            {shipment.trackingUrl ? (
              <a
                href={shipment.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4 hover:text-primary"
              >
                {shipment.awb}
              </a>
            ) : (
              shipment.awb
            )}
          </dd>
          {shipment.status ? (
            <>
              <dt className="text-muted-foreground">Courier status</dt>
              <dd>
                {SHIPMENT_STATUS_LABEL[shipment.status as keyof typeof SHIPMENT_STATUS_LABEL] ??
                  shipment.status}
              </dd>
            </>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}
