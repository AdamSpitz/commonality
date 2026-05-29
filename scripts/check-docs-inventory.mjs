#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function assertExists(relativePath, label = relativePath) {
  const absolutePath = path.join(root, relativePath)
  if (!existsSync(absolutePath)) {
    failures.push(`${label}: missing ${relativePath}`)
  }
}

function assertMarkdownLinksExist(markdownPath, { allowedMissing = new Set() } = {}) {
  const text = readFileSync(path.join(root, markdownPath), 'utf8')
  const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g
  for (const match of text.matchAll(linkPattern)) {
    const rawTarget = match[1].trim()
    if (!rawTarget || rawTarget.startsWith('http:') || rawTarget.startsWith('https:') || rawTarget.startsWith('mailto:') || rawTarget.startsWith('#')) {
      continue
    }
    const [withoutHash] = rawTarget.split('#')
    if (!withoutHash) continue

    const relativeTarget = withoutHash.startsWith('/')
      ? withoutHash.slice(1)
      : path.normalize(path.join(path.dirname(markdownPath), withoutHash))

    if (allowedMissing.has(relativeTarget)) {
      continue
    }
    assertExists(relativeTarget, `${markdownPath} link ${rawTarget}`)
  }
}

const failures = []

const roleRoutingFiles = [
  'workflow/roles/README.md',
  'workflow/roles/founder.md',
  'workflow/roles/product-manager.md',
  'workflow/roles/tech-lead.md',
  'workflow/roles/developer.md',
  'workflow/roles/end-user.md',
]

for (const file of roleRoutingFiles) {
  assertExists(file, 'README role routing')
}

const publicDomainDocs = [
  'commonality',
  'lazyGiving',
  'alignment',
  'tally',
  'content-funding',
  'civility',
  'csm',
  'conceptspace',
]

for (const domain of publicDomainDocs) {
  assertExists(`docs/end-user/${domain}/index.md`, `public domain docs home for ${domain}`)
}

const aiServiceDocs = [
  'attester-core/README.md',
  'implication-attester/README.md',
  'content-attester/README.md',
  'beat-agent/README.md',
  'implication-finder/README.md',
  'content-finder/README.md',
  'implication-graph-nudger/README.md',
  'explorer-curator/README.md',
  'platform-api-service/README.md',
  'service-host/README.md',
  'specs/product/bridge-creator.md',
  'specs/tech/subsystems/nudger/README.md',
  'specs/tech/subsystems/conceptspace/explorer.md',
]

for (const file of aiServiceDocs) {
  assertExists(file, 'AI-service docs inventory')
}

assertMarkdownLinksExist('README.md')
assertMarkdownLinksExist('workflow/roles/developer.md')
assertMarkdownLinksExist('specs/product/ai-assistance.md')

if (failures.length > 0) {
  console.error('Documentation inventory check failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Documentation inventory check passed.')
