import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string;
  password?: string;
  status: "online" | "offline" | "break";
  role: "admin" | "manager" | "member";
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    emailVerified: { type: Boolean, default: false },
    image: String,
    password: String,
    status: { type: String, enum: ["online", "offline", "break"], default: "offline" },
    role: { type: String, enum: ["admin", "manager", "member"], default: "member" },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
