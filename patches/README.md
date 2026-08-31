# patches/

`harness-groupby-preset.patch` 是本插件对 Harness 的**唯一权威介入**。它包含
ui-workspace 的 preset 分组席位、官方 Session 行右侧元数据块的工作区／相对时间顺序与
收缩规则，以及历史 Session 缺失当前客户端投影时的有界冷缓存回填。补丁持有相关运行
源码、测试、包 README 和 Agent Note；共享生成物由安装脚本从全部当前源贡献重新生成。
不要只在 Harness 工作树里修改而不重新生成本文件。

校验当前 checkout 是否尚未应用：

```bash
git -C <checkout> apply --unidiff-zero --check patches/harness-groupby-preset.patch
```

校验是否已经完整应用：

```bash
git -C <checkout> apply --unidiff-zero --check --reverse patches/harness-groupby-preset.patch
```

安装与回滚只走 `scripts/setup.sh` / `scripts/uninstall.sh`。setup 先识别“已完整应用”
再尝试 apply，因此可重复运行；它在目标 checkout 的 Git metadata 中同时记录补丁
SHA-256 与本次 setup 是否实际应用了补丁。uninstall 只回滚由 setup 实际应用、且 SHA
仍完全匹配的补丁；预先存在或已漂移的 Host 效果保持不动。

升级适配：在隔离的受支持 Harness 基线中完成并验证改动后，用明确文件清单生成补丁。
清单包括 ui-workspace、session-controller、session-projection、
session-projection-cache 的相关源／测试／README，必要的 generator 映射和 Agent Note：

```bash
git -C <checkout> diff --no-ext-diff --binary <baseline> -- \
  packages/client/ui-workspace \
  packages/api/session-controller/{src,tests,README.md,README.zh.md,README.i18n.yaml} \
  packages/session/session-projection/{src,tests,README.md,README.zh.md,README.i18n.yaml} \
  packages/session/session-projection-cache/{src,tests,README.md,README.zh.md,README.i18n.yaml} \
  packages/subagent/subagent/tests/list-children.spec.ts scripts/gen-cordis-catalog.ts \
  .agents/notes/implemented/bug-fix/<note-triplet> \
  > patches/harness-groupby-preset.patch
```

不要把 `docs/subsystems/session-projection.*`、共享 API/slot catalog 或 `lib/` 放入静态补丁。
生成物必须通过正向/反向 `git apply --unidiff-zero --check`、相关 Host/UI 测试、Host 构建与
ui-workspace bundle 构建。
