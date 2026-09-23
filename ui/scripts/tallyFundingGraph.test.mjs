import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

const uiRoot = path.resolve(import.meta.dirname, '..')
const repoRoot = path.resolve(uiRoot, '..')

const sdkEntries = {
  node: 'config-node.ts',
  machinery: 'machinery.ts',
  'indexer-sync': 'indexer-sync.ts',
  abis: 'abis.ts',
  'abis/conceptspace': 'abis/conceptspace.ts',
  'abis/funding': 'abis/funding.ts',
  utils: 'utils/index.ts',
  testing: 'testing.ts',
  'content-identity': 'content-identity/index.ts',
  'alignment-attestations': 'subsystems/alignment-attestations/index.ts',
  'published-data': 'subsystems/published-data/index.ts',
  'policy-lists': 'policy-lists/index.ts',
  'policy-lists/node': 'policy-lists/resolver-node.ts',
  conceptspace: 'subsystems/conceptspace/index.ts',
  'content-funding': 'subsystems/content-funding/index.ts',
  delegation: 'subsystems/delegation/index.ts',
  'displayable-documents': 'subsystems/displayable-documents/index.ts',
  fundingportals: 'subsystems/fundingportals/index.ts',
  identity: 'subsystems/identity/index.ts',
  'lazy-giving': 'subsystems/lazy-giving/index.ts',
  'mutable-refs': 'subsystems/mutable-refs/index.ts',
  'nudger-publications': 'subsystems/nudger-publications/index.ts',
  'signer-profiles': 'subsystems/signer-profiles/index.ts',
  subjectiv: 'subsystems/subjectiv/index.ts',
}

const forbiddenFragments = [
  `${path.sep}ui${path.sep}src${path.sep}fundingportals${path.sep}`,
  `${path.sep}ui${path.sep}src${path.sep}content-funding${path.sep}`,
  `${path.sep}ui${path.sep}src${path.sep}lazy-giving${path.sep}`,
  `${path.sep}ui${path.sep}src${path.sep}delegation${path.sep}`,
  `${path.sep}ui${path.sep}src${path.sep}domains${path.sep}lazy-giving${path.sep}`,
  `${path.sep}ui${path.sep}src${path.sep}domains${path.sep}alignment${path.sep}`,
  `${path.sep}ui${path.sep}src${path.sep}domains${path.sep}content-funding${path.sep}`,
  `${path.sep}ui${path.sep}src${path.sep}domains${path.sep}civility${path.sep}`,
  `${path.sep}ui${path.sep}src${path.sep}domains${path.sep}commonality${path.sep}`,
  `${path.sep}ui${path.sep}src${path.sep}domains${path.sep}common-sense-majority${path.sep}`,
  `${path.sep}ui${path.sep}src${path.sep}shared${path.sep}funding${path.sep}`,
  `${path.sep}sdk${path.sep}src${path.sep}subsystems${path.sep}content-funding${path.sep}`,
  `${path.sep}sdk${path.sep}src${path.sep}subsystems${path.sep}fundingportals${path.sep}`,
  `${path.sep}sdk${path.sep}src${path.sep}subsystems${path.sep}lazy-giving${path.sep}`,
  `${path.sep}sdk${path.sep}src${path.sep}subsystems${path.sep}delegation${path.sep}`,
  `${path.sep}sdk${path.sep}src${path.sep}abis${path.sep}funding.ts`,
]

function resolveSpecifier(specifier, fromFile, activeDomainFile) {
  if (specifier === '@ui-active-domain') return activeDomainFile
  if (specifier.startsWith('@ui/')) {
    return path.resolve(uiRoot, 'src', specifier.slice('@ui/'.length))
  }
  if (specifier.startsWith('@commonality/sdk/')) {
    const entry = sdkEntries[specifier.slice('@commonality/sdk/'.length)]
    if (!entry) return null
    return path.resolve(repoRoot, 'sdk/src', entry)
  }
  if (specifier.startsWith('.')) return path.resolve(path.dirname(fromFile), specifier)
  return null
}

function existingFile(candidate) {
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
  for (const suffix of ['.ts', '.tsx', '.mjs', '.js', '.d.ts']) {
    if (fs.existsSync(candidate + suffix)) return candidate + suffix
  }
  for (const index of ['/index.ts', '/index.tsx', '/index.js']) {
    if (fs.existsSync(candidate + index)) return candidate + index
  }
  return null
}

function specifiers(source) {
  const found = []
  const pattern = /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g
  for (const match of source.matchAll(pattern)) {
    const index = match.index ?? 0
    const ahead = source.slice(Math.max(0, index - 16), index + match[0].length)
    if (/import\s+type\b/.test(match[0]) || /export\s+type\b/.test(match[0])) continue
    if (/import\s+type\b/.test(ahead) || /export\s+type\b/.test(ahead)) continue
    found.push(match[1] || match[2])
  }
  return found
}

function walk(entry, activeDomainFile) {
  const seen = new Set()
  const pending = [entry]
  while (pending.length > 0) {
    const current = pending.pop()
    if (seen.has(current)) continue
    seen.add(current)
    const source = fs.readFileSync(current, 'utf8')
    for (const specifier of specifiers(source)) {
      const resolved = resolveSpecifier(specifier, current, activeDomainFile)
      if (!resolved) continue
      const file = existingFile(resolved)
      if (file) pending.push(file)
    }
  }
  return [...seen]
}

function graph(domain) {
  const activeDomainFile = path.join(uiRoot, 'src/domains/active', `${domain}.ts`)
  return walk(path.join(uiRoot, 'src/main.tsx'), activeDomainFile)
}

function offenders(domain) {
  return graph(domain).filter((file) => forbiddenFragments.some((fragment) => file.includes(fragment)))
}

test('tally production graph does not include funding modules', () => {
  const files = graph('tally')
  assert.ok(files.some((file) => file.endsWith(`${path.sep}tally${path.sep}manifest.tsx`)))
  assert.equal(files.some((file) => file.includes(`${path.sep}domains${path.sep}index.ts`)), false)
  assert.ok(files.some((file) => file.endsWith('StatementPage.tsx')))
  assert.deepEqual(offenders('tally'), [])
})

test('conceptspace production graph does not include funding modules', () => {
  assert.deepEqual(offenders('conceptspace'), [])
})
