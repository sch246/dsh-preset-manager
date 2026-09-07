#!/usr/bin/env bash
# Uninstall the bundle and reverse only the exact Host patch recorded by setup.
set -euo pipefail
: "${DSH_HOME:?set DSH_HOME}"
: "${DSH_PROFILE:?set DSH_PROFILE}"
: "${DSH_CHECKOUT:?set DSH_CHECKOUT}"
TSC="${DSH_BUILD_TOOLS:-$DSH_CHECKOUT/node_modules}/typescript/bin/tsc"
TSDOWN="${DSH_BUILD_TOOLS:-$DSH_CHECKOUT/node_modules}/tsdown/dist/run.mjs"

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECKOUT="${DSH_CHECKOUT:?set DSH_CHECKOUT}"

PATCH="$REPO_DIR/patches/harness-groupby-preset.patch"
if [ -z "${CHECKOUT:-}" ] || [ ! -d "$CHECKOUT/packages" ]; then
  echo "uninstall: cannot locate the dsh checkout (set DSH_CHECKOUT)" >&2
  exit 1
fi
if [ ! -f "$PATCH" ]; then
  echo "uninstall: tracked harness patch is missing: $PATCH" >&2
  exit 1
fi

PATCH_SHA="$(sha256sum "$PATCH" | awk '{print $1}')"
STATE_FILE="$(git -C "$CHECKOUT" rev-parse --git-path dsh-preset-manager.patch-state)"
if [[ "$STATE_FILE" != /* ]]; then STATE_FILE="$CHECKOUT/$STATE_FILE"; fi
RECORDED_SHA=""
RECORDED_OWNED=""
if [ -f "$STATE_FILE" ]; then
  RECORDED_SHA="$(sed -n 's/^patch_sha256=//p' "$STATE_FILE")"
  RECORDED_OWNED="$(sed -n 's/^patch_applied_by_setup=//p' "$STATE_FILE")"
fi

regenerate_shared_catalogs() {
  echo "regenerating shared client catalogs from the remaining source contributions..."
  (cd "$CHECKOUT" && node --import tsx/esm scripts/gen-client-catalog.ts && node --import tsx/esm scripts/gen-cordis-api.ts)
}

if [ "$RECORDED_SHA" != "$PATCH_SHA" ]; then
  echo "uninstall: no matching setup provenance; preserving Host files" >&2
  echo "uninstall: run setup from this exact plugin revision before uninstalling its patch" >&2
elif [ "$RECORDED_OWNED" != "true" ]; then
  echo "uninstall: the matching patch predated setup; preserving Host files"
  rm -f "$STATE_FILE"
elif git -C "$CHECKOUT" apply --unidiff-zero --check --reverse "$PATCH" 2>/dev/null; then
  echo "rolling back the exact recorded harness patch..."
  git -C "$CHECKOUT" apply --unidiff-zero --reverse "$PATCH"
  regenerate_shared_catalogs
  rm -f "$STATE_FILE"
  echo "rebuilding changed Host, Remote client, and ui-workspace faces..."
  (cd "$CHECKOUT" \
    && node --max-old-space-size=4096 "$TSC" -b tsconfig.host.json && node "$TSDOWN" --env.DSH_BUILD_FACE host \
    && node "$TSC" -b packages/client/ui-workspace/tsconfig.json \
    && (cd packages/api/remotes && node "$TSDOWN") \
    && (cd packages/client/ui-workspace && node "$TSDOWN"))
else
  echo "uninstall: recorded patch no longer reverses cleanly; preserving Host files" >&2
  echo "uninstall: resolve overlapping edits before retrying" >&2
fi

node "$CHECKOUT/apps/cli/lib/bin.js" plugin --profile "$DSH_PROFILE" remove dsh-preset-manager

echo "remove: complete; no service restart was performed"
