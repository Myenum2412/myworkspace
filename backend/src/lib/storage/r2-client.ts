import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "../logger/index.js";
import { Readable } from "stream";

let client: S3Client | null = null;

const R2_ENDPOINT = process.env.R2_ENDPOINT || "";
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY || "";
const R2_SECRET_KEY = process.env.R2_SECRET_KEY || "";
const R2_BUCKET = process.env.R2_BUCKET || "myworkspace";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";
const R2_REGION = process.env.R2_REGION || "auto";

export function getR2Client(): S3Client {
  if (!client) {
    client = new S3Client({
      region: R2_REGION,
      endpoint: R2_ENDPOINT,
      credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
      forcePathStyle: true,
      requestHandler: {
        requestTimeout: 30000,
      },
    });
    logger.info("R2 client initialized");
  }
  return client;
}

export function getR2Config() {
  return { bucket: R2_BUCKET, publicUrl: R2_PUBLIC_URL, endpoint: R2_ENDPOINT };
}

export function isR2Configured(): boolean {
  return !!(R2_ENDPOINT && R2_ACCESS_KEY && R2_SECRET_KEY);
}

export {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
  getSignedUrl,
  Readable,
};
