# AGENTS.md — dsh-preset-manager

外部 DSH 插件仓库（独立于 deepseek-harness 主仓）+ 一个最小 harness 补丁。给 AI 协作者/后续维护者的约定：

## 意图包入口

- 本仓库的语义包位于 `.intent/`：先读 `.intent/state/STATE.json`、`.intent/state/STATE.md`，再按其中选择的协议解释 `logs/` 与 `locks/`。
- 当前 state 是从设计、实现和 Git 历史反向重构的 draft；没有发现用户逐字原话。不得把现有代码、`DESIGN.md` 或运行结果静默提升为用户确认。
- `.intent/logs/` 保存来源调查与后续 authority event；`.intent/state/` 是当前语义投影；`.intent/locks/` 只保存或引用已提交、可核验的具体实现。工作树未提交时不得伪造 reference-backed lock。

## 装配模型

- 本包是**双面 bundle 插件**：`cordis.patch.yml` 身份行（节点半身 = identity apply）+ `dsh.client`（浏览器半身）。
- **补丁路线**：`patches/harness-groupby-preset.patch` 只动 `@deepseek-ai/dsh-client-ui-workspace` 一个包：增加 preset 分组模式、子 slot，以及由 Workspace owner 提供的官方 Session 投影与行渲染席位。具体落点随目标 harness 版本演进；改补丁必须同步 DESIGN.md §3.1 与 README。
- 装配：`scripts/setup.sh`（`git apply --check` → apply → 重建 ui-workspace bundle → 构建本插件 → `dsh plugin add`）；`lib/` 与补丁产物提交进 git。
- 一切改动必须过 `bash scripts/build.sh`（DSH_CHECKOUT 指向 dsh 源码 checkout）。

## 约束（为什么这么设计）

- **RPC 表封闭**、`sidebar.workspaces` single slot 被官方浏览器占据：不新增 RPC、不替换官方浏览器；补丁只加扩展点，shadow 只用于 `conversation.hero.agentPreset`（priority -1，卸载即恢复）。
- **Workspace 行是唯一呈现权威**：插件通过 owner contract 消费官方 Session 投影、行渲染回调和必需的重命名／分叉／归档动作，只提供说明、预设操作和项目标识；禁止运行时导入 ui-workspace 组件、复制行 CSS、重写状态点／菜单／折叠／溢出／拖拽命中规则。跨包只允许类型导入。
- **完整顺序 + hidden + Host 默认模型**：`order` 是全部现存预设的稳定顺序，`hidden` 是独立可见性集合，官方 default 是独立权威；显式 `schemaVersion + initialized` 区分首次安装、旧 v1 升级与日后新增。`default ∉ hidden`（I1）、新增/删除由 reconcile 合入完整顺序（I2）、无默认且全部隐藏时 unset 默认（I3）。不得再用空 order 或“不在 order”猜安装状态，也不得引入第二条顺序或可见性写链。
- 默认的权威拷贝在官方 settings（host 持久）；列表与名字覆盖是插件本地 store（历史 key `dsh.presetManager.v1`，当前 schema v2）。开始聊天页是唯一默认写入口：再次选择当前非默认项写 `settings.default`，侧栏不提供默认控件；I3 只负责清空默认。

## 代码纪律

- 浏览器半身：业务逻辑走 apply 闭包 / 纯函数（`roster.ts`），组件只收四个 props share（runtime / renderSlots / store / inject），不读 ctx、不手写订阅。
- 纯函数（reconcile / deriveRoster / derivePresetGroups）必须配单测（`tests/`，node + vitest）；不变量 I1–I3 每个都要有正反例。
- 插件自有装饰样式只有 `src/client/styles.ts` 一个来源：字符串常量 + 首执行注入 `<style>`；只用 `--dsw-*` token 与语义别名，不写字面量颜色，也不覆盖官方行布局。
- 产品文案中文，注释英文；对外承诺（RPC 用法、已知限制）改完必须同步 `DESIGN.md` / `README.md`。

## 检查清单（提交前）

```bash
npm run typecheck   # host + client 两份 tsconfig
npm test            # 纯函数单测
bash scripts/build.sh   # 产物 lib/ 必须同步提交
```
