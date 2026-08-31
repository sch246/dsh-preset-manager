#!/usr/bin/env bash
# 构建 dsh-preset-manager：先 junction 链接 dsh checkout 的 workspace 依赖，
# 再用 checkout 的 tsc 产出 host 类型/半身，最后 tsdown 打出两条 bundle。
# 需要 DSH_CHECKOUT 指向 dsh 源码 checkout（缺省探测 /root/deepseek-harness）。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CHECKOUT="${DSH_CHECKOUT:-}"
for CANDIDATE in "$CHECKOUT" /root/deepseek-harness "$HOME/deepseek-harness"; do
  if [ -n "$CANDIDATE" ] && [ -d "$CANDIDATE/packages" ]; then
    CHECKOUT="$CANDIDATE"
    break
  fi
done
if [ -z "${CHECKOUT:-}" ] || [ ! -d "$CHECKOUT/packages" ]; then
  echo "build: cannot locate the dsh checkout (set DSH_CHECKOUT)" >&2
  exit 1
fi

TSC="$CHECKOUT/node_modules/.bin/tsc"
if [ ! -x "$TSC" ]; then
  echo "build: tsc not found at $TSC" >&2
  exit 1
fi
TSDOWN="$CHECKOUT/node_modules/.bin/tsdown"
if [ ! -x "$TSDOWN" ]; then
  echo "build: tsdown not found at $TSDOWN" >&2
  exit 1
fi

link_pkg() {
  local link="node_modules/$1"
  local target="$CHECKOUT/$2"
  if [ ! -e "$target" ]; then
    echo "build: dependency target missing: $target" >&2
    exit 1
  fi
  node -e "
    const fs = require('fs');
    const path = require('path');
    const link = path.resolve(process.argv[1]);
    const target = path.resolve(process.argv[2]);
    fs.rmSync(link, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(link), { recursive: true });
    fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
  " "$link" "$target"
}

echo "=== Linking build dependencies (checkout: $CHECKOUT) ==="
mkdir -p node_modules/@deepseek-ai node_modules/@types

# 类型/编译依赖（类型导入会被编译期擦除，不进 bundle）：
link_pkg @deepseek-ai/cordis vendor/cordis
link_pkg @deepseek-ai/dsh-client-store packages/client/store
link_pkg @deepseek-ai/dsh-client-ui-slots packages/client/ui-slots
link_pkg @deepseek-ai/dsh-client-ui-primitives packages/client/ui-primitives
link_pkg @deepseek-ai/dsh-api-remotes packages/api/remotes
link_pkg @deepseek-ai/dsh-api-session-controller packages/api/session-controller
link_pkg @deepseek-ai/dsh-api-workspace-controller packages/api/workspace-controller
link_pkg @deepseek-ai/dsh-client-locale packages/client/locale
link_pkg @deepseek-ai/dsh-client-ui-conversation packages/client/ui-conversation
link_pkg @deepseek-ai/dsh-client-ui-renderer packages/client/ui-renderer
link_pkg @deepseek-ai/dsh-client-ui-session packages/client/ui-session
link_pkg @deepseek-ai/dsh-client-ui-workspace packages/client/ui-workspace
link_pkg @deepseek-ai/dsh-session packages/core/session
link_pkg @types/node node_modules/@types/node

# React 与类型（仅类型检查；bundle 里是模块表 external）：
link_pkg react packages/client/ui-renderer/node_modules/react
link_pkg react-dom packages/client/ui-renderer/node_modules/react-dom
link_pkg @types/react packages/client/ui-renderer/node_modules/@types/react
link_pkg @types/react-dom packages/client/ui-renderer/node_modules/@types/react-dom
link_pkg vitest packages/test-support/client-runtime/node_modules/vitest

echo "=== Compiling host half src → lib (tsc $("$TSC" --version)) ==="
"$TSC" -p tsconfig.json

echo "=== Emitting client declarations src/client → lib/types (tsc) ==="
"$TSC" -p tsconfig.client.json --noEmit false --declaration --emitDeclarationOnly --rootDir src/client --outDir lib/types/client

echo "=== Bundling lib/index.js + lib/client.js (tsdown) ==="
"$TSDOWN"

echo "=== Build complete ==="
ls -la lib/ lib/types/ 2>/dev/null || true
