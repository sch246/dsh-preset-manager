# Third-Party Notices

dsh-preset-manager 目前不打包任何第三方运行时依赖：

- 浏览器半身对 react / react-dom / @deepseek-ai/dsh-client-* 的引用全部保持 external（由 dsh 官方模块表提供，属宿主装配而非本仓库再分发）；
- 构建期工具（typescript / tsdown / @types/node）仅用于开发，不进入产物。

无第三方版权声明需要登记。
