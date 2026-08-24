# dsh-preset-manager 详细设计

> 状态：v3，待评审。v3 按评审决定修订：**补丁路线**（官方"视图选项"菜单加"按预设"）+ **单一有序列表 + 星标**（列表管顺序与可见性，星标管默认，星标预设永远可见）。
> 配套：`README.md`（产品说明）、`patches/`（harness 补丁）、`scripts/`（构建/安装）。

## 1. 目标与范围

以**独立仓库、外部插件**（+ 一个最小 harness 补丁）为 DeepSeek Harness Web GUI 提供：

1. **按预设分组浏览会话**：官方"视图选项"菜单里出现第三项"按预设"，会话列表按 agent preset 分组（形式与"按工作区"一致）。
2. **预设显示层管理**，由「一个有序列表 + 一个星标」承载：
   - 列表顺序 = 预设显示顺序 = 新会话选择器的顺序；
   - **不在列表 = 隐藏**（不出现在新会话选择器；分组树中置灰并固定排在显示列表末尾）；
   - **★ 星标 = 默认预设**（写入官方 `agent-presets.default`；星标预设永远可见，不可能被隐藏）；
   - 拖拽组行改顺序；点星标切换默认；`⋯` 菜单：重命名（显示名+说明）/ 隐藏 / 取消隐藏；
   - 点击预设组行 **+** 以该预设开始新会话。
3. **明确不做**：删除预设、删除会话。

## 2. 外部插件的能力边界（代码核实结论）

| 事项 | 结论 | 依据 |
|---|---|---|
| 会话带 preset 信息 | `SessionSummary.agentPreset` 已在客户端列表里 | `client/runtime/.../sessions/service.ts` |
| 预设名单 | `agentPreset.list` 现成（id/trust/isDefault/name/description/broken） | `host/apiproxy/src/api/agent-presets.ts` |
| 开新会话指定预设 | `session.create({ agentPreset })` / `agentPreset.select` 现成 | `host/apiproxy/src/api/sessions.ts` |
| 写/清默认 | `settings.update` / `settings.mutate(op: unset)` 现成（官方同款路径） | `ui-agent-preset/.../settings-store.ts`、`rpc-map.ts` |
| **新增 RPC** | 不可行：`RpcMethodMap` 编译期封闭 | `host/apiproxy/src/api/rpc-map.ts` |
| 官方菜单加"按预设" | 需改 ui-workspace（`SessionGroupBy` 闭包 + 菜单项 + 树分支）——**本设计的补丁目标** | `client/ui-workspace/src/client/{stores,WorkspaceBrowser}.tsx` |
| 补丁后的扩展点 | ui-workspace 的 register 可声明新 child slot，本插件注册进去填充 preset 模式主体 | `client/ui-workspace/src/client/index.ts` |
| 新会话选择器 | `conversation.hero.agentPreset` single slot，priority shadow 合法接管 | `ui-slots/src/index.ts` |

## 3. 集成形态：补丁路线（已选定）

### 3.1 补丁内容（`patches/harness-groupby-preset.patch`）

只动 `@deepseek-ai/dsh-client-ui-workspace` 一个包，五个文件、约 165 行（git apply 风格 unified diff）：

1. **`stores.ts`**：`SessionGroupBy` 联合类型加 `'preset'`：
   ```ts
   export type SessionGroupBy = 'workspace' | 'flat' | 'preset'
   ```
2. **`locales.ts`**：zh `'groupBy.preset': '按预设'`，en `'By preset'`；节标题键 `section.presets`（zh `'预设'` / en `'Presets'`）。
3. **`contract/slots.ts`**：SlotMap 增补子槽键，导出 owner props `PresetGroupsOwnerProps { wide: boolean; query: string }`；同时把 `WorkspaceBrowserProps` 的渲染槽联合扩为
   `'sidebar.workspaces.directoryFlow' | 'sidebar.workspaces.presetGroups'`
   （否则 `renderSlot` 的类型面只认得 directoryFlow 一个子键）。
4. **`client/index.ts`** register 调用的 `children` 表增补：
   ```ts
   'sidebar.workspaces.presetGroups': { kind: 'single', scope: 'root' }
   ```
5. **`WorkspaceBrowser.tsx`**：
   - `ViewOptionsMenu` 菜单项加 `{ id: 'preset', label: t('groupBy.preset') }`；`groupBy`/`onGroupPick` 改收 `SessionGroupBy`；
   - 列表主体分支：`groupBy === 'preset'` 时优先渲染
     `renderSlot('sidebar.workspaces.presetGroups', { wide, query: normalizedQuery })`
     （preset 模式下搜索态交给插件树做标题过滤，不再走全局内容搜索）；
   - 节标题：`'preset'` 时用 `t('section.presets')`。

补丁**不**改：搜索栏本身、"添加工作区"按钮（preset 模式下保留，v1 可接受）、工作区/扁平两模式的任何逻辑。

### 3.2 插件注册（补丁之后的扩展点）

```ts
ctx.slots.inject('sidebar.workspaces.presetGroups', () => ctx.slots.register({
  name: 'sidebar.workspaces.presetGroups',
  store: createPresetManagerStore(),
  inject: presetBrowserInjected,   // 名单读写、会话动作回传
}, PresetGroups))
```

`PresetGroups`（本插件的分组树）只依赖四个 props share：
- `PropsRuntime<'sidebar.workspaces.presetGroups'>`：`useSessions` / `useWorkspaces`（root scope，会话数据现成）+ owner props `{ wide, query }`；
- `PropsStore`：本插件 store（有序列表 + overrides）；
- inject face：`loadRoster()`、`open(id)`、`startSessionByPreset(id)`、`setDefault(id)` 等。

### 3.3 补丁的安装与回滚（`scripts/`）

- `scripts/setup.sh`：`git -C <DSH_CHECKOUT> apply --check patches/harness-groupby-preset.patch` → 通过则 `apply`；重建被改包（`pnpm --filter @deepseek-ai/dsh-client-ui-workspace bundle`）；再构建本插件并 `dsh plugin add`。任一步失败即中止并提示。
- `scripts/uninstall.sh`：`git apply -R` 回滚补丁 + `dsh plugin remove`（如可用，否则提示手动）。
- 升级冲突：dsh 升级后补丁可能不适用；`--check` 先行检测，冲突时给出提示而不是硬打。补丁只依赖 stable 的五个落点，维护成本低。

### 3.4 新会话选择器接管（shadow，保留）

官方 chip 在 conversation scope 注册；本插件同 scope、`priority: -1` 注册 `SeatChip`（shadow 合法，卸载即恢复官方 chip）：

```ts
ctx.inject(['slots', 'conversation', 'sessions', 'workspaces', 'connection'], (scope) => {
  scope.slots.register({
    name: 'conversation.hero.agentPreset',
    priority: -1,
    inject: /* seat 同款：load/select + 隐藏过滤 */,
  }, SeatChip)
})
```

`SeatChip` 复刻官方 stage→apply 语义，名单换成派生名单：**只含列表成员（隐藏的不出现）、按列表顺序、显示覆盖名**；初始选中 = 星标（默认）预设。

## 4. 数据模型：单一有序列表 + 星标（不变量驱动）

### 4.1 store（本插件声明，`persist: 'dsh.presetManager.v1'`）

```ts
interface PresetManagerState {
  /** 有序列表 = 可见预设集合：顺序即显示顺序；不在列表即隐藏。 */
  order: string[]
  /** 显示名/说明覆盖（重命名落点）。 */
  overrides: Record<string, { name?: string; description?: string }>
}
```

默认（星标）**不存本地**：权威拷贝在官方 settings 的 `agent-presets.default`，roster 的 `isDefault` 即星标状态。

不变量（reconcile 强制成立）：

- **I1 星标预设永远可见**：`settings.default ∈ order`（order 非空时）。默认预设不可能被隐藏——这是"不可能冲突的结构"的直接形式。
- **I2 不在列表即隐藏**：列表 = 全部可见预设。新出现的预设（官方设置页新建）reconcile 时**追加到末尾**（默认可见）；被删除的预设从列表剔除。
- **I3 无星标且列表清空**：官方 default 被 **unset**（`settings.mutate`），新会话回落到部署默认。有星标时列表不可能清空（I1 挡住对星标预设的隐藏）。

### 4.2 reconcile（每次 load / `settings/document-updated` / 本插件写后回读）

1. `order := order ∩ 现存预设 id`；新 id 追加到末尾；
2. 若 `roster.isDefault` 指向的预设存在且不在 `order`：**取消隐藏并追加到末尾**（外部把隐藏预设设为默认 → 自动可见）；
3. 若 default 已被删除且本插件曾写过它：roster 会回落（host 侧 remove 时自动清 default），reconcile 只需跟随 `isDefault`；
4. 本插件写操作的顺序：先改 `order`（必要时），再写 settings（`update default` / `mutate unset`）；事件回读后 I1–I3 已成立，幂等。

### 4.3 派生（纯函数，单测目标）

```ts
deriveRoster(presets, state)            // → { id, displayName, description, isDefault, hidden, broken, trust }[]
reconcile(presets, order)               // → 新的 order（I1/I2 强制成立）
planHide / planUnhide / shouldUnsetDefault   // 隐藏/取消隐藏/清空默认的纯决策
derivePresetGroups(list, roster, order, archivedSessionIds, query)  // → 组树
```

- 显示名 = `overrides[id].name ?? preset.name ?? id`；
- 组内会话按 `updatedAt` 倒序（v1 无组内拖拽）；
- 组树布局：可见预设组按 `order` 顺序 → 隐藏预设组（置灰、不可拖拽、星标/隐藏外的操作照常，固定排在所有可见组之后，内部按 roster 顺序）→ “未分组”兜底组最后（工作区浏览器惯例）；`order` 只含可见项；
- 可见性照搬官方：非 subagent、未归档、blank 仅当前；
- `query`（浏览器搜索态）在 preset 模式下交给组树做标题过滤：组标题或组内会话标题匹配则保留组，非空时组内会话行同步过滤。

## 5. 使用的 RPC（全部现有，零新增）

| 动作 | RPC / 通道 | 说明 |
|---|---|---|
| 读名单 | `agentPreset.list({})` | 分组树加载 / `connection/reset` / 本插件写后回读 |
| 写默认（星标） | `settings.update({ ns:'agent-presets', patch:{ default: id } })` | 点星标 |
| 清默认 | `settings.mutate({ ns:'agent-presets', ops:[{ op:'unset', path:['default'] }] })` | 仅 I3（无星标且列表清空） |
| 默认被外部改 | `remote.$on('settings/document-updated', ns==='agent-presets')` → reconcile | 官方设置页与插件互相同步 |
| 开新会话（+） | `workspaces.startSession(target)` → 空白会话 current 后 `agentPreset.select({ sessionId, agentPreset })` | 复用官方 seat 的 stage→apply 语义 |
| 打开会话 | `ctx.sessions.open(id)` | 现有服务动词 |
| 排序/隐藏/改名 | 无 RPC，落 §4.1 的本地 store | 显示层数据 |

**+ 按钮 workspace 目标**（照搬 `workspaces.startSession`）：当前会话所在 workspace → 最近 workspace → 无 workspace 则无操作（给出提示）。

## 6. 组件结构

```
src/client/
├── index.ts            # apply：store 工厂 + roster/seat 控制器 + presetGroups 注册 + shadow SeatChip
├── stores.ts           # createPresetManagerStore + actions（setOrder/reconcileOrder/setOverride）
├── roster.ts           # deriveRoster / derivePresetGroups / reconcile / planHide…（纯函数）
├── locales.ts          # presetManager 命名空间字典（zh/en）
├── styles.ts           # 内联 CSS 字符串（--dsw-* token），首执行注入 <style>
├── PresetGroups.tsx    # 分组树：搜索过滤(query) / 组行 / 拖拽 / 未分组
├── PresetGroupRow.tsx  # 组头：★星标 / 名称+说明 / 会话数 / 展开 / + / ⋯ / 拖拽手柄
├── PresetMenu.tsx      # ⋯：重命名 / 隐藏(取消隐藏)
├── RenameDialog.tsx    # 重命名（name + description）
├── SessionRow.tsx      # 会话行：标题 / workspace 标签 / 运行点 / 时间
└── SeatChip.tsx        # shadow 接管的新会话选择器
```

### 6.1 操作语义（单列表 + 星标）

| 用户动作 | store 变化 | settings 同步 |
|---|---|---|
| 点 ★（可见预设） | 无 | `default = 该预设` |
| 点 ★（隐藏预设） | 取消隐藏：追加到 `order` 末尾 | `default = 该预设` |
| 隐藏（非星标） | 从 `order` 移除 | 无 |
| 隐藏（星标预设） | **拒绝** + 提示"默认预设不能被隐藏，请先星标另一个预设" | 无 |
| 全部隐藏 | 仅无星标时可能 | `mutate unset default` |
| 拖拽组行 | `order` 重排（与默认无关） | 无 |
| 重命名 | `overrides` 更新 | 无 |
| 外部改默认 | reconcile：若目标被隐藏则取消隐藏并追加 | 已成立 |
| 外部新建预设 | reconcile：追加到末尾（可见） | 无 |

取消隐藏追加到末尾 = "隐藏顺序丢失"的已确认取舍；默认位置在列表里自由（星标与顺序解耦）。隐藏组行"置灰 + 排到显示末尾"是纯展示规则：`order` 只存可见项，隐藏项的顺序不保留。

## 7. 关键流程

1. **启动/刷新**：load roster → reconcile（I1/I2）→ 渲染分组树（星标预设显示实心 ★）。
2. **星标切换**：写 `settings.default` → 回读 roster → 星标移动；隐藏预设上的星标同时取消隐藏。
3. **隐藏**：从 `order` 移除 → 组行保留但**置灰并固定在显示列表末尾**（同工作区浏览器的归档交互）→ shadow chip 不再出现该预设；星标预设的隐藏被拒绝。
4. **以预设开始新会话**：见 §5。
5. **重命名**：对话框写 `overrides`；不改 id、不写 `preset.yml`。

## 8. 已知限制（v1）

1. 需要 harness 补丁（ui-workspace 一个包，60–80 行）并重建 web bundle；dsh 升级时补丁可能需重新适配（`--check` 先测）。
2. 重命名是显示层覆盖：不写 `preset.yml`，官方设置页"预设"节仍显示原名；不改 id。
3. 顺序/隐藏只影响分组树 + shadow chip；官方设置页预设列表保持 host 顺序。
4. 组内会话固定按最近更新排序（v1）。
5. 无 workspace 时 + 无操作。
6. 列表存于浏览器 localStorage（`dsh.presetManager.v1`，与 `dsh.workspace.view.v5` 同级先例），不跨浏览器共享；默认值本身在官方 settings 里（host 持久）。

## 9. 阶段与工作量（单人）

| 阶段 | 内容 | 估时 |
|---|---|---|
| P0 | 生成 `patches/harness-groupby-preset.patch`，apply + 重建 ui-workspace bundle + 验证菜单第三项出现 | 0.5 天 |
| P1 | 插件骨架 + 分组树（组行/会话行/未分组/搜索过滤）+ 打开会话 + + 新会话 | 1–1.5 天 |
| P2 | 管理：星标、拖拽、隐藏/取消隐藏、重命名、reconcile、shadow SeatChip | 1.5–2 天 |
| P3 | 打磨：空态/错误路径、uninstall 脚本验证、README 完整化、真机全流程验证 | 1 天 |

总计约 **4–5 个工作日**。

## 10. 测试与验证

- 单测（vitest，纯函数）：`reconcile`（I1/I2/I3 全部场景：外部改默认、隐藏星标预设被拒、新建预设、删除预设、全隐藏）、`deriveRoster`、`derivePresetGroups`。
- 真机验证：补丁 apply → 重建 → 插件装配 → 手工过全部流程；重点验证 shadow chip 与官方设置的默认互同步。
- 仓库门禁从简：`typecheck` + 单测 + `build`；harness 重量门禁不适用于外部仓库。

## 11. 仓库布局（含补丁）

```
dsh-preset-manager/
├── patches/
│   └── harness-groupby-preset.patch   # ui-workspace 的 5 个文件（git apply 风格 unified diff）
├── scripts/
│   ├── build.sh        # junction 链接 checkout 依赖 + tsc + tsdown
│   ├── setup.sh        # 补丁 --check+apply → 重建 ui-workspace bundle → 构建本插件 → dsh plugin add
│   └── uninstall.sh    # 回滚补丁 + 卸 bundle
├── src/index.ts        # 节点半身：identity apply（装配锚点）
├── src/client/         # 浏览器半身（§6）
├── tests/              # 纯函数单测（reconcile / roster / grouping / planHide）
├── vitest.config.ts    # node 环境单测配置
├── DESIGN.md / README.md / AGENTS.md
└── lib/                # 构建产物，随源码提交
```
