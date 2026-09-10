"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cancelOrderAction } from "@/app/(storefront)/account/orders/[id]/actions";
import { FormMessage } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";

const REASONS = [
  "Ordered the wrong size",
  "Found it cheaper elsewhere",
  "Delivery would take too long",
  "Ordered by mistake",
  "Other",
];

export function CancelOrderButton({
  orderId,
  orderNumber,
  prepaid,
}: {
  orderId: string;
  orderNumber: string;
  prepaid: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]!);
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const text =
        reason === "Other" ? detail.trim() : detail.trim() ? `${reason}. ${detail.trim()}` : reason;
      const result = await cancelOrderAction({ orderId, reason: text });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDone(result.message);
      setOpen(false);
      router.refresh();
    });
  }

  if (done) return <FormMessage tone="success">{done}</FormMessage>;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Cancel order
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={`Cancel ${orderNumber}?`}
        description={
          prepaid
            ? "Stock goes back on the shelf and your refund is queued to the original payment method."
            : "Stock goes back on the shelf. Nothing was charged."
        }
      >
        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Why are you cancelling?</legend>
            {REASONS.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="cancel-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                />
                {r}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cancel-detail" className="text-sm font-medium">
              {reason === "Other" ? "Tell us why" : "Anything to add? (optional)"}
            </label>
            <Textarea
              id="cancel-detail"
              rows={2}
              maxLength={300}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
          </div>
          {error ? <FormMessage tone="error">{error}</FormMessage> : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Keep order
            </Button>
            <Button
              variant="destructive"
              onClick={submit}
              disabled={pending || (reason === "Other" && detail.trim().length < 3)}
            >
              {pending ? "Cancelling" : "Cancel order"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
