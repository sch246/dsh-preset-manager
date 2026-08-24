#!/usr/bin/env bash
# 安装 dsh-preset-manager：构建（需要 dsh checkout，自动探测 DSH_CHECKOUT /
# /root/deepseek-harness / ~/deepseek-harness），然后把本包注册进 web profile
# （`dsh plugin add` = profile 目录里 pnpm 安装 + bundles 列表登记）。
#
# 尊重 DSH_PROFILE；缺省 web。重启 dsh web 生效。
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE="${DSH_PROFILE:-web}"

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
echo "Restart dsh web, then click the preset-manager button in the sidebar footer."
