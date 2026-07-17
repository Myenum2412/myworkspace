import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, getR2Config } from "./r2-client.js";
import { logger } from "../logger/index.js";

export class SignedUrlService {
  async getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const client = getR2Client();
    const { bucket } = getR2Config();
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(client, command, { expiresIn });
  }

  async getUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
    const client = getR2Client();
    const { bucket } = getR2Config();
    const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
    return getSignedUrl(client, command, { expiresIn });
  }

  async getBatchDownloadUrls(keys: string[], expiresIn = 3600): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    for (const key of keys) {
      try {
        const url = await this.getDownloadUrl(key, expiresIn);
        results.set(key, url);
      } catch (err) {
        logger.warn({ err, key }, "Failed to generate signed URL");
      }
    }
    return results;
  }
}
