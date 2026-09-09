# dsh-preset-manager

安装与维护从 [STATE](.intent/state/STATE.md) 开始，其中包含目标变化、所有权、卸载路线与证据限制。

[![DSH Plugin](https://img.shields.io/badge/DSH-Plugin-4c7dff)](https://github.com/deepseek-ai/deepseek-harness)

**预设管理器**：为 [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness) 的 Web GUI 增加官方"视图选项"菜单里的第三项 **「按预设」** 分组，并管理预设的显示层。

完整顺序、独立隐藏集合和官方 settings user 层的显式默认承载全部语义：

- **顺序即显示顺序**：拖拽预设组行改变顺序，新会话选择器跟随；
- **默认从开始聊天页设置**：初始选择依次使用显式用户默认、当前或复用 Session 的最近预设、列表第一项可见健康预设；切换到其他预设只影响当前新会话，再次选择当前非默认预设时“设为默认”，再次选择当前显式默认预设时“取消默认”并保留当前选择；
- **隐藏不改变顺序**：隐藏的预设不出现在新会话选择器，但在分组树末尾置灰保留入口；取消隐藏回到原顺序位置；
- **重命名**：改显示名与说明（显示层覆盖，不动文件、不改 id）；
- **+ 新会话**：悬停组行点 **+**，选择工作区；会话直接以所选预设创建，跳到准备开始的新会话界面。

> 详细设计（补丁落点、列表不变量、RPC 使用、已知限制）见 [DESIGN.md](DESIGN.md)。

## 开发与安装入口

仓库根目录是 private 开发 workspace；实际 npm 包为 [`packages/dsh-preset-manager`](packages/dsh-preset-manager/package.json)。原根目录的源码、Bundle、编译配置与 `lib/` 已移入该包；现有本地安装需通过 profile plugin 事务把旧根链接替换为新的绝对包路径。包名、版本、Bundle 身份和持久化键不变。

```sh
node scripts/plugin.mjs inspect
node scripts/plugin.mjs setup         # 只检查
node scripts/plugin.mjs remove        # 只检查
DSH_CHECKOUT=/absolute/harness DSH_BUILD_TOOLS=/absolute/node_modules node scripts/build.mjs build
DSH_CHECKOUT=/absolute/harness DSH_BUILD_TOOLS=/absolute/node_modules node scripts/build.mjs typecheck
DSH_CHECKOUT=/absolute/harness DSH_HOME=/absolute/dsh-home DSH_PROFILE=web node scripts/plugin.mjs setup --install
DSH_CHECKOUT=/absolute/harness DSH_HOME=/absolute/dsh-home DSH_PROFILE=web node scripts/plugin.mjs remove --remove
```

根 scripts 暴露 `build`、`typecheck`、`setup`、`inspect`、`remove`。固定开发工具为 TypeScript 5.9.3、tsdown 0.22.14、pnpm 10.17.1；构建直接调用已安装 Node 工具，不自动安装依赖。可使用根目录自身的 `node_modules`，或以 `DSH_BUILD_TOOLS` 指向已有工具目录；构建依赖仅创建候选内的独立目录和叶子链接。安装／移除调用明确 checkout 的已构建 CLI，变更 profile 的依赖、锁文件和 Bundle；不会重启服务。Windows 可使用同一 Node 入口，Host 补丁步骤需要 Git Bash。

安装执行原有补丁正反检查、归属凭据、共享 catalog 重生成、Host 相关编译面重建与插件构建，再注册实际包路径。升级时按 STATE 检查上游等价能力并适配或撤销多余补丁；移除只撤销仍归本插件所有且精确匹配的 Host 内容，保留业务数据和其他改动。

## 使用

安装后，侧边栏"视图选项"菜单出现第三项 **按预设**：

- 列表按预设分组，组头和会话行由官方工作区组件渲染；本插件只在官方席位加入说明、预设操作和项目标识，官方会话行的重命名／分叉／归档菜单保持可用。无预设/预设已删除的会话进入“未分组”；
- **拖动会话行**可在当前预设组内排序（含隐藏预设与“未分组”），顺序在当前浏览器刷新后保留；“最近更新”允许手动拖动，并在后续会话更新时提到前面，重选该选项会重新按更新时间排列；
- **点组行**会完全展开/收起，收起时不残留会话预览；展开后默认显示五条会话，并可展开其余。拖动命中整个预设区段（组头及可见会话），插入预览与最终落点一致；悬停组行出现 **+**（可选工作区开始新会话）与 **⋯**（重命名/隐藏）。会话标题保持在左侧；右侧紧凑灰色元数据块先显示项目/工作区名，留出间隔后在最右显示相对时间，长标签会截断而不挤掉时间；
- **⋯ → 重命名** 改显示名与说明（说明支持多行）；**⋯ → 隐藏** 后新会话选择器不再出现该预设（组行置灰保留入口，切换视图/重载后仍保持；取消隐藏恢复原位置；默认预设的隐藏会被拒绝）；
- 新会话界面的预设选择器由本插件接管：只显示可见健康预设，沿用侧栏 managed order 与覆盖名，并标出 settings user 层的显式默认。初次打开依次选择显式默认、当前或复用 Session 的最近预设、列表第一项；页面内手动选择不被后续异步默认刷新覆盖；
- 选择只属于当前新会话页；进入另一个会话会重新读取其模式。当前会话切换模式期间，选择器保留已生效的名称并暂时禁用，Host 确认后才显示新名称；失败在选择器旁提示，可重新选择重试。
- 点击其他项只切换当前预设。重复点击当前非默认项会“设为默认”，重复点击当前显式默认项会“取消默认”并保留当前选择；两种 settings 写入失败都会在选择器旁保持可见；卸载即恢复官方选择器；
- 官方设置页里改显式用户默认会与本列表自动互同步；默认变化只更新当前名单的标记，不重新读取名单或让分组树进入 loading。若目标被隐藏会只取消隐藏、不移动位置。Host roster 的部署 fallback 不会显示成用户默认。

## 目录结构

根目录持有 `.intent/`、`AGENTS.md`、`scripts/`、`patches/` 和文档；`packages/dsh-preset-manager/` 持有源码、Bundle、编译配置与已跟踪 `lib/`。

## 工作原理

- **官方行仍由 Workspace 拥有**：ui-workspace 增加 `'preset'` 分组模式与子槽 `sidebar.workspaces.presetGroups`，并向占用方提供官方 Session 投影和行渲染席位；插件只负责预设归组与显示管理，不复制官方行、状态点、折叠或拖拽实现。
- **历史分组按完整投影恢复**：列表识别缺少当前 client-visible 行的旧投影缓存，在配置的物理大小上限内从完整 Session 日志重折叠并回写派生缓存；部署迁移临时扩大该上限，完成后恢复默认值，权威会话日志不被改写。
- **冷 Session 直接按目标 preset 激活**：Host 的 `agentPresets/select` 接受原始 Session id；已有空白 Agent 原地切换，冷空白 Session 在目标 preset 下恢复，完整发布成功后才记录选择。旧 preset 已删除或损坏不会阻止选择可用目标；目标无效、会话已开始或发布失败都不留下选择事件。
- **完整顺序 + hidden + 显式用户默认的不变量**：`order` 保存全部预设的稳定顺序，`hidden` 独立保存隐藏集合，reconcile 强制 settings user 层 `default ∉ hidden`；无显式默认且全部隐藏时官方 default 被 unset。显式 schema/initialized 区分首次安装、旧 v1 和后续新增；selector 与 sidebar 共享 managed order，尚未 reconcile 的 Host 新增项只在末尾尾随。
- **复用官方 settings 与 RPC**：初始加载、失败重试和 connection recovery 通过 `agentPresets.list` 读取名单；显式默认从 ui-settings 唯一 layered describe mirror 的 `user.default` 读取，写入走官方 `settings.update` / `settings.mutate`。写成功返回的完整 namespace view 和外部 mirror 更新都只投影到当前名单；默认标记不变时不发布 roster，普通默认变化不写 preset-manager localStorage。预设组的新会话先用 `uiWorkspace.connectWorkspace` 解析或创建空白会话，再对该会话执行 `agentPresets.select(sessionId, presetId)`，成功后才由 `sessions.open` 打开。Host patch 只把既有 `select` endpoint 的身份解析移到 Session Controller，没有增加 wire 方法。列表与名字覆盖是本插件本地数据（`dsh.presetManager.v1`）。
- **shadow 接管选择器**：以更低 priority 注册进 `conversation.hero.agentPreset`（single slot 的合法 shadow），卸载即恢复官方 chip。

## 验证

`npm run typecheck` 和 `bash scripts/build.sh` 只检查类型与可发布产物，不构成行为验收。最终验收必须在真实 Web UI 和真实 settings 持久化上按 STATE 操作，并通过刷新与服务重启观察显式默认、最近 Session fallback、managed order、set/unset 和失败提示；会话行还需在普通和窄侧栏宽度观察右侧元数据顺序、间隔、长工作区名截断及 hover 操作。

## 已知限制

- 需要 harness 补丁并重建 web bundle；dsh 升级后补丁可能需适配（setup 会先 `--check`）。
- 重命名是显示层覆盖：不写 `preset.yml`，官方设置页"预设"节仍显示原名；不改预设 id（历史会话按 id 关联）。
- 顺序/隐藏只影响分组树与新会话选择器（shadow chip）；官方设置页预设列表保持 host 顺序。
- 组内会话固定按最近更新排序（v1 无组内拖拽）；选择或重选“最近更新”会按当前会话集刷新排序；无工作区时 + 无操作。
- 列表存于浏览器 localStorage，不跨浏览器共享；显式用户默认在官方 settings（host 持久）。

## License

MIT，见 [LICENSE](LICENSE)。
