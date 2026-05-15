import { diag } from "@opentelemetry/api";
import type { NodeSDK } from "@opentelemetry/sdk-node";

/**
 * Registers SIGTERM, SIGINT, and beforeExit handlers that gracefully
 * shut down the OTel SDK and exit the process.
 */
export function registerShutdownHooks(sdk: NodeSDK): void {
  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    diag.info(`[shared-otel] Received ${signal}, shutting down OTel SDK…`);
    try {
      await sdk.shutdown();
      diag.info("[shared-otel] OTel SDK shut down successfully.");
    } catch (err) {
      diag.error("[shared-otel] Error during OTel SDK shutdown:", err);
    } finally {
      // eslint-disable-next-line no-restricted-syntax
      process.exit(0);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("beforeExit", () => void shutdown("beforeExit"));
}
