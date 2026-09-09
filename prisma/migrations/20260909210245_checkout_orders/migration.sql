-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cartId" TEXT,
ADD COLUMN     "cgstTotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "estimatedDeliveryFrom" TIMESTAMP(3),
ADD COLUMN     "estimatedDeliveryTo" TIMESTAMP(3),
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "igstTotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "invoiceKey" TEXT,
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "invoicedAt" TIMESTAMP(3),
ADD COLUMN     "isInterState" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentMethod" "PaymentProvider",
ADD COLUMN     "placeOfSupply" TEXT,
ADD COLUMN     "reviewReason" TEXT,
ADD COLUMN     "sgstTotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shippingRateId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "discount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookEvent_event_createdAt_idx" ON "WebhookEvent"("event", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_invoiceNumber_key" ON "Order"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Order_expiresAt_status_paymentStatus_idx" ON "Order"("expiresAt", "status", "paymentStatus");

-- CreateIndex
CREATE INDEX "Order_needsReview_idx" ON "Order"("needsReview");


-- Invoice numbers: OWL-INV-<year>-<six digits>. Consumed by lib/invoices.
CREATE SEQUENCE "invoice_number_seq" AS BIGINT START WITH 1 INCREMENT BY 1;
