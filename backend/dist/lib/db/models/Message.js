import { Schema, model } from "mongoose";
const messageSchema = new Schema({
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team" },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});
export const Message = model("Message", messageSchema);
