import { Schema, model } from "mongoose";
const taskSchema = new Schema({
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team" },
    assigneeId: { type: Schema.Types.ObjectId, ref: "User" },
    creatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: String,
    status: {
        type: String,
        enum: ["todo", "in_progress", "review", "done", "cancelled"],
        default: "todo",
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high", "urgent"],
        default: "medium",
    },
    dueDate: Date,
}, { timestamps: true });
export const Task = model("Task", taskSchema);
