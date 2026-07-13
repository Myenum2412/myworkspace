import { Schema, model, Document } from "mongoose";

export interface IInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  tax: string;
}

export interface IInvoice extends Document {
  id: string;
  orgId: string;
  number: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  amountPaid: number;
  currency: string;
  status: "open" | "paid" | "void" | "uncollectible";
  pdfUrl: string;
  hostedUrl: string;
  periodStart: Date;
  periodEnd: Date;
  items: IInvoiceItem[];
  subTotal: number;
  discountPercent: number;
  discountAmount: number;
  tdsTcsType: string;
  tdsTcsRate: string;
  tdsTcsAmount: number;
  adjustmentValue: number;
  total: number;
  isSimplifiedView: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema<IInvoiceItem>({
  id: { type: String, required: true },
  description: { type: String, default: "" },
  quantity: { type: Number, default: 1 },
  rate: { type: Number, default: 0 },
  tax: { type: String, default: "" },
}, { _id: false });

const invoiceSchema = new Schema<IInvoice>(
  {
    id: { type: String, required: true, unique: true },
    orgId: { type: String, required: true, index: true },
    number: { type: String, required: true },
    customerId: { type: String, default: "" },
    customerName: { type: String, default: "" },
    customerEmail: { type: String, default: "" },
    amountPaid: { type: Number, default: 0 },
    currency: { type: String, default: "inr" },
    status: {
      type: String,
      enum: ["open", "paid", "void", "uncollectible"],
      default: "open",
      index: true,
    },
    pdfUrl: { type: String, default: "" },
    hostedUrl: { type: String, default: "" },
    periodStart: { type: Date, default: Date.now },
    periodEnd: { type: Date, default: Date.now },
    items: { type: [invoiceItemSchema], default: [] },
    subTotal: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    tdsTcsType: { type: String, default: "" },
    tdsTcsRate: { type: String, default: "0" },
    tdsTcsAmount: { type: Number, default: 0 },
    adjustmentValue: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    isSimplifiedView: { type: Boolean, default: true },
  },
  { timestamps: true }
);

invoiceSchema.index({ orgId: 1, createdAt: -1 });
invoiceSchema.index({ orgId: 1, status: 1 });

export const Invoice = model<IInvoice>("Invoice", invoiceSchema);
