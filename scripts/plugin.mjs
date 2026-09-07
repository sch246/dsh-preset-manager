/** Explicit deployment selection; inspection never applies a patch or changes a profile. */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const packageRoot = join(root, 'packages', 'dsh-preset-manager')
const [command = 'inspect', ...flags] = process.argv.slice(2)
const acceptedFlag = command === 'setup' ? '--install' : command === 'remove' ? '--remove' : undefined
if (!['setup', 'inspect', 'remove'].includes(command) || flags.length > 1 || (flags.length === 1 && flags[0] !== acceptedFlag)) throw new Error('Use setup [--install], inspect, or remove [--remove]')
const selected = Object.fromEntries(['DSH_CHECKOUT', 'DSH_HOME', 'DSH_PROFILE'].map(key => [key, process.env[key]]))
const cli = selected.DSH_CHECKOUT && join(selected.DSH_CHECKOUT, 'apps/cli/lib/bin.js')
const patch = join(root, 'patches', 'harness-groupby-preset.patch')
const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))
console.log(JSON.stringify({ package: manifest.name, packageRoot, ...selected, cliReady: Boolean(cli && existsSync(cli)), patchReady: existsSync(patch) }, null, 2))
if (flags.length === 0) process.exit(0)
for (const [key, value] of Object.entries(selected)) if (!value) throw new Error(`Set ${key} explicitly`)
for (const key of ['DSH_CHECKOUT', 'DSH_HOME']) if (!isAbsolute(selected[key]) || !existsSync(selected[key]) || !statSync(selected[key]).isDirectory()) throw new Error(`${key} must be an existing absolute directory`)
if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u.test(selected.DSH_PROFILE)) throw new Error('DSH_PROFILE must be a profile name without path separators')
if (!existsSync(cli) || !statSync(cli).isFile()) throw new Error(`Build the selected checkout CLI first: ${cli}`)
const toolRoot = process.env.DSH_BUILD_TOOLS ?? join(root, 'node_modules')
if (!isAbsolute(toolRoot)) throw new Error('DSH_BUILD_TOOLS must be absolute')
for (const [name, version] of [['typescript', '5.9.3'], ['tsdown', '0.22.14']]) if (JSON.parse(readFileSync(join(toolRoot, name, 'package.json'), 'utf8')).version !== version) throw new Error(`Use ${name} ${version}`)
process.env.DSH_BUILD_TOOLS = toolRoot
const result = spawnSync('bash', [join(root, 'scripts', command === 'setup' ? 'apply.sh' : 'revert.sh')], { cwd: root, stdio: 'inherit', env: process.env })
if (result.error) throw result.error
process.exit(result.status ?? 1)
