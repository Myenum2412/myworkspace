import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
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
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    id: { type: String, unique: true, sparse: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    emailVerified: { type: Boolean, default: false },
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
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
