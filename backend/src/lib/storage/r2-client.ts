import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  ListPartsCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";
import { logger } from "../logger/index.js";

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
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  getSignedUrl,
  HeadObjectCommand,
  ListObjectsV2Command,
  ListPartsCommand,
  PutObjectCommand,
  Readable,
  S3Client,
  UploadPartCommand,
};
