# dsh-preset-manager

[![DSH Plugin](https://img.shields.io/badge/DSH-Plugin-4c7dff)](https://github.com/deepseek-ai/deepseek-harness)

**预设管理器**：为 [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness) 的 Web GUI 提供**按预设分组浏览会话**的侧边栏面板，以及预设显示层的完整管理。

- **按预设分组**：会话按所属 agent preset 分组展示（无预设/预设已失效的会话进"未分组"）；
- **默认星标**：点击预设行的 ★ 切换默认预设（写入官方 `agent-presets` 设置，新会话默认生效）；
- **隐藏**：隐藏的预设不会出现在新会话选择器（面板里置灰保留入口）；
- **拖拽排序**：预设显示顺序即新会话选择器的顺序；
- **重命名**：改预设的显示名与说明（显示层覆盖，不动文件、不改 id）；
- **+ 新会话**：点击预设行的 + 以该预设开始新会话（落在当前/最近工作区）。

> 详细设计（集成形态、RPC 使用、数据模型、已知限制）见 [DESIGN.md](DESIGN.md)。

## 安装

前置：可运行的 dsh checkout（`dsh web`）、Node.js `^22.19.0 || >=24.0.0`。

### 方式一：本地 clone + setup（推荐）

```bash
git clone https://github.com/sch246/dsh-preset-manager.git
cd dsh-preset-manager
npm install                        # devDeps：typescript / tsdown / @types/node
bash scripts/setup.sh              # 构建（自动探测 DSH_CHECKOUT）+ 注册进 web profile
```

然后**重启 dsh web**。

### 方式二：git 地址直接装（lib/ 已提交，无需构建）

```bash
dsh plugin --profile web add github:sch246/dsh-preset-manager
```

> 故障排查：如果 `github:` 安装卡在 `git ls-remote git@github.com:...`（pnpm 把 GitHub 解析成 SSH），改用 HTTPS clone + 本地路径安装：
> ```bash
> git clone https://github.com/sch246/dsh-preset-manager.git
> cd dsh-preset-manager
> dsh plugin --profile web add .
> ```

## 使用

重启后，侧边栏底部出现预设管理器按钮（预设图标）。点开面板即可：

- **★ 星标**：设为默认预设（新会话不带显式选择时用它）；
- **+**：以该预设开始新会话；
- **⋯**：重命名（显示名 + 说明）/ 隐藏 / 取消隐藏；
- **拖动组行**：改变预设顺序；
- 新会话界面上的预设选择器由本插件接管：隐藏预设不出现、顺序与名字跟随面板。

## 目录结构

```
dsh-preset-manager/
├── package.json              # dsh.bundle.patch + dsh.client（platform web）
├── cordis.patch.yml          # bundle 身份行（lib/index.js 为空 apply）
├── tsconfig.json             # host 半身类型检查
├── tsconfig.client.json      # 浏览器半身类型检查（jsx + DOM）
├── tsdown.config.ts          # lib/index.js + lib/client.js 两条产物线
├── scripts/
│   ├── build.sh              # junction 链接 checkout 依赖 + tsc + tsdown
│   └── setup.sh              # 构建 + dsh plugin add
├── src/
│   ├── index.ts              # 节点半身：identity apply（装配锚点）
│   └── client/               # 浏览器半身（面板 / 分组树 / shadow chip）
├── DESIGN.md                 # 详细设计
└── tests/                    # 纯函数单测（roster / grouping）
```

## 工作原理

- **装配**：`cordis.patch.yml` 的身份行让 `dsh plugin add` 把本包登记为 profile bundle；包的 `dsh.client` 声明让 client-modules 把 `lib/client.js` 扫进浏览器插件清单，按官方模块表加载（react / ui-slots / ui-primitives / runtime 全部 external，其余内联）。
- **面板**：注册进 `sidebar.footer.action`（官方预留的 list slot），以固定定位覆盖层渲染"按预设"分组树——不触碰、不替换官方工作区浏览器。
- **新会话选择器接管**：以更低 priority 注册进 `conversation.hero.agentPreset`（single slot 的合法 shadow 机制），隐藏预设被过滤、顺序与名字跟随面板。卸载本插件即恢复官方 chip。
- **零新增 RPC**：默认星标走官方 `settings.update`（`agent-presets.default`），名单读 `agentPreset.list`，开新会话走 `workspaces.startSession` + `agentPreset.select`；排序/隐藏/改名是本地显示层数据（`dsh.presetManager.v1`）。
- **默认联动**：订阅 `settings/document-updated` 事件，官方设置页改默认、本面板改默认互相可见。

## 已知限制

- 面板形态而非官方"视图选项"菜单里的第三项（外部插件无法扩展该闭包；见 [DESIGN.md §3.2](DESIGN.md) 的补丁路线）。
- 重命名是显示层覆盖：不写 `preset.yml`，官方设置页"预设"节仍显示原名；不改预设 id（历史会话按 id 关联）。
- 顺序/隐藏只影响本面板与新会话选择器（shadow chip）；官方设置页预设列表保持 host 顺序。
- 组内会话固定按最近更新排序（v1 无组内拖拽）。
- 无工作区时预设行的 + 无操作（无工作区的新会话由主界面 hero 流程负责）。

## License

MIT，见 [LICENSE](LICENSE)。
