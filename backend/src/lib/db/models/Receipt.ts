import { Schema, model, Document } from "mongoose";

export const RECEIPT_STATUSES = ["paid", "refunded", "pending", "failed", "cancelled"] as const;
export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];

export interface IReceipt extends Document {
  orgId: string;
  receiptNumber: string;
  invoiceId?: string;
  invoiceNumber?: string;
  customerName: string;
  customerEmail?: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: ReceiptStatus;
  notes?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const receiptSchema = new Schema<IReceipt>(
  {
    orgId: { type: String, required: true, index: true },
    receiptNumber: { type: String, required: true },
    invoiceId: String,
    invoiceNumber: String,
    customerName: { type: String, required: true },
    customerEmail: String,
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    paymentMethod: { type: String, default: "Bank Transfer" },
    status: {
      type: String,
      enum: RECEIPT_STATUSES,
      default: "paid",
    },
    notes: String,
    paidAt: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  }
);

receiptSchema.index({ orgId: 1, createdAt: -1 });
receiptSchema.index({ receiptNumber: 1, orgId: 1 }, { unique: true });

export const Receipt = model<IReceipt>("Receipt", receiptSchema);
