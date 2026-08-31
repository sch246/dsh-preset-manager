#!/usr/bin/env bash
# Install dsh-preset-manager from a clean or already-patched Harness checkout.
# The plugin repository owns the complete Host intervention as one tracked patch.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE="${DSH_PROFILE:-web}"

CHECKOUT="${DSH_CHECKOUT:-}"
for CANDIDATE in "$CHECKOUT" /root/deepseek-harness "$HOME/deepseek-harness"; do
  if [ -n "$CANDIDATE" ] && [ -d "$CANDIDATE/packages" ]; then
    CHECKOUT="$CANDIDATE"
    break
  fi
done
if [ -z "${CHECKOUT:-}" ] || [ ! -d "$CHECKOUT/packages" ]; then
  echo "setup: cannot locate the dsh checkout (set DSH_CHECKOUT)" >&2
  exit 1
fi
if ! git -C "$CHECKOUT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "setup: $CHECKOUT is not a git checkout" >&2
  exit 1
fi

PATCH="$REPO_DIR/patches/harness-groupby-preset.patch"
if [ ! -f "$PATCH" ]; then
  echo "setup: tracked harness patch is missing: $PATCH" >&2
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
PATCH_APPLIED_BY_SETUP=false

verify_source_markers() {
  local needle='@meta-intent:begin dsh-preset-manager '
  local paths=(
    packages/client/ui-workspace/src/client/rows/WorkspaceBrowser.tsx
    packages/client/ui-workspace/src/client/contract/slots.ts
    packages/client/ui-workspace/src/client/rows/Rows.tsx
    packages/api/session-controller/src/list.ts
    packages/api/session-controller/src/agent.ts
    packages/api/session-controller/src/index.ts
    packages/api/session-controller/src/preset-selection.ts
    packages/preset/agent-presets/src/index.ts
    packages/session/session-projection/src/index.ts
    packages/session/session-projection-cache/src/index.ts
    scripts/gen-cordis-catalog.ts
  )
  for path in "${paths[@]}"; do
    if ! grep -Fq "$needle" "$CHECKOUT/$path"; then
      echo "setup: ownership marker missing from $path" >&2
      return 1
    fi
  done
}

regenerate_shared_catalogs() {
  echo "regenerating shared client catalogs from all currently installed source contributions..."
  (cd "$CHECKOUT" && pnpm run gen-client-catalog && pnpm run gen-cordis-api)
}

echo "checking tracked harness patch against $CHECKOUT..."
if git -C "$CHECKOUT" apply --unidiff-zero --check --reverse "$PATCH" 2>/dev/null; then
  if [ "$RECORDED_SHA" = "$PATCH_SHA" ] && [ "$RECORDED_OWNED" = "true" ]; then
    PATCH_APPLIED_BY_SETUP=true
    echo "harness patch already applied by an earlier run of this exact setup"
  else
    echo "harness patch already present; preserving external ownership"
  fi
elif git -C "$CHECKOUT" apply --unidiff-zero --check "$PATCH"; then
  echo "applying harness patch..."
  git -C "$CHECKOUT" apply --unidiff-zero "$PATCH"
  PATCH_APPLIED_BY_SETUP=true
else
  echo "setup: neither the patch nor its exact reverse applies" >&2
  echo "setup: the target files overlap local changes or this DSH revision is unsupported" >&2
  echo "setup: no Host files were changed" >&2
  exit 1
fi

verify_source_markers
regenerate_shared_catalogs

{
  echo "patch_sha256=$PATCH_SHA"
  echo "patch_applied_by_setup=$PATCH_APPLIED_BY_SETUP"
  echo "host_head=$(git -C "$CHECKOUT" rev-parse HEAD)"
  echo "marker_schema=meta-intent-source-region/0.1"
  echo "regions=sidebar.workspaces.presetGroups,workspace.rows.alternateGrouping,workspace.groupBy.preset,session.list.incompleteProjectionProbe,sessionProjection.checkpointCompleteness,sessionProjectionCache.cachedCompleteness,session.agentPresetSelectionEndpoint,session.agentPresetSelectionActivation,session.agentPresetSelectionAssemblyImport,session.agentPresetSelectionAssemblyExport,session.agentPresetSelectionAssemblyMount,session.agentPresetSelectionAssemblyMethod,session.agentPresetSelectionRemote,session.agentPresetSelectionCatalogService,agentPresets.sessionAddressedSelection,agentPresets.preparedSelectionCatalogOwner"
  echo "generators=pnpm run gen-client-catalog|pnpm run gen-cordis-api"
  echo "generated_catalogs=packages/extensions/cordis-client-runner/src/client/slot-catalog.ts,packages/extensions/tool-cordis/src/api-catalog.ts,docs/subsystems/session-projection.md,docs/subsystems/session-projection.zh.md,docs/subsystems/session-projection.i18n.yaml"
} > "$STATE_FILE"

echo "rebuilding changed Host, Remote client, and ui-workspace faces..."
(cd "$CHECKOUT" && pnpm run build:lib:host && pnpm --filter @deepseek-ai/dsh-api-remotes bundle && pnpm --filter @deepseek-ai/dsh-client-ui-workspace bundle)

echo "building dsh-preset-manager..."
bash "$REPO_DIR/scripts/build.sh"

CHECKOUT_CLI="$CHECKOUT/apps/cli/lib/bin.js"
if command -v dsh >/dev/null 2>&1; then
  echo "registering bundle into profile '$PROFILE'..."
  (cd "$REPO_DIR" && dsh plugin --profile "$PROFILE" add .)
elif command -v node >/dev/null 2>&1 && [ -f "$CHECKOUT_CLI" ]; then
  echo "registering bundle through the checkout CLI into profile '$PROFILE'..."
  (cd "$REPO_DIR" && node "$CHECKOUT_CLI" plugin --profile "$PROFILE" add .)
elif command -v pnpm >/dev/null 2>&1; then
  echo "registering bundle through pnpm into profile '$PROFILE'..."
  (cd "$REPO_DIR" && pnpm --dir "$CHECKOUT" dsh plugin --profile "$PROFILE" add .)
else
  echo "neither dsh nor pnpm is available; register the bundle manually:" >&2
  echo "  cd $CHECKOUT && pnpm dsh plugin --profile $PROFILE add $REPO_DIR" >&2
fi

echo
echo "Restart dsh web; the workspace view-options menu then offers 按预设."
