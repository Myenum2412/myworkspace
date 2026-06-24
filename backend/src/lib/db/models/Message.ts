import { Schema, model, Document } from "mongoose";

export interface IMessage extends Document {
  orgId: string;
  senderId: string;
  createdBy: string;
  teamId?: string;
  content: string;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>({
  orgId: { type: String, required: true },
  senderId: { type: String, required: true },
  createdBy: { type: String, required: true },
  teamId: { type: String },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Message = model<IMessage>("Message", messageSchema);
