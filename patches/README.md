# patches/

harness 最小补丁的家。`harness-groupby-preset.patch` 已随 P0 生成：改动
`@deepseek-ai/dsh-client-ui-workspace` 一个包的 5 个文件、约 165 行，落点见
DESIGN.md §3.1（`stores.ts` / `locales.ts` / `contract/slots.ts` / `index.ts` /
`WorkspaceBrowser.tsx`）。

校验（无需改动工作树）：

```bash
git -C <checkout> apply --check patches/harness-groupby-preset.patch
```

安装/回滚走 `scripts/setup.sh` / `scripts/uninstall.sh`（`git apply` +
重建 ui-workspace bundle）。dsh 升级后补丁可能不适用：`setup.sh` 先 `--check`，
冲突时报错而不是硬打。升级适配方法：在 dsh checkout 里改完 ui-workspace 后
`git -C <checkout> diff -- packages/client/ui-workspace > patches/harness-groupby-preset.patch`
重新生成，并同步 DESIGN.md §3.1 与 README。
