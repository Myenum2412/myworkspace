import sharp from "sharp";
import { execSync } from "child_process";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { FileMetadata } from "../lib/db/models/FileMetadata.js";
import { getStorageProvider } from "../lib/storage/providers.js";
import { logger } from "../lib/logger/index.js";

function hasFfmpeg(): boolean {
  try { execSync("which ffmpeg", { stdio: "ignore" }); return true; }
  catch { return false; }
}

async function getFileBuffer(fileId: string, storagePath: string): Promise<Buffer | null> {
  const provider = getStorageProvider();
  return provider.get(storagePath);
}

function parseFfprobe(filePath: string): Record<string, any> {
  try {
    const output = execSync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`,
      { stdio: "pipe", timeout: 15000, maxBuffer: 1024 * 1024 },
    );
    return JSON.parse(output.toString());
  } catch {
    return {};
  }
}

export async function extractFileMetadata(
  fileId: string,
  orgId: string,
  providedBuffer?: Buffer,
  mimeType?: string,
): Promise<void> {
  try {
    const file = await FileAttachment.findOne({ id: fileId }).lean();
    if (!file) return;

    const mt = mimeType || file.mimeType;
    const metadata: Record<string, any> = { fileId, orgId, extractedAt: new Date() };

    if (mt.startsWith("image/")) {
      const buffer = providedBuffer || await getFileBuffer(fileId, file.storagePath);
      if (buffer) {
        try {
          const { default: exifr } = await import("exifr");
          const exifData = await exifr.parse(buffer, {
            tiff: true, exif: true, gps: true, xmp: false, iptc: false,
            interop: true, jfif: true,
          });
          if (exifData) {
            if (exifData.Make) metadata.cameraMake = String(exifData.Make);
            if (exifData.Model) metadata.cameraModel = String(exifData.Model);
            if (exifData.ISOSpeedRatings) metadata.iso = Number(exifData.ISOSpeedRatings);
            if (exifData.FNumber) metadata.aperture = String(exifData.FNumber);
            if (exifData.FocalLength) metadata.focalLength = Number(exifData.FocalLength);
            if (exifData.ExposureTime) metadata.exposureTime = String(exifData.ExposureTime);
            if (exifData.latitude !== undefined && exifData.latitude !== null) {
              metadata.gpsLatitude = Number(exifData.latitude);
            }
            if (exifData.longitude !== undefined && exifData.longitude !== null) {
              metadata.gpsLongitude = Number(exifData.longitude);
            }
            if (exifData.GPSAltitude) metadata.gpsAltitude = Number(exifData.GPSAltitude);
            if (exifData.Orientation) metadata.extra = { ...metadata.extra, orientation: Number(exifData.Orientation) };
          }
        } catch { /* exifr parse failed - non-critical */ }

      try {
        const img = sharp(buffer);
        const meta = await img.metadata();
        metadata.width = meta.width || null;
        metadata.height = meta.height || null;
        metadata.dpi = (meta as any).dpi || null;
        metadata.colorProfile = meta.icc ? "ICC" : meta.space || null;
        metadata.encoding = meta.format || null;
        } catch { /* sharp metadata failed */ }
      }
    } else if (mt.startsWith("video/")) {
      if (hasFfmpeg()) {
        const buffer = providedBuffer || await getFileBuffer(fileId, file.storagePath);
        if (buffer) {
          const tmpPath = `/tmp/video-meta-${fileId}`;
          try {
            await require("fs/promises").writeFile(tmpPath, buffer);
            const info = parseFfprobe(tmpPath);
            if (info.format) {
              metadata.duration = info.format.duration ? parseFloat(info.format.duration) : null;
              metadata.bitrate = info.format.bit_rate ? parseInt(info.format.bit_rate, 10) : null;
              metadata.encoding = info.format.format_name || null;
            }
            if (info.streams) {
              const videoStream = info.streams.find((s: any) => s.codec_type === "video");
              const audioStream = info.streams.find((s: any) => s.codec_type === "audio");
              if (videoStream) {
                metadata.width = videoStream.width || null;
                metadata.height = videoStream.height || null;
                metadata.codec = videoStream.codec_name || null;
                metadata.frameRate = videoStream.r_frame_rate
                  ? evalFraction(videoStream.r_frame_rate)
                  : null;
                metadata.bitrate = videoStream.bit_rate ? parseInt(videoStream.bit_rate, 10) : metadata.bitrate;
                if (videoStream.color_primaries) metadata.colorProfile = videoStream.color_primaries;
              }
              if (audioStream) {
                metadata.audioCodec = audioStream.codec_name || null;
                metadata.audioBitrate = audioStream.bit_rate ? parseInt(audioStream.bit_rate, 10) : null;
                metadata.audioSampleRate = audioStream.sample_rate ? parseInt(audioStream.sample_rate, 10) : null;
                metadata.audioChannels = audioStream.channels || null;
              }
            }
          } finally {
            try { await require("fs/promises").unlink(tmpPath); } catch {}
          }
        }
      }
    } else if (mt.startsWith("audio/")) {
      if (hasFfmpeg()) {
        const buffer = providedBuffer || await getFileBuffer(fileId, file.storagePath);
        if (buffer) {
          const tmpPath = `/tmp/audio-meta-${fileId}`;
          try {
            await require("fs/promises").writeFile(tmpPath, buffer);
            const info = parseFfprobe(tmpPath);
            if (info.format) {
              metadata.duration = info.format.duration ? parseFloat(info.format.duration) : null;
              metadata.bitrate = info.format.bit_rate ? parseInt(info.format.bit_rate, 10) : null;
              metadata.encoding = info.format.format_name || null;
            }
            if (info.streams) {
              const audioStream = info.streams.find((s: any) => s.codec_type === "audio");
              if (audioStream) {
                metadata.audioCodec = audioStream.codec_name || null;
                metadata.audioBitrate = audioStream.bit_rate ? parseInt(audioStream.bit_rate, 10) : null;
                metadata.audioSampleRate = audioStream.sample_rate ? parseInt(audioStream.sample_rate, 10) : null;
                metadata.audioChannels = audioStream.channels || null;
              }
            }
          } finally {
            try { await require("fs/promises").unlink(tmpPath); } catch {}
          }
        }
      }
    } else if (mt === "application/pdf") {
      const buffer = providedBuffer || await getFileBuffer(fileId, file.storagePath);
      if (buffer) {
        const text = buffer.toString("utf8").slice(0, 4096);
        const pageCountMatch = text.match(/\/Type\s*\/Page[^s]/g);
        metadata.pageCount = pageCountMatch ? pageCountMatch.length : null;
        metadata.isEncrypted = text.includes("/Encrypt") || text.includes("/Encryption");
        metadata.hasText = text.length > 500;
        metadata.isSearchable = text.includes("/Text") || text.length > 1000;
        const titleMatch = text.match(/\/Title\s*\(([^)]*)\)/);
        const authorMatch = text.match(/\/Author\s*\(([^)]*)\)/);
        const subjectMatch = text.match(/\/Subject\s*\(([^)]*)\)/);
        const creatorMatch = text.match(/\/Creator\s*\(([^)]*)\)/);
        if (titleMatch) metadata.documentTitle = titleMatch[1];
        if (authorMatch) metadata.documentAuthor = authorMatch[1];
        if (subjectMatch) metadata.documentSubject = subjectMatch[1];
        if (creatorMatch) metadata.documentCreator = creatorMatch[1];
        try {
          const img = sharp(buffer.slice(0, Math.min(buffer.length, 1024 * 1024)));
          const meta = await img.metadata();
          metadata.pageWidth = meta.width || null;
          metadata.pageHeight = meta.height || null;
        } catch {}
      }
    } else if (mt.includes("officedocument") || mt.includes("msword") || mt.includes("ms-excel") || mt.includes("ms-powerpoint")) {
      const buffer = providedBuffer || await getFileBuffer(fileId, file.storagePath);
      if (buffer) {
        try {
          const text = buffer.toString("utf8").slice(0, 8192);
          const titleMatch = text.match(/<dc:title>([^<]*)<\/dc:title>/);
          const creatorMatch = text.match(/<dc:creator>([^<]*)<\/dc:creator>/);
          if (titleMatch) metadata.documentTitle = titleMatch[1];
          if (creatorMatch) metadata.documentAuthor = creatorMatch[1];
        } catch {}
      }
    }

    await FileMetadata.updateOne({ fileId }, { $set: metadata }, { upsert: true });
  } catch (err) {
    logger.warn({ err, fileId }, "Metadata extraction failed");
  }
}

function evalFraction(frac: string): number | null {
  const parts = frac.split("/");
  if (parts.length !== 2) return null;
  const num = parseFloat(parts[0]);
  const den = parseFloat(parts[1]);
  if (!den) return null;
  return Math.round((num / den) * 100) / 100;
}

export async function getFileMetadata(fileId: string): Promise<Record<string, any> | null> {
  const meta = await FileMetadata.findOne({ fileId }).lean();
  if (meta) {
    const { _id, __v, fileId: _, orgId: _o, ...rest } = meta as any;
    return rest;
  }
  return null;
}
