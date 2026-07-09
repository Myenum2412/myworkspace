import { Schema, model, Document } from "mongoose";

export interface IMessage extends Document {
  orgId: string;
  senderId: string;
  createdBy: string;
  teamId?: string;
  conversationId: string;
  content: string;
  messageType: "text" | "system" | "file";
  replyTo?: string;
  readBy: { userId: string; readAt: Date }[];
  editedAt?: Date;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>({
  orgId: { type: String, required: true, index: true },
  senderId: { type: String, required: true },
  createdBy: { type: String, required: true },
  teamId: { type: String },
  conversationId: { type: String, required: true, index: true },
  content: { type: String, required: true },
  messageType: { type: String, enum: ["text", "system", "file"], default: "text" },
  replyTo: { type: String },
  readBy: { type: [{ userId: String, readAt: Date }], default: [] },
  editedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ orgId: 1, conversationId: 1 });

export const Message = model<IMessage>("Message", messageSchema);
