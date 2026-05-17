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

export async function closeMqPublisher(): Promise<void> {
  await cachedChannel?.close().catch(() => undefined);
  await cachedConn?.close().catch(() => undefined);
  cachedChannel = undefined;
  cachedConn = undefined;
}
