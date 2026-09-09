/** Plain data for order emails: rendered from snapshots, never from live products. */
export type OrderEmailItem = {
  name: string;
  size: string;
  color: string;
  qty: number;
  /** Line net after discount, in paise. */
  net: number;
};

export type OrderEmailData = {
  orderNumber: string;
  customerName: string;
  email: string;
  items: OrderEmailItem[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  paymentMethod: "RAZORPAY" | "COD";
  couponCode: string | null;
  shippingAddress: {
    fullName: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  deliveryWindow: string | null;
  orderUrl: string;
  siteUrl: string;
};

export type ShipmentEmailData = OrderEmailData & {
  courier: string;
  awb: string;
  trackingUrl: string | null;
};

export type RefundEmailData = OrderEmailData & {
  refundAmount: number;
  refundReason: string;
};

export type ReviewEmailData = OrderEmailData & {
  reason: string;
};
