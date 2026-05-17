import { initOtel } from "@daily-tour/shared-otel";

// MUST be imported as the first line of src/index.ts.
initOtel({ serviceName: "media-svc" });
