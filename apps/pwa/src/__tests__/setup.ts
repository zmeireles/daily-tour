import "@testing-library/jest-dom/vitest";
import "../lib/i18n";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom doesn't implement URL.createObjectURL — polyfill for maplibre-gl worker setup.
if (typeof URL.createObjectURL === "undefined") {
  Object.defineProperty(URL, "createObjectURL", { value: vi.fn(() => "blob:mock") });
}

afterEach(() => {
  cleanup();
});
