import { Schema, model } from "mongoose";
const notificationSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
        type: String,
        enum: ["task_assigned", "task_updated", "mention", "invite", "system", "comment", "status_change"],
        required: true,
    },
    title: { type: String, required: true },
    message: String,
    read: { type: Boolean, default: false },
    link: String,
    metadata: String,
    createdAt: { type: Date, default: Date.now },
});
export const Notification = model("Notification", notificationSchema);
