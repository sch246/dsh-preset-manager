# dsh-preset-manager

[![DSH Plugin](https://img.shields.io/badge/DSH-Plugin-4c7dff)](https://github.com/deepseek-ai/deepseek-harness)

**预设管理器**：为 [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness) 的 Web GUI 增加官方"视图选项"菜单里的第三项 **「按预设」** 分组，并管理预设的显示层。

一个有序列表 + 一个星标承载全部语义：

- **顺序即显示顺序**：拖拽预设组行改变顺序，新会话选择器跟随；
- **★ 星标即默认**：点组行星标切换默认预设（写入官方 `agent-presets.default`，全局生效）；星标预设永远可见，不可能被隐藏；
- **不在列表即隐藏**：隐藏的预设不出现在新会话选择器（分组树里置灰保留入口）；
- **重命名**：改显示名与说明（显示层覆盖，不动文件、不改 id）；
- **+ 新会话**：以该预设开始新会话（落在当前/最近工作区）。

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

1. `git apply --check` 校验 `patches/harness-groupby-preset.patch`（改动 ui-workspace 一个包的 5 个文件、约 165 行：分组类型加 `'preset'`、菜单第三项、子槽声明与渲染槽联合、preset 模式树分支）；
2. 应用补丁并重建被改包：`pnpm --filter @deepseek-ai/dsh-client-ui-workspace bundle`；
3. 构建本插件（`scripts/build.sh`，自动探测 `DSH_CHECKOUT`）；
4. `dsh plugin --profile web add .` 注册 bundle。

最后**重启 dsh web**。回滚：`bash scripts/uninstall.sh`（`git apply -R` + 卸载 bundle）。

> 故障排查：如果 `github:` 安装卡在 `git ls-remote git@github.com:...`（pnpm 把 GitHub 解析成 SSH），改用 HTTPS clone + 本地路径安装：
> ```bash
> git clone https://github.com/sch246/dsh-preset-manager.git
> cd dsh-preset-manager
> dsh plugin --profile web add .
> ```

## 使用

安装后，侧边栏"视图选项"菜单出现第三项 **按预设**：

- 列表按预设分组，星标预设显示实心 ★（默认）；无预设/预设已被删除的会话进"未分组"；
- **点 ★** 切换默认（隐藏预设上的星标会同时取消隐藏）；**拖动组行**改变显示顺序；
- **+** 以该预设开始新会话；**⋯ → 重命名** 改显示名与说明；**⋯ → 隐藏** 后新会话选择器不再出现该预设（组行置灰保留入口，取消隐藏追加到末尾；星标预设的隐藏会被拒绝）；
- 新会话界面的预设选择器由本插件接管：只显示列表中的预设、按列表顺序、用覆盖名；卸载即恢复官方选择器；
- 官方设置页里改默认预设会与本列表自动互同步（默认被移到首位）。

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

- **补丁只加扩展点**：ui-workspace 增加 `'preset'` 分组模式与子槽 `sidebar.workspaces.presetGroups`；分组树、管理动作全部在本插件里注册，官方代码零业务逻辑。
- **单一列表 + 星标的不变量**：`settings.default ∈ order`（星标预设永远可见）与"不在列表即隐藏"由 reconcile 强制成立——默认预设不可能被隐藏，冲突从构造上不存在；无星标且全部隐藏时官方 default 被 unset，回落到部署默认。
- **零新增 RPC**：默认走官方 `settings.update` / `settings.mutate`，名单读 `agentPreset.list`，新会话走 `workspaces.startSession` + `agentPreset.select`；列表与名字覆盖是本插件本地数据（`dsh.presetManager.v1`）。
- **shadow 接管选择器**：以更低 priority 注册进 `conversation.hero.agentPreset`（single slot 的合法 shadow），卸载即恢复官方 chip。

## 已知限制

- 需要 harness 补丁并重建 web bundle；dsh 升级后补丁可能需适配（setup 会先 `--check`）。
- 重命名是显示层覆盖：不写 `preset.yml`，官方设置页"预设"节仍显示原名；不改预设 id（历史会话按 id 关联）。
- 顺序/隐藏只影响分组树与新会话选择器（shadow chip）；官方设置页预设列表保持 host 顺序。
- 组内会话固定按最近更新排序（v1 无组内拖拽）；无工作区时 + 无操作。
- 列表存于浏览器 localStorage，不跨浏览器共享；默认值本身在官方 settings（host 持久）。

## License

MIT，见 [LICENSE](LICENSE)。
