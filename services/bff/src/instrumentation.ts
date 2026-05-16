import { initOtel } from "@daily-tour/shared-otel";

// MUST be imported as the first line of src/index.ts.
// initOtel() is idempotent; under NODE_ENV=test the trace exporter is
// disabled by the shared-otel contract, so importing this file from a
// test is safe.
initOtel({ serviceName: "bff" });
