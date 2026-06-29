import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";

export interface IUser extends Document {
  id: string;
  userNumber: number;
  name: string;
  email: string;
  emailVerified: boolean;
  orgId: string;
  image?: string;
  password?: string;
  status: "online" | "offline" | "break";
  role: "admin" | "manager" | "member" | "ORG_MENU_ADMIN";
  permissions: string[];
  isActive: boolean;
  lastLogin?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  phone?: string;
  department?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  bannerUrl?: string;
  resetToken?: string;
  resetTokenExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    id: { type: String, required: true, unique: true, default: () => uuid() },
    userNumber: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    emailVerified: { type: Boolean, default: false },
    orgId: { type: String, required: true, index: true },
    image: String,
    password: String,
    status: { type: String, enum: ["online", "offline", "break"], default: "offline" },
    role: { type: String, enum: ["admin", "manager", "member", "ORG_MENU_ADMIN"], default: "member" },
    permissions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: Date,
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: String,
    phone: String,
    department: String,
    company: String,
    address: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
    bannerUrl: String,
    resetToken: { type: String, index: true },
    resetTokenExpires: Date,
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
