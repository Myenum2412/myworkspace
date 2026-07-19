import { Schema, model, Document } from "mongoose";

export interface IFileMetadata extends Document {
  fileId: string;
  orgId: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  bitrate: number | null;
  frameRate: number | null;
  codec: string | null;
  colorProfile: string | null;
  dpi: number | null;
  cameraMake: string | null;
  cameraModel: string | null;
  iso: number | null;
  aperture: string | null;
  focalLength: number | null;
  exposureTime: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  gpsAltitude: number | null;
  encoding: string | null;
  audioCodec: string | null;
  audioBitrate: number | null;
  audioSampleRate: number | null;
  audioChannels: number | null;
  pageCount: number | null;
  pageWidth: number | null;
  pageHeight: number | null;
  hasText: boolean | null;
  isEncrypted: boolean | null;
  isSearchable: boolean | null;
  documentTitle: string | null;
  documentAuthor: string | null;
  documentSubject: string | null;
  documentCreator: string | null;
  compressionMethod: string | null;
  fileCount: number | null;
  totalUncompressedSize: number | null;
  extra: Record<string, unknown>;
  extractedAt: Date | null;
}

const fileMetadataSchema = new Schema<IFileMetadata>(
  {
    fileId: { type: String, required: true, unique: true },
    orgId: { type: String, required: true, index: true },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    duration: { type: Number, default: null },
    bitrate: { type: Number, default: null },
    frameRate: { type: Number, default: null },
    codec: { type: String, default: null },
    colorProfile: { type: String, default: null },
    dpi: { type: Number, default: null },
    cameraMake: { type: String, default: null },
    cameraModel: { type: String, default: null },
    iso: { type: Number, default: null },
    aperture: { type: String, default: null },
    focalLength: { type: Number, default: null },
    exposureTime: { type: String, default: null },
    gpsLatitude: { type: Number, default: null },
    gpsLongitude: { type: Number, default: null },
    gpsAltitude: { type: Number, default: null },
    encoding: { type: String, default: null },
    audioCodec: { type: String, default: null },
    audioBitrate: { type: Number, default: null },
    audioSampleRate: { type: Number, default: null },
    audioChannels: { type: Number, default: null },
    pageCount: { type: Number, default: null },
    pageWidth: { type: Number, default: null },
    pageHeight: { type: Number, default: null },
    hasText: { type: Boolean, default: null },
    isEncrypted: { type: Boolean, default: null },
    isSearchable: { type: Boolean, default: null },
    documentTitle: { type: String, default: null },
    documentAuthor: { type: String, default: null },
    documentSubject: { type: String, default: null },
    documentCreator: { type: String, default: null },
    compressionMethod: { type: String, default: null },
    fileCount: { type: Number, default: null },
    totalUncompressedSize: { type: Number, default: null },
    extra: { type: Schema.Types.Mixed, default: {} },
    extractedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "file_metadata" },
);

// fileId has unique:true index already; orgId has index:true in schema
// fileMetadataSchema.index({ fileId: 1 });
// fileMetadataSchema.index({ orgId: 1 });

export const FileMetadata = model<IFileMetadata>("FileMetadata", fileMetadataSchema);
