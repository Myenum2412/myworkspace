import { Schema, model, Document } from "mongoose";

export interface IRecoveryCode extends Document {
  userId: string;
  codeHash: string;
  usedAt?: Date;
  used: boolean;
  createdAt: Date;
}

const recoveryCodeSchema = new Schema<IRecoveryCode>({
  userId: { type: String, required: true, index: true },
  codeHash: { type: String, required: true },
  usedAt: { type: Date },
  used: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now },
});

recoveryCodeSchema.index({ userId: 1, used: 1 });
recoveryCodeSchema.index({ userId: 1, codeHash: 1 });

export const RecoveryCode = model<IRecoveryCode>("RecoveryCode", recoveryCodeSchema);
