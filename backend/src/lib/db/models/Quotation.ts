import { Schema, model, Document } from "mongoose";

export interface IQuotationItem {
  id: string;
  details: string;
  description: string;
  quantity: number;
  rate: number;
  tax: string;
}

export interface IQuotation extends Document {
  id: string;
  orgId: string;
  number: string;
  customerId: string;
  customerName: string;
  reference: string;
  quotationDate: Date;
  expiryDate: Date;
  items: IQuotationItem[];
  subTotal: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  termsAndConditions: string;
  notes: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const quotationItemSchema = new Schema<IQuotationItem>({
  id: { type: String, required: true },
  details: { type: String, default: "" },
  description: { type: String, default: "" },
  quantity: { type: Number, default: 1 },
  rate: { type: Number, default: 0 },
  tax: { type: String, default: "" },
}, { _id: false });

const quotationSchema = new Schema<IQuotation>(
  {
    id: { type: String, required: true, unique: true },
    orgId: { type: String, required: true, index: true },
    number: { type: String, required: true },
    customerId: { type: String, default: "" },
    customerName: { type: String, default: "" },
    reference: { type: String, default: "" },
    quotationDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, default: Date.now },
    items: { type: [quotationItemSchema], default: [] },
    subTotal: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    termsAndConditions: { type: String, default: "" },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected", "expired"],
      default: "draft",
      index: true,
    },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

quotationSchema.index({ orgId: 1, createdAt: -1 });
quotationSchema.index({ orgId: 1, status: 1 });

export const Quotation = model<IQuotation>("Quotation", quotationSchema);
