#!/usr/bin/env bash
# Generate (or verify) the committed `.gitleaks.toml` that CI can actually read.
#
# WHY THIS EXISTS. `gitleaks/gitleaks-action@v2` auto-discovers `.gitleaks.toml`
# at the repo root. That file did not exist, so CI scanned with the DEFAULT
# ruleset and ZERO allowlists — while lefthook passed `--config
# .gitleaks-ext.toml`, which chains to `~/.claude/config/gitleaks.toml`, a
# machine-local file no runner can reach. The two therefore disagreed:
#
#   · push events scan only the pushed commits, so the three long-waived
#     findings never appeared in a diff  → green, every time
#   · scheduled events scan all history, so they appeared every week
#     → RED for five consecutive weeks (2026-07-20 … 08-17) before anyone looked
#
# A gate that is always red carries no signal on the day something real lands,
# which is the actual cost. Filed as #415.
#
# THE SHAPE OF THE FIX. The platform SoT deliberately keeps universal rules in
# ONE central config and per-project allowlists in small Class-B extension
# configs, precisely so seven repos cannot drift into five shapes again. Copying
# rules per project by hand is the thing that design exists to prevent — so this
# script does the merge mechanically instead:
#
#   ~/.claude/config/gitleaks.toml   (central: rules + universal allowlist)
#   + .gitleaks-ext.toml             (this project: allowlists ONLY)
#   = .gitleaks.toml                 (generated, committed, CI-discoverable)
#
# lefthook then points at the SAME generated file, so a local pass predicts a CI
# pass — which the old arrangement could not do in either direction.
#
# DRIFT. `--check` fails when the generated file no longer matches its inputs, so
# a central-config update cannot sit unnoticed in a repo whose committed copy is
# stale. It SKIPS (exit 0) where the central config is absent — i.e. in CI, which
# has nothing to compare against and only needs the committed result.
#
# Usage:
#   scripts/dev/sync-gitleaks-config.sh --write   # regenerate .gitleaks.toml
#   scripts/dev/sync-gitleaks-config.sh --check   # fail if it is out of date
set -uo pipefail

CENTRAL="${GITLEAKS_CENTRAL_CONFIG:-$HOME/.claude/config/gitleaks.toml}"
repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root" || exit 1

EXT=".gitleaks-ext.toml"
OUT=".gitleaks.toml"
mode="${1:---check}"

if [ ! -f "$CENTRAL" ]; then
  # CI: the committed .gitleaks.toml is all that is needed, and there is nothing
  # to verify it against. Say so rather than passing silently.
  echo "[sync-gitleaks-config] central config not present ($CENTRAL) — skipping."
  echo "  The committed $OUT is self-contained; this check only runs where the"
  echo "  central config exists (a workstation)."
  exit 0
fi

[ -f "$EXT" ] || {
  echo "[sync-gitleaks-config] ERROR: $EXT is missing — it holds this project's allowlists."
  exit 1
}

generated="$(
  CENTRAL="$CENTRAL" EXT="$EXT" python3 - <<'PY'
import os, re, sys

central = open(os.environ["CENTRAL"], encoding="utf-8").read()
ext = open(os.environ["EXT"], encoding="utf-8").read()

# The GLOBAL allowlist opens at a column-0 `[allowlist]`. Rule-scoped ones are
# indented (`  [rules.allowlist]`), so an anchored match is unambiguous — and
# anything else means the central config changed shape, which must stop the
# build rather than produce a half-merged file.
matches = [m.start() for m in re.finditer(r"^\[allowlist\]$", central, re.M)]
if len(matches) != 1:
    sys.exit(f"expected exactly one top-level [allowlist] in central config, found {len(matches)}")
start = matches[0]
# ⚠️ The allowlist is NOT necessarily the last table. Taking only the text BEFORE
# it silently DROPPED any rule defined after it — so a central rule appended at
# the end of the file would never reach this repo, and `--check` would report
# "in sync" while it was not. Caught by planting exactly that. The block extends
# to the next top-level table (`[foo]` or `[[rules]]`) or to EOF.
nxt = re.search(r"^\[", central[start + len("[allowlist]") :], re.M)
end = start + len("[allowlist]") + nxt.start() if nxt else len(central)
head, allowlist_block, tail = central[:start], central[start:end], central[end:]


def array(block, key):
    """Extract the *body* of a `key = [ ... ]` array, comments included."""
    m = re.search(rf"^{key}\s*=\s*\[\n(.*?)^\]$", block, re.M | re.S)
    return m.group(1).rstrip("\n") if m else ""


def scalar(block, key):
    m = re.search(rf'^{key}\s*=\s*(".*?")$', block, re.M)
    return m.group(1) if m else None


# `[extend]` in the ext file points at the central config by absolute path. That
# is exactly what CI cannot follow, and the merge replaces it — so drop it here
# rather than emitting a path no runner can resolve.
ext_body = re.sub(r"^\[extend\]\n(?:^(?!\[).*\n)*", "", ext, flags=re.M)

parts = [
    "# " + "=" * 74,
    "# GENERATED FILE — do not edit by hand.",
    "# " + "=" * 74,
    "#",
    "# Produced by scripts/dev/sync-gitleaks-config.sh from:",
    "#   ~/.claude/config/gitleaks.toml   (central: rules + universal allowlist)",
    "#   .gitleaks-ext.toml               (this project: allowlists only)",
    "#",
    "# It exists because gitleaks-action auto-discovers `.gitleaks.toml` at the",
    "# repo root and cannot follow the central config's absolute path. Without it",
    "# CI scanned with no allowlists at all, and the weekly full-history run was",
    "# red for five straight weeks while every push run passed (#415).",
    "#",
    "# Edit the INPUTS, then run:  scripts/dev/sync-gitleaks-config.sh --write",
    "# `--check` runs at pre-commit and fails when this file is out of date.",
    "# " + "=" * 74,
    "",
    (head + tail)
    .replace(
        'title = "central-platform-gitleaks"',
        'title = "daily-tour (generated from central-platform-gitleaks)"',
    )
    .rstrip("\n"),
    "",
    "# " + "=" * 74,
    "# MERGED allowlist: the central universal entries, then this project's.",
    "# Both kept verbatim so a diff against either input stays readable.",
    "# " + "=" * 74,
    "[allowlist]",
    f'description = "daily-tour merged allowlist — central universal FPs + project FPs"',
]

regex_target = scalar(allowlist_block, "regexTarget") or scalar(ext_body, "regexTarget")
if regex_target:
    parts.append(f"regexTarget = {regex_target}")

for key in ("paths", "regexes"):
    central_items, ext_items = array(allowlist_block, key), array(ext_body, key)
    if not central_items and not ext_items:
        continue
    parts.append(f"{key} = [")
    if central_items:
        parts.append("  # ── from the central config (universal) ──")
        parts.append(central_items)
    if ext_items:
        parts.append("  # ── from .gitleaks-ext.toml (daily-tour) ──")
        parts.append(ext_items)
    parts.append("]")

print("\n".join(parts))
PY
)" || {
  echo "[sync-gitleaks-config] ERROR: merge failed (see above)."
  exit 1
}

case "$mode" in
--write)
  printf '%s\n' "$generated" >"$OUT"
  echo "[sync-gitleaks-config] wrote $OUT"
  ;;
--check)
  if [ ! -f "$OUT" ]; then
    echo "[sync-gitleaks-config] ERROR: $OUT is missing. CI auto-discovers it; without it,"
    echo "  the secret scan runs with NO allowlists (#415)."
    echo "  Fix: scripts/dev/sync-gitleaks-config.sh --write"
    exit 1
  fi
  if ! printf '%s\n' "$generated" | diff -q - "$OUT" >/dev/null; then
    echo "[sync-gitleaks-config] ERROR: $OUT is out of date with its inputs."
    printf '%s\n' "$generated" | diff -u "$OUT" - | head -40
    echo
    echo "  Fix: scripts/dev/sync-gitleaks-config.sh --write   (then commit the result)"
    exit 1
  fi
  ;;
*)
  echo "usage: $0 [--write|--check]"
  exit 2
  ;;
esac
