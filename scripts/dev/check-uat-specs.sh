#!/usr/bin/env bash
# Fail if a UAT spec is sitting in `temp/`, which is gitignored.
#
# WHY THIS EXISTS. Four consecutive session handoffs described "the perennial
# untracked e2e/" and handed its specs to the next session as assets. On
# 2026-08-15 the directory was found gone, taking six specs with it — an
# 89-scenario router regression, a reservation-revoke suite, a map-tile
# diagnostic. None had ever been `git add`ed, so git held no copy and nothing
# was recoverable.
#
# The convention ("keep them, commit them later") was stated and re-stated and
# still failed, so this is the mechanical version: specs belong in `e2e/`, which
# is tracked. Evidence — screenshots, evidence.json — stays in `temp/`, which is
# correctly ignored because it is large and reproducible.
#
# Scope note: this only looks at `temp/`. A throwaway one-liner elsewhere is
# your business; the trap being closed is specifically "valuable script written
# into the one directory git is told to forget".
set -uo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root" || exit 0

[ -d temp ] || exit 0

# node_modules under temp/ is a vendored dependency, not a spec of ours.
offenders="$(find temp -name '*.mjs' -not -path '*/node_modules/*' 2>/dev/null | sort)"

[ -z "$offenders" ] && exit 0

echo "[check-uat-specs] ERROR: UAT spec(s) found under temp/, which is gitignored:"
echo "$offenders" | sed 's/^/  /'
echo
echo "temp/ is disposable. A spec left there is one crash, one \`git clean\`, or"
echo "one dropped stash away from being gone — which is exactly how six specs"
echo "were lost on 2026-08-15."
echo
echo "Move it into the tracked e2e/ directory, keeping its folder for provenance:"
first="$(echo "$offenders" | head -1)"
echo "  mkdir -p \"e2e/\$(dirname \"${first#temp/}\")\" && git mv \"$first\" \"e2e/${first#temp/}\""
echo
echo "Leave the evidence (screenshots, evidence.json) where it is — see e2e/README.md."
echo "Before committing, check the spec for inlined tokens or passwords; read them"
echo "from process.env instead. Two guest tokens were found inlined across 13 files."
exit 1
