# dsh-preset-manager 详细设计

> 状态：v2，待评审。本版本按评审决定重写：**补丁路线**（官方"视图选项"菜单加"按预设"）+ **单一有序列表模型**（首项即默认、不在列表即隐藏）。
> 配套：`README.md`（产品说明）、`patches/`（harness 补丁）、`scripts/`（构建/安装）。

## 1. 目标与范围

以**独立仓库、外部插件**（+ 一个最小 harness 补丁）为 DeepSeek Harness Web GUI 提供：

1. **按预设分组浏览会话**：官方"视图选项"菜单里出现第三项"按预设"，会话列表按 agent preset 分组（形式与"按工作区"一致）。
2. **预设显示层管理**，全部落在**一个有序列表**上：
   - 列表顺序 = 预设显示顺序 = 新会话选择器的顺序；
   - **列表首项 = 默认预设**（同步写入官方 `agent-presets.default`）；
   - **不在列表 = 隐藏**（不出现在新会话选择器）；
   - 拖拽组行改顺序；`⋯` 菜单：设为默认 / 重命名（显示名+说明）/ 隐藏 / 取消隐藏；
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

只动 `@deepseek-ai/dsh-client-ui-workspace` 一个包，约 60–80 行，五个落点：

1. **`stores.ts`**：`SessionGroupBy` 联合类型加 `'preset'`：
   ```ts
   export type SessionGroupBy = 'workspace' | 'flat' | 'preset'
   ```
2. **`locales.ts`**：zh `'groupBy.preset': '按预设'`，en `'By preset'`；节标题键 `section.presets`（zh `'预设'`）。
3. **`contract/slots.ts`**：SlotMap 增补子槽键，并导出 owner props：
   ```ts
   'sidebar.workspaces.presetGroups': { wide: boolean; query: string }
   ```
4. **`client/index.ts`** register 调用的 `children` 表增补：
   ```ts
   'sidebar.workspaces.presetGroups': { kind: 'single', scope: 'root' }
   ```
5. **`WorkspaceBrowser.tsx`**：
   - `ViewOptionsMenu` 菜单项加 `{ id: 'preset', label: t('groupBy.preset') }`；`onGroupPick` 接受 `'preset'`；
   - 列表主体分支：`groupBy === 'preset'` 时渲染
     `renderSlot('sidebar.workspaces.presetGroups', { wide, query })`
     （`query` = 浏览器现有搜索态，供插件树做标题过滤；`wide` 沿袭现有 owner props）；
   - 节标题计数标签：`'preset'` 时用 `t('section.presets')`。

补丁**不**改：搜索栏、"添加工作区"按钮（preset 模式下保留，v1 可接受）、工作区/扁平两模式的任何逻辑。

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
- inject face：`loadRoster()`、`open(id)`、`startSessionByPreset(id)`、`writeDefault(id|null)` 等。

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

`SeatChip` 复刻官方 stage→apply 语义，名单换成派生名单：**只含列表成员（隐藏的不出现）、按列表顺序、显示覆盖名**。

## 4. 数据模型：单一有序列表（不变量驱动）

### 4.1 store（本插件声明，`persist: 'dsh.presetManager.v1'`）

```ts
interface PresetManagerState {
  /** 有序列表 = 可见预设集合：顺序即显示顺序，首项即默认，不在列表即隐藏。 */
  order: string[]
  /** 显示名/说明覆盖（重命名落点）。 */
  overrides: Record<string, { name?: string; description?: string }>
}
```

不变量（reconcile 强制成立，冲突从构造上不存在）：

- **I1**：`order[0] === settings.default`（`order` 非空时）。官方默认永远在列表首位 → **默认预设不可能被隐藏**。
- **I2**：列表 = 全部可见预设。新出现的预设（官方设置页新建）reconcile 时**追加到末尾**（默认可见）；被删除的预设从列表剔除。
- **I3**：`order` 为空（全部隐藏）时，官方 default 被 **unset**（`settings.mutate`），新会话回落到部署默认。

### 4.2 reconcile（每次 load / `settings/document-updated` / 本插件写后回读）

1. `order := order ∩ 现存预设 id`；新 id 追加到末尾；
2. 若 `roster.isDefault` 指向的预设存在且不在 `order[0]`：把它**移到首位**（外部改默认 → 自动取消隐藏并置顶）；
3. 若 `roster.isDefault` 与 `order[0]` 一致：不动；
4. 本插件写操作的顺序：先改 `order`，再写 `settings.default = order[0]`（或 unset）；事件回读后 I1 已成立，幂等。

### 4.3 派生（纯函数，单测目标）

```ts
deriveRoster(presets, state)      // → { id, displayName, description, isDefault, hidden, broken, trust }[]
derivePresetGroups(list, roster)  // → 组树：preset 组 + “未分组”（无预设/预设已被外部删除）
```

- 显示名 = `overrides[id].name ?? preset.name ?? id`；
- 组内会话按 `updatedAt` 倒序（v1 无组内拖拽）；
- 可见性照搬官方：非 subagent、未归档、blank 仅当前。

## 5. 使用的 RPC（全部现有，零新增）

| 动作 | RPC / 通道 | 说明 |
|---|---|---|
| 读名单 | `agentPreset.list({})` | 面板树加载 / `connection/reset` / 本插件写后回读 |
| 写默认 | `settings.update({ ns:'agent-presets', patch:{ default: order[0] } })` | 每次列表变更 |
| 清默认 | `settings.mutate({ ns:'agent-presets', ops:[{ op:'unset', path:['default'] }] })` | 仅当列表清空 |
| 默认被外部改 | `remote.$on('settings/document-updated', ns==='agent-presets')` → reconcile | 官方设置页与插件互相同步 |
| 开新会话（+） | `workspaces.startSession(target)` → 空白会话 current 后 `agentPreset.select({ sessionId, agentPreset })` | 复用官方 seat 的 stage→apply 语义 |
| 打开会话 | `ctx.sessions.open(id)` | 现有服务动词 |
| 排序/隐藏/改名 | 无 RPC，落 §4.1 的本地 store | 显示层数据 |

**+ 按钮 workspace 目标**（照搬 `workspaces.startSession`）：当前会话所在 workspace → 最近 workspace → 无 workspace 则无操作（面板给出提示）。

## 6. 组件结构

```
src/client/
├── index.ts            # apply：store 工厂 + presetGroups 注册 + shadow SeatChip
├── stores.ts           # createPresetManagerStore + actions（setOrder/setOverride）
├── roster.ts           # deriveRoster / derivePresetGroups / reconcile（纯函数）
├── styles.ts           # 内联 CSS 字符串（--dsw-* token），首执行注入 <style>
├── PresetGroups.tsx    # 分组树：搜索过滤(query) / 组行 / 拖拽 / 未分组
├── PresetGroupRow.tsx  # 组头：名称+说明 / 会话数 / 展开 / + / ⋯ / 拖拽手柄 / 默认徽标
├── PresetMenu.tsx      # ⋯：设为默认 / 重命名 / 隐藏(取消隐藏)
├── RenameDialog.tsx    # 重命名（name + description）
├── SessionRow.tsx      # 会话行：标题 / workspace 标签 / 运行点 / 时间
└── SeatChip.tsx        # shadow 接管的新会话选择器
```

### 6.1 列表操作语义（单一列表模型的 UI 映射）

| 用户动作 | store 变化 | settings 同步 |
|---|---|---|
| 拖拽组行到位置 i | `order` 重排 | `default = order[0]`（首项变化时） |
| ⋯ 设为默认 | 目标移到首位 | `default = 目标` |
| ⋯ 隐藏 | 从 `order` 移除 | 若移除的是首项：`default = order[0]` |
| 取消隐藏 | 追加到 `order` 末尾 | 无（除非列表此前为空 → `default = 该项`） |
| 全部隐藏（order 空） | — | `mutate unset default` |
| 外部改默认 | reconcile 移到首位（取消隐藏） | 已成立 |
| 外部新建预设 | reconcile 追加末尾（可见） | 无 |

取消隐藏追加到末尾 = "隐藏顺序丢失"的已确认取舍。

## 7. 关键流程

1. **启动/刷新**：load roster → reconcile（I1/I2）→ 渲染分组树（首项带"默认"徽标）。
2. **星标已移除**：默认的可视表达 = 首位 + 徽标 + ⋯ 菜单的"设为默认"。
3. **隐藏**：从列表移除 → 组行保留但置灰（同工作区浏览器的归档交互）→ shadow chip 不再出现该预设。
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
| P2 | 列表管理：拖拽、设为默认、隐藏/取消隐藏、重命名、reconcile、shadow SeatChip | 1.5–2 天 |
| P3 | 打磨：空态/错误路径、uninstall 脚本、README 完整化、真机全流程验证 | 1 天 |

总计约 **4–5 个工作日**。

## 10. 测试与验证

- 单测（vitest，纯函数）：`reconcile`（I1/I2/I3 全部场景：外部改默认、新建预设、删除预设、全隐藏）、`deriveRoster`、`derivePresetGroups`。
- 真机验证：补丁 apply → 重建 → 插件装配 → 手工过全部流程；重点验证 shadow chip 与官方设置的默认互同步。
- 仓库门禁从简：`typecheck` + 单测 + `build`；harness 重量门禁不适用于外部仓库。

## 11. 仓库布局（含补丁）

```
dsh-preset-manager/
├── patches/
│   └── harness-groupby-preset.patch   # ui-workspace 的 5 个落点（git format-patch 风格）
├── scripts/
│   ├── build.sh        # junction 链接 checkout 依赖 + tsc + tsdown
│   ├── setup.sh        # 补丁 --check+apply → 重建 ui-workspace bundle → 构建本插件 → dsh plugin add
│   └── uninstall.sh    # 回滚补丁 + 卸 bundle
├── src/index.ts        # 节点半身：identity apply（装配锚点）
├── src/client/         # 浏览器半身（§6）
├── DESIGN.md / README.md / AGENTS.md
└── tests/              # 纯函数单测
```
