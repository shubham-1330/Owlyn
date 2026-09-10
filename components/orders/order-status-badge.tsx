import type { OrderStatus, PaymentStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
} from "@/lib/orders/status";

/**
 * Status chips shared by the account area and the admin. They render from
 * the status alone, so either side can drop them into a table or a header.
 */

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus | string;
  className?: string;
}) {
  const key = status as OrderStatus;
  return (
    <Badge variant={ORDER_STATUS_TONE[key] ?? "muted"} className={className}>
      {ORDER_STATUS_LABEL[key] ?? status}
    </Badge>
  );
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus | string;
  className?: string;
}) {
  const key = status as PaymentStatus;
  return (
    <Badge variant={PAYMENT_STATUS_TONE[key] ?? "muted"} className={className}>
      {PAYMENT_STATUS_LABEL[key] ?? status}
    </Badge>
  );
}
