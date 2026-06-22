// Side-effecting OTel preload. Run a service via
//   node --import @daily-tour/shared-otel/register dist/index.js
// so initOtel() installs the instrumentation patches BEFORE the (bundled)
// entrypoint imports fastify / node:http. Otherwise the live HTTP server binds
// the un-patched `emit` and http.server.duration is never recorded.
// serviceName comes from OTEL_SERVICE_NAME (set per service in compose).
import { initOtel } from "./init.js";

initOtel();
