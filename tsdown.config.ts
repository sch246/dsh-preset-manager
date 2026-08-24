/**
 * dsh-preset-manager 构建配置。
 *
 * 两条产物线（模式照抄 dsh-super-injector，同一套官方装配通道）：
 *  - hostBundle：src/index.ts → lib/index.js（ESM，node 半身自包含；identity apply）
 *  - clientBundle：src/client/index.ts → lib/client.js（CJS + __ModuleLoader__ banner，
 *    浏览器半身走官方模块表：react/ui-slots/ui-primitives/runtime 保持 external）
 *
 * CSS 不经过任何编译管线：样式是 src/client/styles.ts 里的字符串常量，
 * 在模块首次执行时注入一个 <style data-plugin="dsh-preset-manager"> 标签
 * （ui-theme 的 --dsw-* 全局 token 直接可用）。这与 super-injector 面板同源，
 * 省掉 tsdown 的 css 插件链，外部仓库不需要 checkout 内的构建预设。
 */
import type { UserConfig } from 'tsdown'

const PLUGIN_ID = 'dsh-preset-manager'

/** 模块表能应答的 specifier：保持 external，其余一律内联。 */
const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-runtime/client',
]

const clientBundle: UserConfig = {
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  dts: false,
  sourcemap: true,
  clean: false,
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },
  deps: {
    neverBundle: [...CLIENT_EXTERNALS],
    alwaysBundle: (id: string) => !CLIENT_EXTERNALS.includes(id),
  },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: 'window.__ModuleLoader__.load({ id: ' + JSON.stringify(PLUGIN_ID) + ', factory: (require) => {',
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
    codeSplitting: false,
  },
}

/** 节点半身自包含打包（无运行时依赖，任何装配路径都能加载）。 */
const hostBundle: UserConfig = {
  entry: { index: 'src/index.ts' },
  outDir: 'lib',
  format: 'esm',
  platform: 'node',
  dts: false,
  sourcemap: true,
  clean: false,
  deps: {
    alwaysBundle: (id: string) => !id.startsWith('node:'),
  },
  outputOptions: {
    entryFileNames: 'index.js',
  },
}

export default [hostBundle, clientBundle] satisfies UserConfig[]
