# patches/

harness 最小补丁的家。当前为空：`harness-groupby-preset.patch` 随 P0 生成
（改动 `@deepseek-ai/dsh-client-ui-workspace` 的五个落点，见 DESIGN.md §3.1）。

生成方式：在 dsh checkout 内按设计改完 ui-workspace 后
`git -C <checkout> diff -- packages/client/ui-workspace > patches/harness-groupby-preset.patch`。
