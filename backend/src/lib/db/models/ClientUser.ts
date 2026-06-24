import { Schema, model, Document } from "mongoose";

export interface IClientUser extends Document {
  id: string;
  orgId: string;
  clientId: string;
  username: string;
  email: string;
  password: string;
  name: string;
  isActive: boolean;
  emailVerified: boolean;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  lastLogin?: Date;
  createdByAdminId: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const clientUserSchema = new Schema<IClientUser>(
  {
    id: { type: String, required: true, unique: true },
    orgId: { type: String, required: true, index: true },
    clientId: { type: String, required: true, index: true },
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    mustChangePassword: { type: Boolean, default: true },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: Date,
    lastLogin: Date,
    createdByAdminId: { type: String, required: true },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

export const ClientUser = model<IClientUser>("ClientUser", clientUserSchema);
