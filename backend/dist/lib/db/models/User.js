import { Schema, model } from "mongoose";
const userSchema = new Schema({
    id: { type: String, unique: true, sparse: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    emailVerified: { type: Boolean, default: false },
    image: String,
    password: String,
    status: { type: String, enum: ["online", "offline", "break"], default: "offline" },
    role: { type: String, enum: ["admin", "manager", "member"], default: "member" },
}, { timestamps: true });
export const User = model("User", userSchema);
