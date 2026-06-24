import { Schema, model } from "mongoose";
const taskSchema = new Schema({
    orgId: { type: String, required: true },
    teamId: { type: String },
    assigneeId: { type: String },
    creatorId: { type: String, required: true },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
    title: { type: String, required: true },
    description: String,
    project: String,
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
