import { Schema, model, Document } from "mongoose";

export interface IPendingSignup extends Document {
  email: string;
  name: string;
  company?: string;
  otp: string;
  otpExpires: Date;
  plan?: string;
  createdAt: Date;
}

const PendingSignupSchema = new Schema<IPendingSignup>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    company: { type: String },
    otp: { type: String, required: true },
    otpExpires: { type: Date, required: true },
    plan: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PendingSignupSchema.index({ otpExpires: 1 }, { expireAfterSeconds: 0 });

export const PendingSignup = model<IPendingSignup>("PendingSignup", PendingSignupSchema);
