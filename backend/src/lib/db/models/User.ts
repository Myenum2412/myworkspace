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
  role: "org_admin" | "members" | "staffs" | "team_staff" | "hr" | "clients";
  permissions: string[];
  isActive: boolean;
  lastLogin?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  tokenVersion: number;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorPendingSecret?: string;
  twoFactorEnabledAt?: Date;
  twoFactorLastVerifiedAt?: Date;
  twoFactorMethod: "totp" | "none";
  backupCodesGeneratedAt?: Date;
  phone?: string;
  secondaryPhone?: string;
  department?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  website?: string;
  bannerUrl?: string;
  resetToken?: string;
  resetTokenExpires?: Date;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  createdBy: string;
  updatedBy?: string;
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
    role: { type: String, enum: ["org_admin", "members", "staffs", "team_staff", "hr", "clients"], default: "staffs" },
    permissions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
    tokenVersion: { type: Number, default: 0 },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: Date,
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: String,
    twoFactorPendingSecret: String,
    twoFactorEnabledAt: Date,
    twoFactorLastVerifiedAt: Date,
    twoFactorMethod: { type: String, enum: ["totp", "none"], default: "none" },
    backupCodesGeneratedAt: Date,
    phone: String,
    secondaryPhone: String,
    department: String,
    company: String,
    address: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
    linkedin: String,
    github: String,
    twitter: String,
    website: String,
    bannerUrl: String,
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
    resetToken: { type: String, index: true },
    resetTokenExpires: Date,
    emailVerificationToken: { type: String, index: true },
    emailVerificationExpires: Date,
  },
  { timestamps: true }
);

userSchema.index({ status: 1 });
userSchema.index({ role: 1 });
userSchema.index({ name: "text", email: "text" });

export const User = model<IUser>("User", userSchema);
