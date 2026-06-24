import amqp from "amqplib";
import { loadConfig } from "../config.js";

const MEDIA_EXCHANGE = "media";
const MEDIA_UPLOADED_KEY = "media.uploaded";

let cachedConn: amqp.ChannelModel | undefined;
let cachedChannel: amqp.Channel | undefined;

async function getPublishChannel(): Promise<amqp.Channel> {
  if (cachedChannel) return cachedChannel;
  const { RABBITMQ_URL } = loadConfig();
  cachedConn = await amqp.connect(RABBITMQ_URL);
  cachedChannel = await cachedConn.createChannel();
  await cachedChannel.assertExchange(MEDIA_EXCHANGE, "topic", { durable: true });
  cachedConn.on("close", () => {
    cachedConn = undefined;
    cachedChannel = undefined;
  });
  return cachedChannel;
}

export async function publishMediaUploaded(assetId: string): Promise<void> {
  const ch = await getPublishChannel();
  ch.publish(
    MEDIA_EXCHANGE,
    MEDIA_UPLOADED_KEY,
    Buffer.from(JSON.stringify({ asset_id: assetId })),
    { persistent: true },
  );
}

// Reports whether the cached amqp publisher connection is currently open.
// Pure cached-state check — no publish or round-trip. The `close` handler
// above clears both caches on disconnect, so a live channel means a live
// connection. Used by /ready for informational broker liveness (never gates
// readiness). Returns false before the first publish lazily opens the channel.
export function isBrokerConnected(): boolean {
  return cachedChannel !== undefined;
}

export async function closeMqPublisher(): Promise<void> {
  await cachedChannel?.close().catch(() => undefined);
  await cachedConn?.close().catch(() => undefined);
  cachedChannel = undefined;
  cachedConn = undefined;
}
