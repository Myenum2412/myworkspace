declare module "@aws-sdk/client-s3" {
  export interface S3ClientConfig {
    region?: string;
    endpoint?: string;
    credentials?: { accessKeyId: string; secretAccessKey: string };
    forcePathStyle?: boolean;
    requestHandler?: any;
    maxAttempts?: number;
  }

  export class S3Client {
    public config: any;
    public middlewareStack: any;
    constructor(config: S3ClientConfig);
    send(command: any, options?: any): Promise<any>;
    destroy(): void;
  }

  export interface PutObjectCommandInput {
    Bucket?: string;
    Key?: string;
    Body?: Buffer | Uint8Array | string;
    ContentType?: string;
    CacheControl?: string;
    Metadata?: Record<string, string>;
  }
  export class PutObjectCommand { constructor(input: PutObjectCommandInput) }

  export interface GetObjectCommandInput {
    Bucket?: string;
    Key?: string;
    Range?: string;
  }
  export class GetObjectCommand { constructor(input: GetObjectCommandInput) }

  export interface DeleteObjectCommandInput {
    Bucket?: string;
    Key?: string;
  }
  export class DeleteObjectCommand { constructor(input: DeleteObjectCommandInput) }

  export interface HeadObjectCommandInput {
    Bucket?: string;
    Key?: string;
  }
  export class HeadObjectCommand { constructor(input: HeadObjectCommandInput) }

  export interface ListObjectsV2CommandInput {
    Bucket?: string;
    Prefix?: string;
    ContinuationToken?: string;
  }
  export class ListObjectsV2Command { constructor(input: ListObjectsV2CommandInput) }

  export interface CopyObjectCommandInput {
    Bucket?: string;
    Key?: string;
    CopySource?: string;
  }
  export class CopyObjectCommand { constructor(input: CopyObjectCommandInput) }

  export interface CreateMultipartUploadCommandInput {
    Bucket?: string;
    Key?: string;
  }
  export class CreateMultipartUploadCommand { constructor(input: CreateMultipartUploadCommandInput) }

  export interface UploadPartCommandInput {
    Bucket?: string;
    Key?: string;
    UploadId?: string;
    PartNumber?: number;
    Body?: Buffer | Uint8Array;
  }
  export class UploadPartCommand { constructor(input: UploadPartCommandInput) }

  export interface CompleteMultipartUploadCommandInput {
    Bucket?: string;
    Key?: string;
    UploadId?: string;
    MultipartUpload?: { Parts: { ETag: string; PartNumber: number }[] };
  }
  export class CompleteMultipartUploadCommand { constructor(input: CompleteMultipartUploadCommandInput) }

  export interface AbortMultipartUploadCommandInput {
    Bucket?: string;
    Key?: string;
    UploadId?: string;
  }
  export class AbortMultipartUploadCommand { constructor(input: AbortMultipartUploadCommandInput) }

  export interface ListPartsCommandInput {
    Bucket?: string;
    Key?: string;
    UploadId?: string;
  }
  export class ListPartsCommand { constructor(input: ListPartsCommandInput) }
}

declare module "@aws-sdk/s3-request-presigner" {
  import { S3Client } from "@aws-sdk/client-s3";
  export function getSignedUrl(client: S3Client, command: any, options?: { expiresIn?: number }): Promise<string>;
}
