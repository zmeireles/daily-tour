import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initSentry } from "./lib/sentry";
import "./lib/i18n/index";
import "./styles/globals.css";

// Error reporting. DSN-gated: a complete no-op when VITE_SENTRY_DSN is
// unset/empty, so this is safe before a Sentry-compatible backend exists.
// Init before render so early errors are captured.
initSentry();

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
