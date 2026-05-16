import { RedisContainer, type StartedRedisContainer } from "@testcontainers/redis";
import { Redis } from "ioredis";

export interface TestRedisCtx {
  container: StartedRedisContainer;
  client: Redis;
  url: string;
}

export async function startTestRedis(): Promise<TestRedisCtx> {
  const container = await new RedisContainer("redis:7.4-alpine").start();
  const url = container.getConnectionUrl();
  const client = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: false });
  return { container, client, url };
}

export async function stopTestRedis(ctx: TestRedisCtx): Promise<void> {
  await ctx.client.quit().catch(() => undefined);
  await ctx.container.stop();
}

export async function flushRedis(client: Redis): Promise<void> {
  await client.flushall();
}

export const TEST_JWT_KEY = "test-signing-key-do-not-use-min-32-chars-long";

export function setTestEnv(redisUrl: string): void {
  process.env.JWT_SIGNING_KEY = TEST_JWT_KEY;
  process.env.REDIS_URL = redisUrl;
  process.env.TOKEN_SVC_URL = "http://localhost:1"; // never actually called; mocked at boundary
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "warn";
  process.env.PORT = "8080";
}
