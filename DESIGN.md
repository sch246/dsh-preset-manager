# dsh-preset-manager 详细设计

> 状态：待评审。本文只描述设计，`src/` 尚未实现。
> 配套：`README.md`（产品说明）、`cordis.patch.yml`（装配层）、`scripts/build.sh`（构建）。

## 1. 目标与范围

以**独立仓库、外部插件**的形式，为 DeepSeek Harness 的 Web GUI 提供：

1. **按预设分组浏览会话**：侧边栏里把会话按 agent preset 分组展示（类似"按工作区"分组）。
2. **预设显示层管理**：
   - 拖拽改变预设顺序（影响新会话选择器的顺序）；
   - 隐藏/取消隐藏预设（隐藏后不出现在新会话选择器）；
   - 重命名预设的显示名与说明；
   - **星标切换默认预设**（写入官方 `agent-presets` settings 的 `default` 字段，全局生效）；
   - 点击预设行 **+** 以该预设开始新会话。
3. **明确不做**：删除预设、删除会话（用户已确认砍掉；`agentPreset.remove` 与归档能力保持原样）。

## 2. 外部插件的能力边界（代码核实结论）

设计前逐项核实过 harness 源码（`/root/deepseek-harness`），结论如下：

| 事项 | 结论 | 依据 |
|---|---|---|
| 会话带 preset 信息 | `SessionSummary.agentPreset` 已在客户端列表里，分组数据现成 | `packages/client/runtime/src/client/sessions/service.ts` |
| 预设名单读取 | `agentPreset.list` RPC 现成，返回 id/trust/isDefault/name/description/broken | `packages/host/apiproxy/src/api/agent-presets.ts` |
| 新会话指定预设 | `session.create({ agentPreset })` / `agentPreset.select` 现成 | `packages/host/apiproxy/src/api/sessions.ts` |
| 写默认预设 | `settings.update({ ns: 'agent-presets', patch: { default } })` 现成，官方 UI 同款路径 | `ui-agent-preset/src/client/settings-store.ts` |
| **新增 RPC** | **不可行**：`RpcMethodMap` 编译期封闭，无插件扩展点 | `packages/host/apiproxy/src/api/rpc-map.ts` |
| **官方"视图选项"菜单加第三项** | **不可行**：`sidebar.workspaces` 是 single slot，整个浏览区被 ui-workspace 占据；分组模式是组件内硬编码的 `'workspace' \| 'flat'` 闭包 | `ui-sidebar/src/client/index.ts`、`ui-workspace/src/client/WorkspaceBrowser.tsx` |
| 新会话选择器 | `conversation.hero.agentPreset` 是 single slot；**不同 priority 的注册可以 shadow（最低者渲染）**，外部插件可合法接管 | `ui-slots/src/index.ts`（register 的 priority 语义） |
| 侧边栏追加按钮 | `sidebar.footer.action` 是 **list** slot，官方设计就是给插件加 footer 动作的 | `ui-sidebar/src/client/index.ts` |
| 插件 UI 半身装配 | 包声明 `dsh.client`（platform web + ./client export），bundle 行被 client-modules 扫进浏览器清单，`/plugins/<id>/client.js` 按模块表加载 | `packages/client/modules/src/index.ts`、`dsh-super-injector` 同通道实例 |

**推论**：v1 采用「footer 按钮 + 全栏预设面板」形态（第 3.1 节）；若后续想要官方菜单里真出现"按预设"分组项，走 3.2 的补丁路线，两者不冲突。

## 3. 集成形态

### 3.1 v1 主路线：侧边栏预设面板（自包含，零 harness 改动）

- 在 `sidebar.footer.action`（list slot）注册一个按钮（预设图标 + 隐藏预设数量小角标）。
- 点击后渲染**全栏覆盖面板**（fixed 定位的 sidebar 列后代，同 ui-settings 面板的几何模式）：面板内容是一棵"按预设分组"的会话树 + 管理操作。
- 面板打开时工作区浏览器被覆盖；关闭即恢复。搜索、会话状态（运行中/待交互/完成点）与官方浏览器一致地呈现。

面板结构（自上而下）：

```
┌ 预设管理器                    [×] ┐
├ 搜索（本地标题过滤，可选 P2）        ┤
├ ★ 预设名A  · 说明A        [+] [⋯] ┤   ← 星标=默认；+ 新会话；⋯ 管理菜单
│   ├ 会话1          workspaceA  2h ┤
│   └ 会话2          workspaceB  1d ┤
├ ☆ 预设名B（已隐藏，置灰） [+] [⋯] ┤
│   └ 会话3 …                       ┤
├ 未分组                            ┤   ← 无预设 / 预设已被外部删除的会话
│   └ 会话4 …                       ┤
└ 提示：隐藏的预设不会出现在新会话选择器 ┘
```

### 3.2 可选后续：harness 补丁路线（达成"菜单第三项"的精确体验）

给 `ui-workspace` 打一个小补丁（放进本仓库 `patches/`，setup 脚本可选应用）：

1. `SessionGroupBy` 联合类型加 `'preset'`，`ViewOptionsMenu` 加"按预设"菜单项；
2. 声明一个新的 child slot（如 `sidebar.workspaces.presetGroups`），预设分组的树派生与组行渲染由本插件注册进去；
3. harness 侧改动约 60–100 行，需重建 web bundle（`pnpm --filter ... bundle`）。

风险：升级 dsh 时补丁可能冲突（pre-release 仓库变化快）。v1 不做，仅保留设计。

## 4. 数据模型

### 4.1 持久化 store（客户端，本插件声明）

沿用 DSH client 插件的 store 纪律（`createPresetManagerStore()` 工厂 + `persist`）：

```ts
interface PresetManagerState {
  /** 用户拖拽后的预设顺序（preset id 数组）；不在数组里的预设排在名单末尾。 */
  order: string[]
  /** 隐藏的预设 id；不出现在新会话选择器，面板里置灰显示。 */
  hidden: string[]
  /** 显示名/说明覆盖（重命名的落点）；不写 preset.yml（见 §8 已知限制）。 */
  overrides: Record<string, { name?: string; description?: string }>
  /** 面板开合。 */
  open: boolean
}
// persist: 'dsh.presetManager.v1'
```

actions：`setOrder(ids)`、`setHidden(id, hidden)`、`setOverride(id, patch)`、`setOpen(open)`。

### 4.2 名单合并（roster 派生，纯函数 `deriveRoster`）

输入：`agentPreset.list` 的 presets（host 顺序）+ 本 store 的 overlay。

1. 有效顺序 = store.order 里仍存在的 id → host 名单里剩下的（保持 host 顺序）；
2. 显示名 = `overrides[id].name ?? preset.name ?? preset.id`；说明同理；
3. `hidden` 标记由 store.hidden 决定；`isDefault` 来自 host 名单；
4. 派生结果：`{ id, displayName, description, isDefault, hidden, broken, trust }[]`。

### 4.3 会话分组（纯函数 `derivePresetGroups`）

输入：`useSessions` 的 `SessionListState`（含 `agentPreset`）+ 派生名单 + `archivedSessionIds`。

- 每个 preset id 一个组；组内会话按 `updatedAt` 倒序（v1 不做组内手拖）。
- `agentPreset` 为 undefined、或 id 已不在名单（预设被外部删除）的会话 → **未分组**。
- 可见性规则照搬官方：`origin !== 'subagent'`、未归档、blank 只显示当前。

## 5. 使用的 RPC（全部现有，零新增）

| 动作 | RPC | 说明 |
|---|---|---|
| 读名单 | `agentPreset.list({})` | 面板打开 / `connection/reset` / 本插件动作后刷新 |
| 读默认变化 | `remote.$on('settings/document-updated', ns==='agent-presets')` | 星标写入后其它界面（含官方设置页）联动刷新 |
| 设默认（星标） | `settings.update({ ns:'agent-presets', patch:{ default:id } })` | 官方同款写路径；失败展示错误，星标回滚 |
| 开新会话（+） | `workspaces.startSession(workspaceId)` → 待空白会话 current 后 `agentPreset.select({ sessionId, agentPreset })` | 完全复用官方 seat 的 stage→apply 语义，会话即时进列表 |
| 打开会话 | `ctx.sessions.open(id)` | 现有服务动词 |
| 改名/排序/隐藏 | **无 RPC**，全部落在 §4.1 的本地 store | 显示层概念，不触碰文件系统 |

**+ 按钮的 workspace 目标选择**（照搬 `workspaces.startSession` 的规则）：当前会话所在 workspace → 最近 workspace → 无 workspace 时无操作（面板给出提示；无 workspace 的新会话本就由主界面 hero 流程负责）。

## 6. 组件结构与注册

```
src/client/
├── index.ts            # apply：locales 注入 + 两个注册（footer 按钮、shadow seat）+ store 工厂
├── stores.ts           # createPresetManagerStore + overlay actions
├── roster.ts           # deriveRoster / derivePresetGroups（纯函数，单测目标）
├── styles.ts           # 内联 CSS 字符串（--dsw-* token），模块首执行注入 <style>
├── PresetPanel.tsx     # 全栏覆盖面板：分组树、拖拽、组行渲染
├── PresetGroupRow.tsx  # 组头：星标 / 名称+说明 / + / ⋯ / 拖拽手柄 / 隐藏置灰
├── PresetMenu.tsx      # ⋯ 菜单：重命名 / 隐藏(取消隐藏)
├── RenameDialog.tsx    # 重命名对话框（name + description 两栏）
├── SessionRow.tsx      # 会话行：标题 / workspace 标签 / 运行点 / 时间
└── SeatChip.tsx        # shadow 接管的新会话预设选择器（过滤隐藏 + 覆盖名 + 用户顺序）
```

### 6.1 footer 按钮注册

```ts
ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
  name: 'sidebar.footer.action',
  id: 'preset-manager',
  store: createPresetManagerStore(),
  inject: /* api 回传 + open/startSession/select 等回调 */,
}, PresetPanel))
```

组件 props 全走四个 share：`useSessions`/`useWorkspaces` 来自 `PropsRuntime`（root scope），名单与写操作走 inject face。

### 6.2 新会话选择器接管（shadow）

官方 chip 在 conversation scope 内注册；本插件同 scope 注册、`priority: -1`：

```ts
ctx.inject(['slots', 'conversation', 'sessions', 'workspaces', 'connection'], (scope) => {
  scope.slots.register({
    name: 'conversation.hero.agentPreset',
    priority: -1,                       // 官方注册默认 0 → 本插件胜出渲染
    inject: /* seat 同款：load/select + 隐藏过滤 */,
  }, SeatChip)
})
```

`SeatChip` 复刻官方 seat 的 stage→apply 逻辑（读当前空白会话 → `agentPreset.select` → `sessions.noteAgentPreset`），名单改为 §4.2 的派生名单：**隐藏预设不出现、顺序跟随用户拖拽、名字用覆盖名**。官方 chip 仍注册在账本上（只是被 shadow），卸载本插件即恢复。

### 6.3 拖拽排序

组头行原生 HTML5 拖拽（draggable + dragover 半区插入标记，官方浏览器同款交互）；drop 后 `setOrder(全部有效 id)`。只拖预设组行，不拖会话行（v1）。

## 7. 关键流程

### 7.1 星标设默认

1. 点星 → 立即乐观置灰星标（busy 态）；
2. `settings.update({ ns:'agent-presets', patch:{ default:id } })`；
3. 成功 → 重读名单（`isDefault` 移动）；失败 → 星标回滚 + 错误提示。
4. 联动：host 端 settings 变更广播 `settings/document-updated`，本插件与官方设置页都订阅刷新。

### 7.2 隐藏

- 面板 `⋯ → 隐藏` → `setHidden(id, true)` → 组行置灰 + 角标计数 +1；
- 新会话选择器（shadow chip）过滤掉该预设；
- **默认预设被隐藏**：允许（v1 展示一个"默认已隐藏"提示条；不自动改默认）。理由：用户可能故意想让默认隐形，由星标自行调整。

### 7.3 重命名

- `⋯ → 重命名` → 对话框两个输入框（显示名、说明），预填当前值；
- 保存 → `setOverride(id, { name, description })` → 组头与 shadow chip 立即更新；
- 不改预设 id（历史会话按 id 关联）；不写 `preset.yml`（官方设置页仍显示原名，见已知限制）。

### 7.4 以预设开始新会话（+）

1. 解析目标 workspace（当前会话所在 → 最近）；
2. `workspaces.startSession(target)`：创建/复用空白会话并 open（列表即时更新）；
3. 订阅列表变更（seat 同款）：空白会话成为 current 后 `agentPreset.select({ sessionId, agentPreset })`；
4. echo 经 `sessions.noteAgentPreset` 落列表。

## 8. 已知限制（v1）

1. **面板形态而非菜单第三项**：官方"视图选项"菜单不可扩展（§2）；想要菜单项需走 §3.2 补丁路线。
2. **重命名是显示层覆盖**：不写 `preset.yml`，官方设置页"预设"节仍显示原名；host 端日志/工具侧不感知新名字。
3. **顺序/隐藏只影响本插件表面 + shadow chip**：官方设置页预设列表保持 host 顺序且不隐藏（官方节是文件管理面，显示层概念不进那里）。
4. **面板刷新时机**：打开时、本插件动作后、`connection/reset`、`settings/document-updated`；其它进程改预设目录不会实时推送（需重开面板）。
5. 组内会话顺序 v1 固定按最近更新，不做组内拖拽。
6. 无 workspace 时 + 按钮无操作（hero 流程本就负责无 workspace 的新会话）。

## 9. 阶段与工作量（单人）

| 阶段 | 内容 | 估时 |
|---|---|---|
| P1 | 骨架 + 面板分组树 + + 按钮 + 打开会话（无管理） | 1–1.5 天 |
| P2 | 星标默认、隐藏、拖拽排序、重命名对话框、shadow seat chip | 1.5–2 天 |
| P3 | 打磨：搜索、空态、错误路径、README 完整化、真实环境验证 | 1 天 |

总计约 **3.5–4.5 个工作日**；不含 §3.2 补丁路线（另计 0.5–1 天 + 重建 web bundle）。

## 10. 测试与验证策略

- **单测（node + vitest，只测纯函数）**：`deriveRoster`（顺序合并/覆盖/隐藏）、`derivePresetGroups`（分组/未分组/可见性）。
- **真实环境验证**：`bash scripts/setup.sh` → 重启 `dsh web` → 手工过全部流程（分组、星标、隐藏、拖拽、重命名、+、shadow chip 的隐藏过滤）。
- 仓库门禁从简：`typecheck` + 单测 + build；harness 的重量门禁（覆盖率/e2e/快照）不适用于外部仓库。

## 11. 仓库装配（已落地骨架）

- `dsh bundle` 身份行（`cordis.patch.yml`）→ `dsh plugin --profile web add .` 装配；
- `dsh.client`（platform web + ./client）→ client-modules 扫入浏览器清单；
- `lib/` 提交进 git：git 地址安装（`dsh plugin add github:sch246/dsh-preset-manager`）无需任何构建步骤（避开 pnpm allowBuilds 坑，同 dsh-warm-minimal 的安装体验）。
