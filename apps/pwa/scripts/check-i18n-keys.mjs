#!/usr/bin/env node
/**
 * Two independent i18n checks.
 *
 * A. PARITY — every key in en/ exists in pt-PT/ and vice-versa.
 *
 * B. CALLSITE RESOLUTION — every statically-readable key requested from code
 *    exists in at least one shipped locale.
 *
 * B exists because A is structurally blind to the failure that keeps actually
 * happening: a key requested from code and missing from *every* locale file.
 * A compares the locale files to each other, so a key absent from both sides is
 * invisible to it, and the hardcoded `defaultValue` at the callsite then
 * silently wins in every language. Four shipped occurrences before this check
 * existed (#370's six picker strings, #375, #378, the feedback drawer) — every
 * one of them green through A.
 *
 * Note what B does NOT do: it does not require a key in every locale. `admin`
 * ships in en/pt-PT/es but not fr by design, and demanding parity there would
 * fail honest code. B only asserts a key is not missing everywhere.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, "../src/locales");
const SRC_DIR = join(__dirname, "../src");

// The locales actually imported into `resources` in src/lib/i18n/index.ts.
// de/ exists on disk but is never imported, so a key living only there is
// unreachable at runtime and must not count as resolved.
const SHIPPED_LOCALES = ["en", "pt-PT", "fr", "es"];

// i18next appends these when `count` is passed: a callsite writes
// t("nights", { count }) while the file holds nights_one / nights_other, so the
// bare key legitimately resolves to neither on its own.
const PLURAL_SUFFIXES = ["_zero", "_one", "_two", "_few", "_many", "_other"];

// Files that request keys no locale has, but which nothing imports — so no user
// can reach them and nothing ships. Carried here rather than deleted (project
// doctrine: don't remove pre-existing dead code unasked) or translated (real
// copy in four languages for a component nobody renders).
//
// This list CANNOT go stale: `assertStillUnreachable` below fails the check the
// moment anything imports one of these, which is exactly when the keys stop
// being harmless. An allowlist that can't detect its own expiry is how debt
// becomes invisible.
const UNREACHABLE_FILES = [
  // #389 — wire it and translate, or delete it.
  "features/feedback/feedback-drawer.tsx",
];

function flatKeys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return typeof v === "object" && v !== null ? flatKeys(v, path) : [path];
  });
}

function loadNamespace(locale, ns) {
  return JSON.parse(readFileSync(join(LOCALES_DIR, locale, `${ns}.json`), "utf8"));
}

const namespaces = readdirSync(join(LOCALES_DIR, "en"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(".json", ""));

let failed = false;

// ── A. Parity between en and pt-PT ──────────────────────────────────────────
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

// ── B. Callsite resolution ──────────────────────────────────────────────────

// locale -> ns -> parsed bundle, shipped locales only.
const bundles = {};
for (const loc of SHIPPED_LOCALES) {
  bundles[loc] = {};
  for (const f of readdirSync(join(LOCALES_DIR, loc))) {
    if (f.endsWith(".json")) {
      bundles[loc][f.replace(/\.json$/, "")] = JSON.parse(
        readFileSync(join(LOCALES_DIR, loc, f), "utf8"),
      );
    }
  }
}

function lookup(bundle, key) {
  let node = bundle;
  for (const part of key.split(".")) {
    if (node == null || typeof node !== "object" || !(part in node)) return undefined;
    node = node[part];
  }
  return node;
}

/** True when `key` exists in `ns` in at least one shipped locale. */
function resolves(ns, key) {
  for (const loc of SHIPPED_LOCALES) {
    const bundle = bundles[loc]?.[ns];
    if (!bundle) continue;
    if (lookup(bundle, key) !== undefined) return true;
    if (PLURAL_SUFFIXES.some((s) => lookup(bundle, key + s) !== undefined)) return true;
  }
  return false;
}

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "node_modules" && e.name !== "locales" && e.name !== "__tests__")
        yield* walk(p);
    } else if (/\.(tsx?|jsx?)$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) {
      yield p;
    }
  }
}

const allFiles = [...walk(SRC_DIR)];

/**
 * An allowlisted file is only harmless while nothing imports it. Prove that on
 * every run instead of trusting the comment next to the list.
 */
function assertStillUnreachable() {
  for (const rel of UNREACHABLE_FILES) {
    const stem = rel.replace(/\.[jt]sx?$/, "");
    const base = stem.split("/").pop();
    const importers = allFiles.filter((f) => {
      if (relative(SRC_DIR, f) === rel) return false;
      const src = readFileSync(f, "utf8");
      return new RegExp(`from\\s+["'][^"']*${base}["']`).test(src);
    });
    if (importers.length > 0) {
      console.error(
        `\n✗ ${rel} is in UNREACHABLE_FILES but is now imported by:\n  ` +
          importers.map((f) => relative(SRC_DIR, f)).join("\n  ") +
          `\n\n  Its keys are reachable now. Translate them and remove the allowlist entry.\n`,
      );
      failed = true;
    }
  }
}
assertStillUnreachable();

const unresolved = [];
let dynamicCount = 0;

for (const file of allFiles) {
  const rel = relative(SRC_DIR, file);
  if (UNREACHABLE_FILES.includes(rel)) continue;
  const src = readFileSync(file, "utf8");
  const lines = src.split("\n");

  // Namespaces bound in this file. A bare useTranslation() binds the defaultNS.
  const bound = [];
  for (const m of src.matchAll(/useTranslation\(\s*(?:"([^"]+)"|'([^']+)'|\[([^\]]*)\])?/g)) {
    if (m[1] || m[2]) bound.push(m[1] ?? m[2]);
    else if (m[3]) for (const q of m[3].matchAll(/["']([^"']+)["']/g)) bound.push(q[1]);
    else bound.push("common");
  }
  const keyPrefix = src.match(/keyPrefix:\s*["']([^"']+)["']/)?.[1];
  const fileNs = bound.length ? [...new Set(bound)] : ["common"];

  lines.forEach((line, i) => {
    // Template literals with interpolation cannot be resolved statically.
    // Counted and reported rather than passed over silently — a check that
    // quietly ignores what it cannot see reads exactly like full coverage.
    dynamicCount += [...line.matchAll(/\bt\(\s*`[^`]*\$\{/g)].length;

    const hits = [
      ...[...line.matchAll(/\bt\(\s*["']([^"']+)["']/g)].map((m) => ({ m, kind: "t()" })),
      ...[...line.matchAll(/i18nKey=["']([^"']+)["']/g)].map((m) => ({ m, kind: "Trans" })),
    ];

    for (const { m, kind } of hits) {
      let key = m[1];
      let nsCandidates = fileNs;

      if (key.includes(":")) {
        const [ns, ...rest] = key.split(":");
        nsCandidates = [ns];
        key = rest.join(":");
      } else {
        if (keyPrefix) key = `${keyPrefix}.${key}`;
        const nsOpt = line.slice(m.index).match(/ns:\s*["']([^"']+)["']/)?.[1];
        if (nsOpt) nsCandidates = [nsOpt];
      }

      // i18next also falls back to the defaultNS.
      if (nsCandidates.some((ns) => resolves(ns, key)) || resolves("common", key)) continue;

      const masked = /defaultValue/.test(line.slice(m.index, m.index + 220) + (lines[i + 1] ?? ""));
      unresolved.push(
        `${rel}:${i + 1} [${kind} ns=${nsCandidates.join("|")}] "${key}" — ` +
          (masked
            ? "masked by a hardcoded default (wrong language everywhere)"
            : "renders the raw key"),
      );
    }
  });
}

if (unresolved.length > 0) {
  console.error(
    `\n✗ ${unresolved.length} key(s) requested from code exist in NO shipped locale ` +
      `(${SHIPPED_LOCALES.join(", ")}):\n  ${unresolved.join("\n  ")}\n\n` +
      `  Fix by adding the key to the locale files, or by pointing the callsite\n` +
      `  at the key that already exists.\n`,
  );
  failed = true;
}

if (failed) process.exit(1);

console.log(`✓ All ${namespaces.length} namespaces have matching keys across en and pt-PT.`);
console.log(
  `✓ Every statically-readable t()/Trans key resolves in at least one shipped locale ` +
    `(${dynamicCount} dynamic key(s) skipped — not statically checkable).`,
);
