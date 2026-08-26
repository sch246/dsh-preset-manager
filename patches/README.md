# patches/

`harness-groupby-preset.patch` 是本插件对
`@deepseek-ai/dsh-client-ui-workspace` 的**唯一权威介入**。它包含运行源码、相关测试和
架构说明的完整 unified diff；不要只在 Harness 工作树里修改而不重新生成本文件。

校验当前 checkout 是否尚未应用：

```bash
git -C <checkout> apply --check patches/harness-groupby-preset.patch
```

校验是否已经完整应用：

```bash
git -C <checkout> apply --check --reverse patches/harness-groupby-preset.patch
```

安装与回滚只走 `scripts/setup.sh` / `scripts/uninstall.sh`。setup 先识别“已完整应用”
再尝试 apply，因此可重复运行；它在目标 checkout 的 Git metadata 中同时记录补丁
SHA-256 与本次 setup 是否实际应用了补丁。uninstall 只回滚由 setup 实际应用、且 SHA
仍完全匹配的补丁；预先存在或已漂移的 Host 效果保持不动。

升级适配：在受支持的 Harness 基线中完成并验证 ui-workspace 改动后，运行：

```bash
git -C <checkout> diff -- packages/client/ui-workspace > patches/harness-groupby-preset.patch
```

生成物必须通过正向/反向 `git apply --check`、ui-workspace 测试与 bundle 构建。
