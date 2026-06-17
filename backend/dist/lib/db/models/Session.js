import { Schema, model } from "mongoose";
const sessionSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
});
export const Session = model("Session", sessionSchema);
