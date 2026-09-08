import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function extractViteRuntimeKeys(source) {
  const start = source.indexOf('const keys = [')
  assert.notEqual(start, -1, 'buildRuntimeConfig keys array missing')
  const end = source.indexOf(']', start)
  const block = source.slice(start, end)
  return [...block.matchAll(/'(VITE_[A-Z0-9_]+)'/g)].map((m) => m[1])
}

test('IPFS config.json emits CauseStarter HTTP AI URLs', () => {
  const vite = readFileSync(join(root, 'ui/vite.config.ts'), 'utf8')
  const keys = extractViteRuntimeKeys(vite)
  for (const key of ['VITE_CAUSE_ASSIST_URL', 'VITE_IMPLICATION_ATTESTER_URL']) {
    assert.ok(keys.includes(key), `${key} must be in buildRuntimeConfig`)
  }
})

test('base-sepolia.env has live Render AI URLs', () => {
  const env = readFileSync(join(root, 'deployments/base-sepolia.env'), 'utf8')
  assert.match(env, /VITE_CAUSE_ASSIST_URL=https:\/\/commonality-cause-assist\.onrender\.com/)
  assert.match(
    env,
    /VITE_IMPLICATION_ATTESTER_URL=https:\/\/commonality-service-host-attesters\.onrender\.com\/implication-attester/,
  )
})
