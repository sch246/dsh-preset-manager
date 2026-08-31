# dsh-preset-manager 详细设计

> 状态：v4，已实现。v4 保留补丁路线，并把冲突的“可见 order”拆为**完整顺序 + 独立 hidden + 显式用户默认**：隐藏不再破坏位置，默认预设永远可见。
> 配套：`README.md`（产品说明）、`patches/`（harness 补丁）、`scripts/`（构建/安装）。

## 1. 目标与范围

以**独立仓库、外部插件**（+ 一个最小 harness 补丁）为 DeepSeek Harness Web GUI 提供：

1. **按预设分组浏览会话**：官方"视图选项"菜单里出现第三项"按预设"，会话列表按 agent preset 分组（形式与"按工作区"一致）。
2. **预设显示层管理**，由「完整顺序 + hidden 集合 + 显式用户默认」承载：
   - 列表顺序 = 预设显示顺序 = 新会话选择器的顺序；
   - **hidden 独立于顺序**（隐藏项不出现在新会话选择器；分组树中置灰并固定排在显示列表末尾；取消隐藏恢复原位置）；
   - 新会话预设菜单标出显式用户默认；选择不同项只切换当前预设，再次选择当前非默认项写 `agent-presets.default`，再次选择当前显式默认项清除该字段并保留选择；
   - 拖拽组行改顺序；`⋯` 菜单：重命名（显示名+说明）/ 隐藏 / 取消隐藏；
   - 点击预设组行 **+** 以该预设开始新会话。
3. **明确不做**：删除预设、删除会话。

## 2. 外部插件的能力边界（代码核实结论）

| 事项 | 结论 | 依据 |
|---|---|---|
| 会话带 preset 信息 | `SessionSummary.agentPreset` 已在客户端列表里 | `client/runtime/.../sessions/service.ts` |
| 预设名单 | `agentPreset.list` 现成（id/trust/isDefault/name/description/broken） | `host/apiproxy/src/api/agent-presets.ts` |
| 开新会话指定预设 | `uiWorkspace.connectWorkspace` / `agentPreset.select` / `sessions.open` 现成 | `ui-workspace/src/client/navigation.ts`、`ui-agent-preset/src/client/seat-store.ts` |
| 写/清默认 | `settings.update` / `settings.mutate(op: unset)` 现成（官方同款路径） | `ui-agent-preset/.../settings-store.ts`、`rpc-map.ts` |
| **新增 RPC** | 不可行：`RpcMethodMap` 编译期封闭 | `host/apiproxy/src/api/rpc-map.ts` |
| 官方菜单加"按预设" | 需改 ui-workspace（`SessionGroupBy` 闭包 + 菜单项 + 树分支）——**本设计的补丁目标** | `client/ui-workspace/src/client/{stores,WorkspaceBrowser}.tsx` |
| 补丁后的扩展点 | ui-workspace 的 register 可声明新 child slot，本插件注册进去填充 preset 模式主体 | `client/ui-workspace/src/client/index.ts` |
| 新会话选择器 | `conversation.hero.agentPreset` single slot，priority shadow 合法接管 | `ui-slots/src/index.ts` |

## 3. 集成形态：补丁路线（已选定）

### 3.1 补丁内容（`patches/harness-groupby-preset.patch`）

补丁持有三项 Host 兼容贡献（git apply 风格 unified diff；具体文件数与行数随目标 harness 版本演进）：

1. **`stores.ts`**：`SessionGroupBy` 联合类型加 `'preset'`：
   ```ts
   export type SessionGroupBy = 'workspace' | 'flat' | 'preset'
   ```
2. **`locales.ts`**：zh `'groupBy.preset': '按预设'`，en `'By preset'`；节标题键 `section.presets`（zh `'预设'` / en `'Presets'`）。
3. **`contract/slots.ts`**：SlotMap 增补子槽键，导出 owner props `PresetGroupsOwnerProps { wide, query, rows, sessionActions }`；`rows: PresetRowsOwner` 由 Workspace owner 提供官方 Session 投影、工作区标签和行渲染席位，`sessionActions` 强制携带官方重命名／分叉／归档动作，避免备选分组静默丢失会话菜单。同时把 `WorkspaceBrowserProps` 的渲染槽联合扩为
   `'sidebar.workspaces.directoryFlow' | 'sidebar.workspaces.presetGroups'`
   （否则 `renderSlot` 的类型面只认得 directoryFlow 一个子键）。
4. **`rows/Rows.tsx` + `rows/Rows.module.css`**：官方 Session 行在标题之后渲染一个整体右对齐的紧凑元数据块，块内先放工作区标签、留出间隔、最右保留相对时间。标签可收缩并省略，时间不可收缩；插件只提交标签 ReactNode，不复制官方行 CSS。
5. **`client/index.ts`** register 调用的 `children` 表增补：
   ```ts
   'sidebar.workspaces.presetGroups': { kind: 'single', scope: 'root' }
   ```
6. **`WorkspaceBrowser.tsx`**：
   - `ViewOptionsMenu` 菜单项加 `{ id: 'preset', label: t('groupBy.preset') }`；`groupBy`/`onGroupPick` 改收 `SessionGroupBy`；
   - 列表主体分支：`groupBy === 'preset'` 时优先渲染
      `renderSlot('sidebar.workspaces.presetGroups', { wide, query: normalizedQuery, rows: presetRows })`
     （preset 模式下搜索态交给插件树做标题过滤，不再走全局内容搜索）；
   - 节标题：`'preset'` 时用 `t('section.presets')`。
7. **历史 Session 投影回填**：session-projection 判断当前 client-visible checkpoint 是否完整；session-projection-cache 把完整性随缓存快照暴露；session-controller 在既有物理大小上限内重折叠不完整冷缓存并回写派生 checkpoint。相关包 README、测试、Agent Note 与 generator 链接映射同属静态补丁。
8. **冷 Session 的目标 preset 激活**：`agentPresets/select` wire endpoint 保持 `(SessionId, presetId)`，由 Session Controller 接管原始 Session id。已有空白 Agent 走领域切换；冷空白 Session 直接在目标 preset 下恢复，并在完整 Agent 发布成功后追加选择事件。旧 preset 缺失不会抢先令目标选择失败；共享的无关恢复失败会按请求目标重试。Agent Presets 与 Session Controller 的 README、测试和 Agent Note 同属静态补丁。

补丁**不**静态持有：共享 slot/API catalog、生成的 subsystem 文档和 Host `lib/`；setup/uninstall 从剩余源贡献重生成并重建。搜索栏本身、"添加工作区"按钮（preset 模式下保留，v1 可接受）、工作区/扁平两模式的任何逻辑也不改变。

### 3.2 插件注册（补丁之后的扩展点）

```ts
ctx.slots.inject('sidebar.workspaces.presetGroups', () => ctx.slots.register({
  name: 'sidebar.workspaces.presetGroups',
  store: createPresetManagerStore(),
  inject: presetBrowserInjected,   // 名单读写、会话动作回传
}, PresetGroups))
```

`PresetGroups`（本插件的分组与装饰层）只依赖四个 props share：
- `PropsRuntime<'sidebar.workspaces.presetGroups'>`：`useSessions` / `useWorkspaces`（root scope，会话数据现成）+ owner props `{ wide, query, rows }`；其中 `rows` 是官方行唯一呈现权威；
- `PropsStore`：本插件 store（完整 `order` + `hidden` + overrides）；
- inject face：侧栏树使用 `loadRoster()`、`open(id)`、`startSessionByPreset(id)` 等；hero 选择器独占 `setDefault(id)`。

插件不运行时导入 ui-workspace 的 React 行，也不复制其 CSS。它只把说明、操作和 Session 的 Workspace／项目标识放入官方行预留的 `meta`、`rowActions` 席位；ui-workspace 把 `meta` 放在右侧元数据块的相对时间之前，并负责间隔、截断和时间不可收缩。折叠、五行溢出、运行态动画和整组拖拽预览均由 ui-workspace 实现。

### 3.3 补丁的安装与回滚（`scripts/`）

- `scripts/setup.sh`：识别补丁缺失、已完整存在或冲突；仅在自己实际 apply 时记录 Host 效果所有权，随后重建 Host、api-remotes Client、ui-workspace 与插件，并 `dsh plugin add`。任一步失败即中止并提示。
- `scripts/uninstall.sh`：仅当记录表明补丁由 setup 实际应用、SHA 仍一致且 reverse check 通过时才回滚；预先存在或已漂移的 Host 效果保持不动，bundle 仍按正常流程移除。
- 升级冲突：dsh 升级后补丁可能不适用；`--check` 先行检测，冲突时给出提示而不是硬打。补丁依赖 ui-workspace 的 preset 分组入口和 owner 行契约、session projection/cache/list 的冷读接口，以及 Session Controller 的 Agent 激活事务，升级时以当前 diff 与测试为准。

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

`SeatChip` 复刻官方 stage→apply 语义，名单换成派生名单：**过滤 hidden、按完整 order 的可见子序列、显示覆盖名**。初始选中依次取 settings user 层显式默认、当前或复用 Session 的最近预设、managed order 第一项可见健康预设；页面打开后的手动选择不被异步默认刷新覆盖。菜单标记显式默认项；不同项选择走 `select`，当前非默认项重复选择走 `setDefault`，当前显式默认项重复选择走 `unsetDefault` 并保留本次选择。设置或清除失败都在 hero 旁显示可见提示。

## 4. 数据模型：完整顺序 + hidden + 显式用户默认（不变量驱动）

### 4.1 store（历史存储键 `dsh.presetManager.v1`，当前 schema v2）

```ts
interface PresetManagerState {
  /** 当前为 2；旧 whole-object 快照没有此字段。 */
  schemaVersion: 2
  /** 首次成功读取 Host roster 后为 true。 */
  initialized: boolean
  /** 全部现存预设的稳定顺序；隐藏/取消隐藏不移动它。 */
  order: string[]
  /** 独立隐藏集合；序列化为数组。 */
  hidden: string[]
  /** 显示名/说明覆盖（重命名落点）。 */
  overrides: Record<string, { name?: string; description?: string }>
}
```

Harness store 会用 localStorage JSON **整体替换** `init()` 结果，没有内建 migration
回调。因此生命周期必须由持久化字段显式表达，不能从 `order.length` 推断：

- 无 localStorage：`schemaVersion:2, initialized:false`；首次 roster 中已有多少预设都按 Host 顺序完整导入，全部可见，然后原子写成 `initialized:true`；
- 旧 v1：无 schema 且无 `hidden`，旧 `order` 是可见子序列，差集迁入 hidden；
- 已部署的过渡模型：有 `hidden` 但无 schema，原样保留可见性并补 schema；
- schema v2 且 initialized：以后 Host 新增的预设追加可见，删除项清理。

默认**不存本地**：权威拷贝是官方 settings layered describe view 中 `agent-presets` 命名空间的 `user.default`。Client roster controller 用它覆盖 `agentPresets.list()` 的 `isDefault` 再发布派生名单，因此部署 fallback 不会被呈现为用户默认。

不变量（reconcile 强制成立）：

- **I1 显式用户默认永远可见**：settings user 层 `default ∉ hidden`。显式默认预设不可能被隐藏。
- **I2 完整顺序跟随 roster**：`order` 恰含全部现存预设；新预设追加且默认可见，删除项同时从 `order` 与 `hidden` 清理。
- **I3 无默认且全部隐藏**：官方 default 被 **unset**（`settings.mutate`），新会话回落到部署默认。有默认时 I1 阻止它进入 hidden。

### 4.2 reconcile（每次 load / `settings/document-updated` / 本插件写后回读）

1. 先按 schema/initialized 区分首次安装、旧快照和当前状态；首次安装导入全部现有预设为可见；
2. `order := order ∩ 现存预设 id`；新 id 追加到末尾；`hidden` 同步清除不存在 id；
3. 若 settings user 层 default 指向 hidden 预设：只从 `hidden` 移除，保留 `order` 位置；
4. 若显式 default 指向的预设被删除：Host 清除该 user 字段，Client 投影不把部署 fallback 标为显式默认；
5. 本插件写操作先改 `hidden`（必要时），再写 settings（`update default` / `mutate unset`）；事件回读后 I1–I3 已成立，幂等。

### 4.3 派生（纯函数，单一投影）

```ts
deriveRoster(presets, state)            // → 按 managed order 排列的 { id, displayName, description, isDefault, hidden, broken, trust }[]
reconcile(presets, storedState)         // → 当前 schema（首次安装 + I1/I2 + 旧版迁移）
planHide / planUnhide / shouldUnsetDefault   // 隐藏/取消隐藏/清空默认的纯决策
derivePresetGroups(list, officialSessionNodes, roster, order, query)  // → 组树
```

- 显示名 = `overrides[id].name ?? preset.name ?? id`；
- selector 与 sidebar 消费同一 managed order；尚未来得及 reconcile 的 Host 新增项按 Host 顺序尾随；
- 组内会话按 `updatedAt` 倒序（v1 无组内拖拽）；
- 组树布局：可见预设组按 `order` 的可见子序列 → 隐藏预设组（置灰、不可拖拽、固定排在所有可见组之后，内部仍按完整 `order`）→ “未分组”兜底组最后；
- Session 可见性与状态直接消费 ui-workspace 的官方投影（非 subagent、未归档、blank 仅当前、运行子代理与待交互状态），本插件不重建 `deriveFlat`；
- `query`（浏览器搜索态）在 preset 模式下交给组树做标题过滤：组标题或组内会话标题匹配则保留组，非空时组内会话行同步过滤。

## 5. 使用的 RPC（复用现有 wire 方法）

| 动作 | RPC / 通道 | 说明 |
|---|---|---|
| 读名单与显式默认 | `agentPresets.list()` + `settingsScope.describe()` | 共享 settings mirror 完成 layered describe 后，读取 `user.default` 并覆盖 roster fallback 标记，再原子发布 |
| 写默认 | `settings.update({ ns:'agent-presets', patch:{ default: id } })` | hero 菜单再次选择当前非默认项 |
| 清默认 | `settings.mutate({ ns:'agent-presets', ops:[{ op:'unset', path:['default'] }] })` | hero 菜单再次选择当前显式默认项；I3 也复用此写入 |
| 默认被外部改 | `settingsScope.describe().subscribe()` → reconcile | ui-settings 持有唯一 describe reader；官方设置页与插件互相同步 |
| 开新会话（+） | `uiWorkspace.connectWorkspace(target)` → `agentPresets.select(sessionId, presetId)` → `sessions.open(sessionId)` | connect 统一复用或创建空白会话；select 成功并记录预设后才打开，失败留在当前界面并显示提示；Host patch 保留 wire 方法并改为按原始 Session id 激活 |
| 打开会话 | `ctx.sessions.open(id)` | 现有服务动词 |
| 排序/隐藏/改名 | 无 RPC，落 §4.1 的本地 store | 显示层数据 |

**+ 按钮 workspace 目标**：弹出当前工作区名单并要求显式选择；无工作区时不给 connect/open，显示提示。复用规则由 `connectWorkspace` 负责（blank 且 cwd 等于工作区路径的成员会话；已跑过一轮的会话 blank 已翻 false，不会被误复用）。

## 6. 组件结构

```
src/client/
├── index.ts            # apply：store 工厂 + roster/seat 控制器 + presetGroups 注册 + shadow SeatChip
├── stores.ts           # createPresetManagerStore + actions（setOrder/reconcileOrder/setOverride）
├── roster.ts           # deriveRoster / derivePresetGroups / reconcile / planHide…（纯函数）
├── locales.ts          # presetManager 命名空间字典（zh/en）
├── styles.ts           # 仅插件装饰的内联 CSS（不复制官方行布局）
├── PresetGroups.tsx    # 分组模型 + 官方行席位编排：搜索 / 折叠状态 / 拖拽顺序 / 未分组
├── PresetRowDecorations.tsx # 说明/会话数、+ 与 ⋯；注入官方行的装饰席位
├── PresetMenu.tsx      # ⋯：重命名 / 隐藏(取消隐藏)
├── RenameDialog.tsx    # 重命名（name + 多行 description textarea）
├── seat-menu.ts        # hero 选项投影与 pick 分类（纯函数）
└── SeatChip.tsx        # shadow 接管的新会话选择器与唯一默认写入口
```

### 6.1 操作语义（单列表 + 显式用户默认）

| 用户动作 | store 变化 | settings 同步 |
|---|---|---|
| hero 选择不同预设 | 无 | 只走当前会话的 `agentPreset.select`，不写默认 |
| hero 再次选择当前非默认预设 | 无 | `default = 该预设` |
| hero 再次选择当前显式默认预设 | 无；保留当前选择 | unset `default` |
| 隐藏（非默认） | 加入 `hidden`，`order` 不变 | 无 |
| 隐藏（默认预设） | **拒绝** + 提示“默认预设不能被隐藏，请先将另一个预设设为默认” | 无 |
| 全部隐藏 | 仅无默认时可能；`order` 仍完整 | `mutate unset default` |
| 拖拽组行 | `order` 重排（与默认无关） | 无 |
| 重命名 | `overrides` 更新 | 无 |
| 外部改默认 | reconcile：若目标被隐藏则只取消 hidden | 已成立 |
| 外部新建预设 | reconcile：追加到末尾（可见） | 无 |

隐藏组行“置灰 + 排到显示末尾”只是展示规则；完整 `order` 始终保留隐藏项的位置，因此取消隐藏会回到原处。默认、顺序、可见性三者互相解耦。

## 7. 关键流程

1. **启动/刷新**：并行读取 roster 并等待共享 settings layered describe → 用 `user.default` 投影显式默认 → 原子 reconcile 生命周期与 I1/I2 → 发布 ready；选择器在显式默认、最近 Session、managed order 第一项之间完成初始选择，未就绪时不显示错误 fallback。
2. **默认切换**：先判断点击项是否不同于当前项；不同项只切换当前预设。重复点击当前非默认项写 `settings.default`，重复点击当前显式默认项清除该字段并保持当前选择；写入失败显示提示，异步 mirror 刷新不覆盖页面内手动选择。
3. **隐藏**：加入 `hidden`、不改 `order` → 组行**置灰并固定在显示列表末尾** → shadow chip 不再出现；切换视图或 reload 后保持，取消隐藏恢复原位置；默认预设的隐藏被拒绝。
4. **以预设开始新会话**：见 §5（connect 解析或创建空白会话 → 在该 id 上 select → 成功后 open，落到准备开始界面；普通 hero 选择仍使用 stage→apply）。
5. **重命名**：对话框写 `overrides`；不改 id、不写 `preset.yml`。

## 8. 已知限制（v1）

1. 需要 harness 补丁并重建 Host 与 web bundle；dsh 升级时补丁可能需重新适配（`--check` 先测）。
2. 重命名是显示层覆盖：不写 `preset.yml`，官方设置页"预设"节仍显示原名；不改 id。
3. 顺序/隐藏只影响分组树 + shadow chip；官方设置页预设列表保持 host 顺序。
4. 组内会话固定按最近更新排序（v1）。
5. 无 workspace 时 + 无操作。
6. 列表存于浏览器 localStorage（`dsh.presetManager.v1`，与 `dsh.workspace.view.v5` 同级先例），不跨浏览器共享；显式用户默认在官方 settings 里（host 持久）。

## 9. 阶段与工作量（单人）

| 阶段 | 内容 | 估时 |
|---|---|---|
| P0 | 生成 `patches/harness-groupby-preset.patch`，apply + 重建 Host/ui-workspace + 验证菜单第三项出现 | 0.5 天 |
| P1 | 插件骨架 + 分组树（组行/会话行/未分组/搜索过滤）+ 打开会话 + + 新会话 | 1–1.5 天 |
| P2 | 管理：hero 默认入口、拖拽、隐藏/取消隐藏、重命名、reconcile、shadow SeatChip | 1.5–2 天 |
| P3 | 打磨：空态/错误路径、uninstall 脚本验证、README 完整化、真机全流程验证 | 1 天 |

总计约 **4–5 个工作日**。

## 10. 验证

- STATE 是行为权威；本插件不维护复制语义的测试矩阵或 test gate。
- `typecheck` + `build` 只检查类型与产物；最终验收在补丁 apply、重建和插件装配后，使用真实 Web UI 与真实 settings 持久化直接按 STATE 检查选择器优先级、默认 set/unset、managed order、失败提示与官方设置互同步，并观察刷新与服务重启后的状态。会话行需在普通和窄侧栏宽度确认 `标题 | [工作区  相对时间]`、长工作区标签截断、时间保留及 hover 操作。
- Harness 重量门禁不适用于外部仓库。

## 11. 仓库布局（含补丁）

```
dsh-preset-manager/
├── patches/
│   └── harness-groupby-preset.patch   # ui-workspace 席位、历史投影回填与冷 preset 选择（unified diff）
├── scripts/
│   ├── build.sh        # junction 链接 checkout 依赖 + tsc + tsdown
│   ├── setup.sh        # 补丁 --check+apply → 重生成 catalog → 重建 Host/UI → 构建插件 → dsh plugin add
│   └── uninstall.sh    # 回滚补丁 + 卸 bundle
├── src/index.ts        # 节点半身：identity apply（装配锚点）
├── src/client/         # 浏览器半身（§6）
├── DESIGN.md / README.md / AGENTS.md
└── lib/                # 构建产物，随源码提交
```
