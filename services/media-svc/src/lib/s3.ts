import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { loadConfig } from "../config.js";

let cachedClient: S3Client | undefined;

export function getS3Client(): S3Client {
  if (!cachedClient) {
    const config = loadConfig();
    cachedClient = new S3Client({
      endpoint: config.MINIO_ENDPOINT,
      region: "us-east-1", // MinIO ignores region but SDK requires a value
      credentials: {
        accessKeyId: config.MINIO_ACCESS_KEY,
        secretAccessKey: config.MINIO_SECRET_KEY,
      },
      forcePathStyle: true, // required for MinIO; host-style URLs need DNS magic MinIO doesn't provide
    });
  }
  return cachedClient;
}

// Creates the bucket if it does not already exist. Idempotent — safe to call on every boot.
export async function ensureBucket(client: S3Client, bucket: string): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

// TTL trade-off: 15 min is short (secure, time-bounded leak risk) but breaks
// resumable uploads. v1 assumes a single-shot PUT; T-1.4.1+ can extend TTL
// for chunked/resumable upload support.
const PRESIGNED_TTL_SECONDS = 900;

export async function getPresignedPutUrl(
  client: S3Client,
  bucket: string,
  key: string,
  mimeType: string,
): Promise<string> {
  return getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: mimeType }),
    { expiresIn: PRESIGNED_TTL_SECONDS },
  );
}

export async function getPresignedGetUrl(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<string> {
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: PRESIGNED_TTL_SECONDS,
  });
}
