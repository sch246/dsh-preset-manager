# AGENTS.md — dsh-preset-manager

外部 DSH 插件仓库（独立于 deepseek-harness 主仓）。给 AI 协作者/后续维护者的约定：

## 装配模型

- 本包是**双面 bundle 插件**：`cordis.patch.yml` 身份行（节点半身 = identity apply）+ `dsh.client`（浏览器半身）。
- 装配通道与 dsh-super-injector 同源：`dsh plugin --profile web add .`；`lib/` 提交进 git，git 地址安装零构建。
- 一切改动必须过 `bash scripts/build.sh`（DSH_CHECKOUT 指向 dsh 源码 checkout）。

## 约束（为什么这么设计）

- **不改 harness 主仓**。RPC 表封闭、`sidebar.workspaces` single slot 被官方浏览器占据：所有功能只能走现有 RPC + 官方预留 slot（footer.action list slot）+ single-slot 的 priority shadow。
- **零新增 RPC**：能落客户端 store 的状态（order/hidden/overrides）不发明服务端接口；默认星标复用官方 `settings.update`（`agent-presets.default`）。
- **shadow 只用于 `conversation.hero.agentPreset`**：priority -1 注册，卸载即恢复官方 chip；不 shadow 其它 single slot。

## 代码纪律

- 浏览器半身：业务逻辑走 apply 闭包 / 纯函数（`roster.ts`），组件只收四个 props share（runtime / renderSlots / store / inject），不读 ctx、不手写订阅。
- 纯函数（名单合并、分组派生）必须配单测（`tests/`，node + vitest）。
- 样式只有 `src/client/styles.ts` 一个来源：字符串常量 + 首执行注入 `<style>`；只用 `--dsw-*` token 与语义别名，不写字面量颜色。
- 产品文案中文，注释英文；对外承诺（RPC 用法、已知限制）改完必须同步 `DESIGN.md` / `README.md`。

## 检查清单（提交前）

```bash
npm run typecheck   # host + client 两份 tsconfig
npm test            # 纯函数单测
bash scripts/build.sh   # 产物 lib/ 必须同步提交
```
