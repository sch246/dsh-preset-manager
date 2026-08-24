#!/usr/bin/env bash
# 卸载 dsh-preset-manager：回滚 harness 补丁 + 从 profile 移除 bundle。
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECKOUT="${DSH_CHECKOUT:-}"
for CANDIDATE in "$CHECKOUT" /root/deepseek-harness "$HOME/deepseek-harness"; do
  if [ -n "$CANDIDATE" ] && [ -d "$CANDIDATE/packages" ]; then
    CHECKOUT="$CANDIDATE"
    break
  fi
done

PATCH="$REPO_DIR/patches/harness-groupby-preset.patch"
if [ -f "$PATCH" ]; then
  if [ -z "${CHECKOUT:-}" ] || [ ! -d "$CHECKOUT/packages" ]; then
    echo "uninstall: cannot locate the dsh checkout (set DSH_CHECKOUT) to roll back the patch" >&2
    exit 1
  fi
  if git -C "$CHECKOUT" apply --check --reverse "$PATCH" 2>/dev/null; then
    echo "rolling back harness patch..."
    git -C "$CHECKOUT" apply --reverse "$PATCH"
    echo "rebuilding ui-workspace bundle..."
    (cd "$CHECKOUT" && pnpm --filter @deepseek-ai/dsh-client-ui-workspace bundle)
  else
    echo "uninstall: patch not applied (or already rolled back); skipping"
  fi
fi

if command -v dsh >/dev/null 2>&1; then
  echo "removing bundle from profile '${DSH_PROFILE:-web}'..."
  (cd "$REPO_DIR" && dsh plugin --profile "${DSH_PROFILE:-web}" remove dsh-preset-manager) \
    || echo "uninstall: dsh plugin remove failed — remove 'dsh-preset-manager' from the profile manually"
else
  echo "dsh CLI not found; remove 'dsh-preset-manager' from the profile dependencies manually"
fi

echo "uninstall complete. Restart dsh web."
