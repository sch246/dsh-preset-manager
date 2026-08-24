# AGENTS.md — dsh-preset-manager

外部 DSH 插件仓库（独立于 deepseek-harness 主仓）+ 一个最小 harness 补丁。给 AI 协作者/后续维护者的约定：

## 装配模型

- 本包是**双面 bundle 插件**：`cordis.patch.yml` 身份行（节点半身 = identity apply）+ `dsh.client`（浏览器半身）。
- **补丁路线**：`patches/harness-groupby-preset.patch` 只动 `@deepseek-ai/dsh-client-ui-workspace` 一个包（五个落点：`SessionGroupBy` 联合类型 / 菜单项 / 节标题 / 子槽声明 / 树分支），其余功能全在插件里。改补丁必须同步 DESIGN.md §3.1 与 README。
- 装配：`scripts/setup.sh`（`git apply --check` → apply → 重建 ui-workspace bundle → 构建本插件 → `dsh plugin add`）；`lib/` 与补丁产物提交进 git。
- 一切改动必须过 `bash scripts/build.sh`（DSH_CHECKOUT 指向 dsh 源码 checkout）。

## 约束（为什么这么设计）

- **RPC 表封闭**、`sidebar.workspaces` single slot 被官方浏览器占据：不新增 RPC、不替换官方浏览器；补丁只加扩展点，shadow 只用于 `conversation.hero.agentPreset`（priority -1，卸载即恢复）。
- **单一列表 + 星标模型**：`settings.default ∈ order`（I1，星标预设永远可见）、不在列表即隐藏（I2）、无星标且列表清空时 unset 默认（I3）。任何改动不得引入第二个顺序/可见性数据源；新增状态必须过 reconcile 的不变量论证。
- 默认的权威拷贝在官方 settings（host 持久）；列表与名字覆盖是插件本地 store（`dsh.presetManager.v1`），星标切换与清空时同步 `settings.default`（I3）。

## 代码纪律

- 浏览器半身：业务逻辑走 apply 闭包 / 纯函数（`roster.ts`），组件只收四个 props share（runtime / renderSlots / store / inject），不读 ctx、不手写订阅。
- 纯函数（reconcile / deriveRoster / derivePresetGroups）必须配单测（`tests/`，node + vitest）；不变量 I1–I3 每个都要有正反例。
- 样式只有 `src/client/styles.ts` 一个来源：字符串常量 + 首执行注入 `<style>`；只用 `--dsw-*` token 与语义别名，不写字面量颜色。
- 产品文案中文，注释英文；对外承诺（RPC 用法、已知限制）改完必须同步 `DESIGN.md` / `README.md`。

## 检查清单（提交前）

```bash
npm run typecheck   # host + client 两份 tsconfig
npm test            # 纯函数单测
bash scripts/build.sh   # 产物 lib/ 必须同步提交
```
