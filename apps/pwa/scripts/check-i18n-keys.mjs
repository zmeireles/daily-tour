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
const UNREACHABLE_FILES = [];

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

// SHIPPED_LOCALES duplicates the import list in src/lib/i18n/index.ts, so assert
// they agree rather than trusting the comment. The dangerous direction is
// REMOVAL: drop a locale from the app and forget this list, and the check goes
// silently LOOSER — keys that live only in the dropped bundle keep passing while
// no user can reach them. Adding one is merely stricter, which is visible.
{
  const i18nSrc = readFileSync(join(SRC_DIR, "lib/i18n/index.ts"), "utf8");
  const resourcesBlock = i18nSrc.slice(i18nSrc.indexOf("const resources = {"));
  const appLocales = [...resourcesBlock.matchAll(/^\s{2}(?:"([^"]+)"|([a-zA-Z-]+)):\s*\{/gm)].map(
    (m) => m[1] ?? m[2],
  );
  const missing = appLocales.filter((l) => !SHIPPED_LOCALES.includes(l));
  const extra = SHIPPED_LOCALES.filter((l) => !appLocales.includes(l));
  if (missing.length || extra.length) {
    console.error(
      `\n✗ SHIPPED_LOCALES has drifted from src/lib/i18n/index.ts.\n` +
        (missing.length ? `  In the app but not in this script: ${missing.join(", ")}\n` : "") +
        (extra.length ? `  In this script but not in the app: ${extra.join(", ")}\n` : "") +
        `  Reconcile them — an unnoticed removal makes this check silently weaker.\n`,
    );
    failed = true;
  }
}

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
      // Static `from "…"`, bare side-effect `import "…"`, AND dynamic
      // `import("…")`. The dynamic form is not an edge case here: React.lazy is
      // precisely how someone would wire a drawer, so a check that only saw
      // static imports would go quietly blind on the most realistic path.
      return new RegExp(`(?:from\\s+|import\\s*\\(\\s*|import\\s+)["'][^"']*${base}["']`).test(src);
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

const lineOf = (src, index) => src.slice(0, index).split("\n").length;

/**
 * True when the match sits on a comment line. A gate that blocks on a
 * `// TODO: t("future.key")` is a gate someone disables.
 *
 * Deliberately a per-line test rather than stripping comments from the whole
 * file first: a naive strip is not safe on TSX — the first attempt blanked a
 * live `useTranslation("home")` line and produced four false positives against
 * perfectly good code. For a CI gate, failing valid code is the worse error,
 * so this trades a little precision for the guarantee that it can only ever
 * ignore things, never invent them.
 */
function inComment(src, index) {
  const start = src.lastIndexOf("\n", index) + 1;
  const prefix = src.slice(start, index);
  const trimmed = prefix.trimStart();

  // Whole line is a comment (`// …`, a `*` continuation line, or a JSX `{/* …`).
  if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("{/*")) return true;

  // Mid-line: a `//` after code (ignoring `://` in URLs), or an unclosed `/*`
  // opened earlier on this same line — e.g. `{count} {/* TODO: t("x") */}`.
  if (/(^|[^:])\/\//.test(prefix)) return true;
  const open = prefix.lastIndexOf("/*");
  if (open !== -1 && prefix.indexOf("*/", open) === -1) return true;

  return false;
}

for (const file of allFiles) {
  const rel = relative(SRC_DIR, file);
  if (UNREACHABLE_FILES.includes(rel)) continue;
  const src = readFileSync(file, "utf8");

  // Namespaces bound in this file. A bare useTranslation() binds the defaultNS.
  const bound = [];
  for (const m of src.matchAll(/useTranslation\(\s*(?:"([^"]+)"|'([^']+)'|\[([^\]]*)\])?/g)) {
    if (m[1] || m[2]) bound.push(m[1] ?? m[2]);
    else if (m[3]) for (const q of m[3].matchAll(/["']([^"']+)["']/g)) bound.push(q[1]);
    else bound.push("common");
  }
  const keyPrefix = src.match(/keyPrefix:\s*["']([^"']+)["']/)?.[1];
  const fileNs = bound.length ? [...new Set(bound)] : ["common"];

  // Renamed bindings: `const { t: tHome } = useTranslation("home")`. Without
  // these, five live callsites were never scanned at all.
  const aliases = [...src.matchAll(/\{\s*t:\s*([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
  const callers = ["t", "i18n\\.t", ...aliases].join("|");

  // Whole-file, not line-by-line: prettier wraps any call past 80 columns onto
  // its own line, and a per-line regex sees none of those. 26 such callsites
  // existed here — including one with a positional default, the exact shape of
  // the bug this check exists to catch.
  const CALL = new RegExp(`\\b(?:${callers})\\(\\s*`, "g");

  for (const call of src.matchAll(CALL)) {
    if (inComment(src, call.index)) continue;
    const after = src.slice(call.index + call[0].length);

    // Anything not opening with a plain quoted literal is not statically
    // readable: template literals, `t(variable)`, `t("a" + b)`. Counted as
    // skipped rather than ignored — "we report what we cannot see" is only
    // honest if it covers every such form, not just template literals.
    const lit = after.match(/^(["'])([^"'\n]*)\1/);
    if (!lit || /^\s*\+/.test(after.slice(lit[0].length))) {
      dynamicCount++;
      continue;
    }

    let key = lit[2];
    let nsCandidates = fileNs;
    const window = after.slice(0, 260);

    if (key.includes(":")) {
      const [ns, ...rest] = key.split(":");
      nsCandidates = [ns];
      key = rest.join(":");
    } else {
      if (keyPrefix) key = `${keyPrefix}.${key}`;
      const nsOpt = window.match(/ns:\s*["']([^"']+)["']/)?.[1];
      if (nsOpt) nsCandidates = [nsOpt];
    }

    // No fallback to `common` here. The app sets defaultNS but NOT fallbackNS,
    // and i18next does not fall back to the defaultNS for a namespace-bound
    // `t` — so accepting a common-only key would green a callsite that renders
    // the raw key at runtime.
    if (nsCandidates.some((ns) => resolves(ns, key))) continue;

    // This repo mostly uses i18next's POSITIONAL default (`t("k", "Text")`)
    // rather than `{ defaultValue }`, so detect both or the diagnosis misleads.
    const masked =
      /^\s*,\s*(["'])/.test(window.slice(lit[0].length)) || /defaultValue/.test(window);
    unresolved.push(
      `${rel}:${lineOf(src, call.index)} [ns=${nsCandidates.join("|")}] "${key}" — ` +
        (masked
          ? "masked by a hardcoded default (wrong language everywhere)"
          : "renders the raw key"),
    );
  }

  for (const m of src.matchAll(/i18nKey=["']([^"']+)["']/g)) {
    if (inComment(src, m.index)) continue;
    let key = m[1];
    let nsCandidates = fileNs;
    if (key.includes(":")) {
      const [ns, ...rest] = key.split(":");
      nsCandidates = [ns];
      key = rest.join(":");
    }
    if (nsCandidates.some((ns) => resolves(ns, key))) continue;
    unresolved.push(`${rel}:${lineOf(src, m.index)} [Trans ns=${nsCandidates.join("|")}] "${key}"`);
  }
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
