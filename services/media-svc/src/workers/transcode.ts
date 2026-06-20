import amqp from "amqplib";
import sharp from "sharp";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { captureException } from "@daily-tour/shared-sentry";
import { eq } from "drizzle-orm";
import { getDb } from "../db.js";
import { assetTable } from "../schema.js";
import { getS3Client } from "../lib/s3.js";
import { loadConfig } from "../config.js";

const SIZES = [200, 600, 1200] as const;
const FORMATS = ["avif", "webp"] as const;

const EXCHANGE = "media";
const QUEUE = "media.transcode";
const ROUTING_KEY = "media.uploaded";

export async function processAsset(assetId: string): Promise<void> {
  const db = getDb();
  const s3 = getS3Client();
  const { MINIO_BUCKET } = loadConfig();

  const [row] = await db.select().from(assetTable).where(eq(assetTable.id, assetId));
  if (!row || !row.uploadedAt) return;

  const obj = await s3.send(new GetObjectCommand({ Bucket: MINIO_BUCKET, Key: row.bucketKey }));
  if (!obj.Body) throw new Error(`empty S3 body for asset ${assetId}`);
  const buf = Buffer.from(await obj.Body.transformToByteArray());

  const variants: Record<string, string> = {};
  for (const size of SIZES) {
    for (const fmt of FORMATS) {
      const out = await sharp(buf).resize(size).toFormat(fmt).toBuffer();
      const key = `derived/${assetId}/${size}w.${fmt}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: MINIO_BUCKET,
          Key: key,
          Body: out,
          ContentType: `image/${fmt}`,
        }),
      );
      variants[`${size}w_${fmt}`] = key;
    }
  }

  await db.update(assetTable).set({ variants }).where(eq(assetTable.id, assetId));
}

export async function runTranscodeWorker(): Promise<void> {
  const { RABBITMQ_URL } = loadConfig();
  const conn = await amqp.connect(RABBITMQ_URL);
  const ch = await conn.createChannel();
  await ch.assertExchange(EXCHANGE, "topic", { durable: true });
  await ch.assertQueue(QUEUE, { durable: true });
  await ch.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);
  await ch.prefetch(4);

  await ch.consume(QUEUE, (msg) => {
    if (!msg) return;
    const content = msg.content.toString();
    void Promise.resolve()
      .then(async () => {
        const { asset_id } = JSON.parse(content) as { asset_id: string };
        await processAsset(asset_id);
        ch.ack(msg);
      })
      .catch((err: unknown) => {
        console.error("transcode worker: processing failed", err);
        // The Fastify error handler never sees worker errors; report here.
        // No-op when SENTRY_DSN is unset (see @daily-tour/shared-sentry).
        captureException(err);
        ch.nack(msg, false, false);
      });
  });
}
