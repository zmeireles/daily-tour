// Serve a locally built PWA while proxying the API to qual.
//
// Why not measure the component in isolation: that is exactly how #405 was
// missed. #400's acceptance line claimed "overflow 0 at 768", true of an
// isolated markup harness and false of the real page — the masthead only
// crowds when the brand lockup, the nav and the right cluster are all present
// with real content. So this serves the REAL built bundle and lets it talk to
// the REAL backend, changing only the UI code under test.
//
// `/v1` and `/r` are proxied to qual; everything else is served from dist with
// an SPA fallback. Same-origin from the browser's point of view, so the app's
// relative fetches and the cookie/JWT flow behave normally.
//
// Usage: PORT=4405 node e2e/issue-405/serve-with-qual-api.mjs
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const REPO = "/media/jmeireles/ssd3/my-projects/daily-tour";
const DIST = join(REPO, "apps/pwa/dist");
const UPSTREAM = process.env.UPSTREAM ?? "https://qual.stay.portugalodyssey.pt";
const PORT = Number(process.env.PORT ?? 4405);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
  ".map": "application/json; charset=utf-8",
};

// ⚠️ `/r/:token` is a CLIENT route of the PWA — the API call it makes is
// `/v1/r/:token`. Proxying `/r/` upstream serves qual's index.html, whose
// asset hashes do not exist in the local dist, so every chunk 404s and the
// page renders blank. A blank page has zero overflow, so the layout spec then
// reports a clean pass while measuring nothing at all. Cost me one false
// green; only proxy the API.
const isProxied = (p) => p.startsWith("/v1") || p.startsWith("/api");

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (isProxied(url.pathname)) {
    try {
      const body =
        req.method === "GET" || req.method === "HEAD"
          ? undefined
          : await new Promise((resolve) => {
              const chunks = [];
              req.on("data", (c) => chunks.push(c));
              req.on("end", () => resolve(Buffer.concat(chunks)));
            });

      const headers = { ...req.headers };
      delete headers.host;
      delete headers["accept-encoding"]; // let undici hand us a decoded body

      const upstream = await fetch(UPSTREAM + url.pathname + url.search, {
        method: req.method,
        headers,
        body,
        redirect: "manual",
      });

      const out = Object.fromEntries(upstream.headers);
      delete out["content-encoding"];
      delete out["content-length"];
      delete out["strict-transport-security"];
      // Rewrite an upstream redirect back onto this origin so the token
      // redemption lands on the LOCAL build rather than bouncing to qual.
      if (out.location) out.location = out.location.replace(UPSTREAM, `http://localhost:${PORT}`);

      res.writeHead(upstream.status, out);
      res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch (e) {
      res.writeHead(502, { "content-type": "text/plain" });
      res.end(`proxy error: ${e.message}`);
    }
    return;
  }

  // Static, with SPA fallback. normalize() keeps a crafted path inside dist.
  let file = join(DIST, normalize(url.pathname).replace(/^(\.\.[/\\])+/, ""));
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, "index.html");

  try {
    const buf = await readFile(file);
    res.writeHead(200, {
      "content-type": TYPES[extname(file)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(buf);
  } catch (e) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end(`not found: ${e.message}`);
  }
});

// Loopback only. This forwards the caller's headers upstream to qual, so bound
// to 0.0.0.0 it is an open proxy to qual's /v1 for anyone on the LAN.
server.listen(PORT, "127.0.0.1", () =>
  console.log(`serving ${DIST} on http://127.0.0.1:${PORT} (api -> ${UPSTREAM})`),
);
