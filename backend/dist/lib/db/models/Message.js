import { Schema, model } from "mongoose";
const messageSchema = new Schema({
    orgId: { type: String, required: true },
    senderId: { type: String, required: true },
    createdBy: { type: String, required: true },
    teamId: { type: String },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});
export const Message = model("Message", messageSchema);
