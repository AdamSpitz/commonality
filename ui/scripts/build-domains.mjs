import { spawnSync } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uiDir = path.resolve(__dirname, '..')
const distDir = path.join(uiDir, 'dist')
const viteBin = path.join(uiDir, '..', 'node_modules', '.bin', 'vite')
const domains = ['commonality', 'lazyGiving', 'alignment', 'tally', 'content-funding', 'noninflammatory', 'csm', 'conceptspace']
const args = process.argv.slice(2)
const modeIndex = args.indexOf('--mode')
const mode = modeIndex >= 0 ? args[modeIndex + 1] : undefined

if (modeIndex >= 0 && !mode) {
  throw new Error('Missing value for --mode')
}

await fs.rm(distDir, { recursive: true, force: true })

for (const domain of domains) {
  console.log(`Building ${domain}${mode ? ` (${mode})` : ''}...`)

  const viteArgs = ['build']
  if (mode) {
    viteArgs.push('--mode', mode)
  }

  const result = spawnSync(viteBin, viteArgs, {
    cwd: uiDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_DOMAIN: domain,
    },
  })

  if (result.status !== 0) {
    throw new Error(`Build failed for domain "${domain}" with exit code ${result.status ?? 'unknown'}`)
  }
}
