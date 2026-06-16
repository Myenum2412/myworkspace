import { Schema, model, Document, Types } from "mongoose";

export interface ISession extends Document {
  userId: Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

const sessionSchema = new Schema<ISession>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Session = model<ISession>("Session", sessionSchema);
