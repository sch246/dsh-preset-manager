#!/usr/bin/env bash
# 安装 dsh-preset-manager：① 校验并应用 harness 补丁（ui-workspace 五个文件）→
# ② 重建被改包 bundle → ③ 构建本插件 → ④ 注册进 profile（`dsh plugin add`）。
#
# 需要 dsh checkout（自动探测 DSH_CHECKOUT / /root/deepseek-harness /
# ~/deepseek-harness）与 dsh CLI。尊重 DSH_PROFILE；缺省 web。重启 dsh web 生效。
# 任一步失败即中止（set -e）。
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

PATCH="$REPO_DIR/patches/harness-groupby-preset.patch"
if [ -f "$PATCH" ]; then
  echo "checking harness patch against $CHECKOUT..."
  if ! git -C "$CHECKOUT" apply --check "$PATCH"; then
    echo "setup: the harness patch does not apply (dsh upgraded?) — adapt the patch first" >&2
    exit 1
  fi
  if git -C "$CHECKOUT" apply --check --reverse "$PATCH" 2>/dev/null; then
    echo "applying harness patch..."
    git -C "$CHECKOUT" apply "$PATCH"
  else
    echo "harness patch already applied; skipping apply"
  fi
  echo "rebuilding ui-workspace bundle..."
  (cd "$CHECKOUT" && pnpm --filter @deepseek-ai/dsh-client-ui-workspace bundle)
fi

echo "building dsh-preset-manager..."
bash "$REPO_DIR/scripts/build.sh"

if command -v dsh >/dev/null 2>&1; then
  echo "registering bundle into profile '$PROFILE'..."
  (cd "$REPO_DIR" && dsh plugin --profile "$PROFILE" add .)
else
  echo "dsh CLI not found; register the bundle manually from this repo:"
  echo "  dsh plugin --profile $PROFILE add ."
fi

echo
echo "Restart dsh web; the workspace view-options menu then offers the third item 按预设."
