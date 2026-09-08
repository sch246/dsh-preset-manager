<!-- meta-intent:entry:start -->
## Intent-package entry

Maintain an executable installation and maintenance map as user understanding, upstream software and environments change. The first map can be incomplete; use user feedback and checked reality to improve it, rather than making accumulated implementation debt the permanent design.

- Start with [this package's STATE](.intent/state/STATE.md) and the user's request. STATE tells an unfamiliar Agent which effects to provide, why they matter, where to find resources, and how to install, adapt, verify and remove them under applicable conditions. Keep every supported capability reachable from that map.
- Before writing, distinguish the information's role. STATE owns intended effects and reusable operational guidance. LOG owns selected actual decisions, observations and their reasons; historical implementation gaps, debt inventories and task progress belong there or in a disposable work record. Keep conditions and adaptation steps needed to act in STATE, without turning it into a status table. LOCK retains an exact purpose-bound realization, not permanent requirements. Do not turn this distinction into a mandatory document transaction for each repair.
- Inspect the target and recover relevant existing decisions before inferring new requirements. Code, tests and past installations are evidence about implementations; they do not decide user intent. Optional cooperation does not establish a required dependency. Change STATE when feedback clarifies an effect or experience improves the executable route, not merely because current code differs.
- Maintain confirmed intent in STATE, not a parallel product-behavior test suite. Do not routinely add tests to obtain confidence in an inferred interpretation. Retain useful externally grounded contract and mechanical-invariant checks; remove superseded UI/behavior expectations and unused test scaffolding within the authorized scope. A test is evidence, not a veto over clarified intent, and retained tests need not run for unrelated changes.
- Act within the user's existing authority. Read selected sources when why, scope or attribution matters; do not replay every LOG. Choose checks that resolve a real uncertainty at reasonable cost, and distinguish observed results from unperformed checks.
- This entry routes attention; it does not replace STATE or the selected protocol. Follow the package's state record for protocol/binding changes. See [meta-intent's map](../meta-intent/state/STATE.md) when maintaining this guidance or when the roles themselves are unclear.
<!-- meta-intent:entry:end -->

# AGENTS.md — dsh-preset-manager

外部 DSH 插件仓库（独立于 deepseek-harness 主仓）+ 一个最小 harness 补丁。给 AI 协作者/后续维护者的约定：

## 意图包入口

- 本仓库的语义包位于 `.intent/`：先读 `.intent/state/STATE.json`、`.intent/state/STATE.md`，再按其中选择的协议解释 `logs/` 与 `locks/`。
- 当前 STATE 保留重构来源、后来补入的用户原话与后续反馈；入口见 [STATE](.intent/state/STATE.md) 和 [用户原话](.intent/logs/2026-08-26-user-original-intent.md)。不得把代码、`DESIGN.md` 或运行结果静默提升为用户确认。
- `.intent/logs/` 保存来源调查与后续 authority event；`.intent/state/` 是当前语义投影；`.intent/locks/` 只保存或引用已提交、可核验的具体实现。工作树未提交时不得伪造 reference-backed lock。

## 装配模型

- 本包是**双面 bundle 插件**：`packages/dsh-preset-manager/cordis.patch.yml` 身份行（节点半身 = identity apply）+ `dsh.client`（浏览器半身）。
- **补丁路线**：`patches/harness-groupby-preset.patch` 增加 ui-workspace preset 分组席位，并让 session projection cache 向列表报告和有界回填缺失的当前客户端投影。具体落点随目标 harness 版本演进；改补丁必须同步 DESIGN.md §3.1、`patches/README.md` 与 README。
- 装配：`scripts/setup.sh --install`（`git apply --check` → apply → 重生成共享 catalog → 构建 Host 与 ui-workspace → 构建本插件 → `dsh plugin add`）；`packages/dsh-preset-manager/lib/` 与静态补丁提交进 git，共享生成物不由补丁独占。
- 运行时与构建改动执行 `bash scripts/build.sh`（DSH_CHECKOUT 指向所选 dsh checkout）；纯地图/文档改动检查引用、JSON 和 diff，不为此重建或安装插件。

## 约束（为什么这么设计）

- **RPC 表封闭**、`sidebar.workspaces` single slot 被官方浏览器占据：不新增 RPC、不替换官方浏览器；补丁只加扩展点，shadow 只用于 `conversation.hero.agentPreset`（priority -1，卸载即恢复）。
- **Workspace 行是唯一呈现权威**：插件通过 owner contract 消费官方 Session 投影、行渲染回调和必需的重命名／分叉／归档动作，只提供说明、预设操作和项目标识；禁止运行时导入 ui-workspace 组件、复制行 CSS、重写状态点／菜单／折叠／溢出／拖拽命中规则。跨包只允许类型导入。
- **完整顺序 + hidden + 显式用户默认**：`order` 是全部现存预设的稳定顺序，`hidden` 是独立可见性集合，官方 settings 的 user 层 default 是独立权威；部署 fallback 不冒充用户选择。显式 `schemaVersion + initialized` 区分首次安装、旧 v1 升级与日后新增。`default ∉ hidden`（I1）、新增/删除由 reconcile 合入完整顺序（I2）、无默认且全部隐藏时 unset 默认（I3）。不得再用空 order 或“不在 order”猜安装状态，也不得引入第二条顺序或可见性写链。
- 默认的权威拷贝在官方 settings user 层（host 持久）；列表与名字覆盖是插件本地 store（历史 key `dsh.presetManager.v1`，当前 schema v2）。开始聊天页是唯一默认写入口：再次选择当前非默认项写 `settings.default`，再次选择当前显式默认项清除它并保留本次选择，侧栏不提供默认控件；无显式默认时依次使用最近 Session 预设和 managed order 第一项。默认写响应和 settings mirror 更新只投影当前 roster 的默认标记；除外部默认指向 hidden 时精确取消该 hidden 外，不得读取名单、发布 loading、reconcile order/hidden 或改写本地 store。初始加载、失败重试与 `connection/reset` 才刷新 roster 生命周期。

## 代码纪律

- 浏览器半身：业务逻辑走 apply 闭包 / 纯函数（`roster.ts`），组件只收四个 props share（runtime / renderSlots / store / inject），不读 ctx、不手写订阅。
- STATE 是唯一行为权威；本插件不维护复述实现语义的代码测试，以免 LLM 误读意图后让代码与测试互相证明。`typecheck` / `build` 只检查机械完整性，行为由真实 Web UI 与 settings 持久化（含刷新、重启）直接对照 STATE 验收。
- 插件自有装饰样式只有 `packages/dsh-preset-manager/src/client/styles.ts` 一个来源：字符串常量 + 首执行注入 `<style>`；只用 `--dsw-*` token 与语义别名，不写字面量颜色，也不覆盖官方行布局。
- 产品文案中文，注释英文；对外承诺（RPC 用法、已知限制）改完必须同步 `DESIGN.md` / `README.md`。

## 运行时改动检查（提交前）

```bash
node scripts/build.mjs typecheck   # host + client 两份 tsconfig
bash scripts/build.sh   # 产物 lib/ 必须同步提交
```
