#!/usr/bin/env node
/**
 * Asserts that every key present in en/ locales also exists in pt-PT/ locales,
 * and vice-versa. Exits non-zero and lists missing keys on mismatch.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, "../src/locales");

function flatKeys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return typeof v === "object" && v !== null ? flatKeys(v, path) : [path];
  });
}

function loadNamespace(locale, ns) {
  const file = join(LOCALES_DIR, locale, `${ns}.json`);
  return JSON.parse(readFileSync(file, "utf8"));
}

const namespaces = readdirSync(join(LOCALES_DIR, "en"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(".json", ""));

let failed = false;

for (const ns of namespaces) {
  const enKeys = new Set(flatKeys(loadNamespace("en", ns)));
  const ptKeys = new Set(flatKeys(loadNamespace("pt-PT", ns)));

  const missingInPt = [...enKeys].filter((k) => !ptKeys.has(k));
  const missingInEn = [...ptKeys].filter((k) => !enKeys.has(k));

  if (missingInPt.length > 0) {
    console.error(`[${ns}] Missing in pt-PT:\n  ${missingInPt.join("\n  ")}`);
    failed = true;
  }
  if (missingInEn.length > 0) {
    console.error(`[${ns}] Missing in en:\n  ${missingInEn.join("\n  ")}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log(`✓ All ${namespaces.length} namespaces have matching keys across en and pt-PT.`);
}
