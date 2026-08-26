# dsh-preset-manager

[![DSH Plugin](https://img.shields.io/badge/DSH-Plugin-4c7dff)](https://github.com/deepseek-ai/deepseek-harness)

**预设管理器**：为 [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness) 的 Web GUI 增加官方"视图选项"菜单里的第三项 **「按预设」** 分组，并管理预设的显示层。

完整顺序、独立隐藏集合和一个星标承载全部语义：

- **顺序即显示顺序**：拖拽预设组行改变顺序，新会话选择器跟随；
- **★ 星标即默认**：点组行星标切换默认预设（写入官方 `agent-presets.default`，全局生效）；星标预设永远可见，不可能被隐藏；
- **隐藏不改变顺序**：隐藏的预设不出现在新会话选择器，但在分组树末尾置灰保留入口；取消隐藏回到原顺序位置；
- **重命名**：改显示名与说明（显示层覆盖，不动文件、不改 id）；
- **+ 新会话**：悬停组行点 **+**，可选工作区；会话直接以所选预设创建（落在所选/当前/最近工作区），跳到准备开始的新会话界面。

> 详细设计（补丁落点、列表不变量、RPC 使用、已知限制）见 [DESIGN.md](DESIGN.md)。

## 安装

前置：可运行的 dsh checkout（`dsh web`）、Node.js `^22.19.0 || >=24.0.0`、pnpm。

```bash
git clone https://github.com/sch246/dsh-preset-manager.git
cd dsh-preset-manager
npm install                        # devDeps：typescript / tsdown / @types/node
bash scripts/setup.sh              # 见下：补丁 + 重建 + 注册 bundle
```

`scripts/setup.sh` 依次做四件事（任一步失败即中止）：

1. 从本仓库受 Git 跟踪的 `patches/harness-groupby-preset.patch` 识别“尚未应用/已完整应用/冲突”三种状态；已应用可重复安装，冲突不改宿主；
2. 应用（或复用）补丁，记录补丁 SHA-256 与本次 setup 的实际所有权，并重建被改包：`pnpm --filter @deepseek-ai/dsh-client-ui-workspace bundle`；
3. 构建本插件（`scripts/build.sh`，自动探测 `DSH_CHECKOUT`）；
4. `dsh plugin --profile web add .` 注册 bundle。

最后**重启 dsh web**。回滚：`bash scripts/uninstall.sh`；它只撤销由 setup 实际应用且仍完全匹配的补丁；预先存在的相同 Host 效果不会被本插件认领或删除。

> 故障排查：如果 `github:` 安装卡在 `git ls-remote git@github.com:...`（pnpm 把 GitHub 解析成 SSH），改用 HTTPS clone + 本地路径安装：
> ```bash
> git clone https://github.com/sch246/dsh-preset-manager.git
> cd dsh-preset-manager
> dsh plugin --profile web add .
> ```

## 使用

安装后，侧边栏"视图选项"菜单出现第三项 **按预设**：

- 列表按预设分组，组头和会话行由官方工作区组件渲染；本插件只在官方席位加入 ★、说明、预设操作和项目标识，官方会话行的重命名／分叉／归档菜单保持可用。无预设/预设已删除的会话进入“未分组”；
- **点 ★** 切换默认（隐藏预设上的星标会同时取消隐藏）；**点组行**会完全展开/收起，收起时不残留会话预览；展开后默认显示五条会话，并可展开其余。拖动命中整个预设区段（组头及可见会话），插入预览与最终落点一致；悬停组行出现 **+**（可选工作区开始新会话）与 **⋯**（重命名/隐藏）；每个会话行的独立元数据席位显示项目/工作区名；
- **⋯ → 重命名** 改显示名与说明（说明支持多行）；**⋯ → 隐藏** 后新会话选择器不再出现该预设（组行置灰保留入口，切换视图/重载后仍保持；取消隐藏恢复原位置；星标预设的隐藏会被拒绝）；
- 新会话界面的预设选择器由本插件接管：只显示列表中的预设、按列表顺序、用覆盖名；卸载即恢复官方选择器；
- 官方设置页里改默认预设会与本列表自动互同步；若目标被隐藏会只取消隐藏、不移动位置（星标、顺序与可见性彼此解耦）。

## 目录结构

```
dsh-preset-manager/
├── package.json              # dsh.bundle.patch + dsh.client（platform web）
├── cordis.patch.yml          # bundle 身份行（lib/index.js 为空 apply）
├── patches/
│   └── harness-groupby-preset.patch   # ui-workspace 补丁（§DESIGN 3.1）
├── tsconfig.json / tsconfig.client.json / tsdown.config.ts / vitest.config.ts
├── scripts/
│   ├── build.sh              # junction 链接 checkout 依赖 + tsc + tsdown
│   ├── setup.sh              # 补丁 → 重建 → 构建 → dsh plugin add
│   └── uninstall.sh          # 回滚补丁 + 卸 bundle
├── src/index.ts              # 节点半身：identity apply（装配锚点）
├── src/client/               # 浏览器半身（分组树 / 管理 / shadow chip；roster.ts 纯函数 + locales/styles）
├── tests/                    # 纯函数单测（reconcile I1–I3 正反例 / roster / grouping）
├── lib/                      # 构建产物（随源码提交）
├── DESIGN.md                 # 详细设计
└── README.md
```

## 工作原理

- **补丁只加扩展点和官方行 owner 契约**：ui-workspace 增加 `'preset'` 分组模式与子槽 `sidebar.workspaces.presetGroups`，并向占用方提供官方 Session 投影和行渲染席位；插件只负责预设归组、星标与管理动作，不复制官方行、状态点、折叠或拖拽实现。
- **完整顺序 + hidden + 星标的不变量**：`order` 保存全部预设的稳定顺序，`hidden` 独立保存隐藏集合，reconcile 强制 `settings.default ∉ hidden`——默认预设不可能被隐藏；无星标且全部隐藏时官方 default 被 unset。显式 schema/initialized 区分首次安装、旧 v1 和后续新增：首次安装即使 Host 已有很多预设也会全部导入为可见；旧 v1 的“可见 order”才把差集迁入 hidden；以后新增的预设追加可见。
- **零新增 RPC**：默认走官方 `settings.update` / `settings.mutate`，名单读 `agentPreset.list`，新会话复用空白会话走 `workspaces.startSession` + `agentPreset.select`、新建走 `session.create({ workspaceId, agentPreset })`（创建即带预设，落到准备开始界面）；列表与名字覆盖是本插件本地数据（`dsh.presetManager.v1`）。
- **shadow 接管选择器**：以更低 priority 注册进 `conversation.hero.agentPreset`（single slot 的合法 shadow），卸载即恢复官方 chip。

## 已知限制

- 需要 harness 补丁并重建 web bundle；dsh 升级后补丁可能需适配（setup 会先 `--check`）。
- 重命名是显示层覆盖：不写 `preset.yml`，官方设置页"预设"节仍显示原名；不改预设 id（历史会话按 id 关联）。
- 顺序/隐藏只影响分组树与新会话选择器（shadow chip）；官方设置页预设列表保持 host 顺序。
- 组内会话固定按最近更新排序（v1 无组内拖拽）；无工作区时 + 无操作。
- 列表存于浏览器 localStorage，不跨浏览器共享；默认值本身在官方 settings（host 持久）。

## License

MIT，见 [LICENSE](LICENSE)。
