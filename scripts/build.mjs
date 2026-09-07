/** Build only this workspace's artifacts with installed, versioned Node tools. */
import { existsSync, lstatSync, mkdirSync, readFileSync, symlinkSync, unlinkSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const pkg = join(root, 'packages', 'dsh-preset-manager')
const command = process.argv[2] ?? 'build'
if (!['build', 'typecheck'].includes(command)) throw new Error('Use build or typecheck')
const checkout = process.env.DSH_CHECKOUT
if (!checkout || !isAbsolute(checkout) || !existsSync(join(checkout, 'packages'))) throw new Error('Set DSH_CHECKOUT to an absolute Harness checkout')
const toolRoot = process.env.DSH_BUILD_TOOLS ?? join(root, 'node_modules')
function tool(name, version, entry) {
  const directory = join(toolRoot, name)
  const actual = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')).version
  if (actual !== version) throw new Error(`${name}: expected ${version}, found ${actual}; select installed tools with DSH_BUILD_TOOLS`)
  return join(directory, entry)
}
const tsc = tool('typescript', '5.9.3', 'bin/tsc')
const tsdown = tool('tsdown', '0.22.14', 'dist/run.mjs')
function link(path, target) {
  if (!existsSync(target)) throw new Error(`Missing build dependency: ${target}`)
  const current = lstatSync(path, { throwIfNoEntry: false })
  if (current) {
    if (!current.isSymbolicLink()) throw new Error(`Refusing to replace owned directory: ${path}`)
    unlinkSync(path)
  }
  mkdirSync(dirname(path), { recursive: true })
  symlinkSync(target, path, process.platform === 'win32' ? 'junction' : 'dir')
}
const modules = join(root, 'node_modules')
if (existsSync(modules) && lstatSync(modules).isSymbolicLink()) throw new Error('node_modules must be an owned directory, not a shared directory link')
mkdirSync(modules, { recursive: true })
link(join(root, 'harness'), checkout)
const dependencies = {
  '@deepseek-ai/cordis': 'vendor/cordis',
  '@deepseek-ai/schemastery': 'vendor/schemastery',
  '@deepseek-ai/dsh-api-remotes': 'packages/api/remotes',
  '@deepseek-ai/dsh-api-session-controller': 'packages/api/session-controller',
  '@deepseek-ai/dsh-api-workspace-controller': 'packages/api/workspace-controller',
  '@deepseek-ai/dsh-client-locale': 'packages/client/locale',
  '@deepseek-ai/dsh-client-store': 'packages/client/store',
  '@deepseek-ai/dsh-client-ui-slots': 'packages/client/ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives': 'packages/client/ui-primitives',
  '@deepseek-ai/dsh-client-ui-conversation': 'packages/client/ui-conversation',
  '@deepseek-ai/dsh-client-ui-renderer': 'packages/client/ui-renderer',
  '@deepseek-ai/dsh-client-ui-settings': 'packages/client/ui-settings',
  '@deepseek-ai/dsh-client-ui-session': 'packages/client/ui-session',
  '@deepseek-ai/dsh-client-ui-workspace': 'packages/client/ui-workspace',
  '@deepseek-ai/dsh-session': 'packages/core/session',
  '@deepseek-ai/dsh-commands': 'packages/interaction/commands',
  '@deepseek-ai/dsh-settings': 'packages/settings/settings',
  '@deepseek-ai/dsh-skill': 'packages/skill/skill',
  '@deepseek-ai/dsh-typert-protocol': 'packages/typert/protocol',
  '@types/node': 'node_modules/@types/node',
  '@types/react': 'packages/client/ui-renderer/node_modules/@types/react',
  '@types/react-dom': 'packages/client/ui-renderer/node_modules/@types/react-dom',
  react: 'packages/client/ui-renderer/node_modules/react',
  'react-dom': 'packages/client/ui-renderer/node_modules/react-dom',
  zod: 'packages/api/gateway/node_modules/zod',
  tsx: 'node_modules/tsx',
}
for (const [name, target] of Object.entries(dependencies)) link(join(modules, name), join(checkout, target))
for (const name of ['tsdown', 'typescript']) if (join(toolRoot, name) !== join(modules, name)) link(join(modules, name), join(toolRoot, name))
function run(args, cwd = pkg) {
  const result = spawnSync(process.execPath, args, { cwd, stdio: 'inherit', env: process.env })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
run([tsc, '-p', 'tsconfig.json', ...(command === 'typecheck' ? ['--noEmit'] : [])])
run([tsc, '-p', 'tsconfig.client.json', ...(command === 'build' ? ['--noEmit', 'false', '--declaration', '--emitDeclarationOnly', '--rootDir', 'src/client', '--outDir', 'lib/types/client'] : [])])
if (command === 'build') run([tsdown, '--config', 'tsdown.config.ts'])
if (command === 'build') for (const entry of ['lib/index.js', 'lib/client.js', 'lib/types/index.d.ts', 'lib/types/client/index.d.ts']) if (!existsSync(join(pkg, entry))) throw new Error(`Missing artifact ${entry}`)
console.log(`${command}: complete`)
