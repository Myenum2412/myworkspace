import mongoose, { Schema, model } from "mongoose";

const favoriteSchema = new Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  fileId: { type: String, required: true },
  folderId: { type: String, default: null },
  orgId: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

favoriteSchema.index({ userId: 1, fileId: 1 }, { unique: true, sparse: true });
favoriteSchema.index({ userId: 1, folderId: 1 }, { unique: true, sparse: true });

export const Favorite = mongoose.models.Favorite || model("Favorite", favoriteSchema, "favorites");
