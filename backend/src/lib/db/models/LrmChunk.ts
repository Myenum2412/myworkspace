import { Schema, model, Document } from "mongoose";

export interface ILrmChunk extends Document {
  id: string;
  documentId: string;
  orgId: string;
  content: string;
  embedding: number[] | null;
  metadata: {
    source: string;
    page?: number;
    chunkIndex: number;
    totalChunks: number;
    tokens: number;
  };
  createdAt: Date;
}

const lrmChunkSchema = new Schema<ILrmChunk>(
  {
    id: { type: String, required: true, unique: true },
    documentId: { type: String, required: true, index: true },
    orgId: { type: String, required: true, index: true },
    content: { type: String, required: true },
    embedding: { type: [Number], default: null },
    metadata: {
      source: { type: String, required: true },
      page: { type: Number },
      chunkIndex: { type: Number, required: true },
      totalChunks: { type: Number, required: true },
      tokens: { type: Number, required: true },
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "lrm_chunks" }
);

lrmChunkSchema.index({ orgId: 1, documentId: 1 });
lrmChunkSchema.index({ source: "text", content: "text" });

export const LrmChunk = model<ILrmChunk>("LrmChunk", lrmChunkSchema);
