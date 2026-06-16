import { Schema, model, Document, Types } from "mongoose";

export interface IMessage extends Document {
  orgId: Types.ObjectId;
  senderId: Types.ObjectId;
  teamId?: Types.ObjectId;
  content: string;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>({
  orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  teamId: { type: Schema.Types.ObjectId, ref: "Team" },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Message = model<IMessage>("Message", messageSchema);
