#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function assertExists(relativePath, label = relativePath) {
  const absolutePath = path.join(root, relativePath)
  if (!existsSync(absolutePath)) {
    failures.push(`${label}: missing ${relativePath}`)
  }
}

function readRootJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8'))
}

function listMarkdownFiles(relativeDir) {
  const absoluteDir = path.join(root, relativeDir)
  const files = []

  for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = path.join(relativeDir, entry.name)
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(relativePath))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relativePath)
    }
  }

  return files.sort()
}

function assertMarkdownLinksExist(markdownPath, { allowedMissing = new Set(), allowAbsoluteAppRoutes = false } = {}) {
  const text = readFileSync(path.join(root, markdownPath), 'utf8')
  const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g
  for (const match of text.matchAll(linkPattern)) {
    const rawTarget = match[1].trim()
    if (!rawTarget || rawTarget.startsWith('http:') || rawTarget.startsWith('https:') || rawTarget.startsWith('mailto:') || rawTarget.startsWith('#')) {
      continue
    }
    const [withoutHash] = rawTarget.split('#')
    if (!withoutHash) continue

    if (allowAbsoluteAppRoutes && withoutHash.startsWith('/') && !withoutHash.startsWith('/docs/')) {
      continue
    }

    const relativeTarget = withoutHash.startsWith('/')
      ? withoutHash.slice(1)
      : path.normalize(path.join(path.dirname(markdownPath), withoutHash))

    if (allowedMissing.has(relativeTarget)) {
      continue
    }
    assertExists(relativeTarget, `${markdownPath} link ${rawTarget}`)
  }
}

function assertDocumentedPackagePathsExist() {
  const packageJson = readRootJson('package.json')
  const documentedWorkspacePaths = new Set(packageJson.workspaces ?? [])

  for (const workspacePath of documentedWorkspacePaths) {
    assertExists(`${workspacePath}/package.json`, `workspace package ${workspacePath}`)
  }

  const durablePackageDocs = [
    'hardhat/README.md',
    'sdk/README.md',
    'ui/README.md',
    'indexer/README.md',
    'integration-tests/README.md',
  ]

  for (const file of durablePackageDocs) {
    assertExists(file, 'developer package docs')
  }
}

function assertDocumentedCommandsStillExist(markdownPath) {
  const text = readFileSync(path.join(root, markdownPath), 'utf8')
  const packageJsonByWorkspace = new Map([['.', readRootJson('package.json')]])

  const getPackageJson = (workspacePath) => {
    if (!packageJsonByWorkspace.has(workspacePath)) {
      packageJsonByWorkspace.set(workspacePath, readRootJson(`${workspacePath}/package.json`))
    }
    return packageJsonByWorkspace.get(workspacePath)
  }

  const commandPattern = /(?:^|\s)(?:npx\s+--workspace[=\s]([\w@./-]+)\s+[^`\n]+|npm\s+run\s+([\w:-]+)(?:\s+--workspace[=\s]([\w@./-]+))?|\.\/([\w./-]+\.sh))/gm

  for (const match of text.matchAll(commandPattern)) {
    const [rawCommand, npxWorkspace, npmScript, npmWorkspace, shellScript] = match

    if (shellScript) {
      assertExists(shellScript, `${markdownPath} command ${rawCommand.trim()}`)
      continue
    }

    const workspacePath = npxWorkspace ?? npmWorkspace ?? '.'
    const packageJson = getPackageJson(workspacePath)
    if (npmScript && !packageJson.scripts?.[npmScript]) {
      failures.push(`${markdownPath} command ${rawCommand.trim()}: missing script ${npmScript} in ${workspacePath}/package.json`)
    }
  }
}

function assertEnvExamplesExist() {
  const envExampleFiles = [
    '.env.example',
    '.env.secrets.example',
    'ui/.env.example',
    'implication-attester/.env.example',
    'implication-graph-nudger/.env.example',
  ]

  for (const file of envExampleFiles) {
    assertExists(file, 'documented env example')
  }
}

function assertFileMentions(relativePath, requiredConcepts) {
  const text = readFileSync(path.join(root, relativePath), 'utf8').toLowerCase()
  for (const concept of requiredConcepts) {
    if (!text.includes(concept.toLowerCase())) {
      failures.push(`${relativePath}: missing required concept "${concept}"`)
    }
  }
}

function assertConceptspaceDocsInventory() {
  assertFileMentions('docs/end-user/conceptspace/index.md', [
    'IPFS CID',
    'belief signatures',
    'implication attestations',
    'nudgers',
    'trust settings',
    'SDK API docs',
    'Implementation packages',
  ])
  assertMarkdownLinksExist('docs/end-user/conceptspace/index.md')

  const conceptspaceSpecs = [
    'specs/tech/subsystems/conceptspace/statements.md',
    'specs/tech/subsystems/conceptspace/displayable-documents.md',
    'specs/tech/subsystems/conceptspace/implication-attester-ai.md',
    'specs/tech/subsystems/conceptspace/nudges.md',
    'specs/tech/subsystems/conceptspace/explorer.md',
    'specs/tech/subsystems/nudger/README.md',
  ]

  for (const file of conceptspaceSpecs) {
    assertExists(file, 'Conceptspace developer/trust docs')
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
  'common-sense-majority',
  'conceptspace',
]

for (const domain of publicDomainDocs) {
  assertExists(`docs/end-user/${domain}/index.md`, `public domain docs home for ${domain}`)
}

for (const file of listMarkdownFiles('docs/end-user')) {
  assertMarkdownLinksExist(file, { allowAbsoluteAppRoutes: true })
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

assertDocumentedPackagePathsExist()
assertEnvExamplesExist()
assertConceptspaceDocsInventory()

const developerDocsWithCommands = [
  'workflow/roles/developer.md',
  'workflow/local-development.md',
  'workflow/build.md',
  'verifier/testing-plan.md',
]

for (const file of developerDocsWithCommands) {
  assertExists(file, 'developer command doc')
  assertDocumentedCommandsStillExist(file)
}

if (failures.length > 0) {
  console.error('Documentation inventory check failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Documentation inventory check passed.')
