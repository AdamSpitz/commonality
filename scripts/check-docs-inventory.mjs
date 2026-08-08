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

// Only `docs/end-user` is bundled into deployed builds (see
// ui/endUserDocsPlugin.ts). specs/, workflow/, docs/founder and docs/dev are
// repo-internal and are NOT published, so a root-absolute link from an
// end-user doc into any of them resolves fine on disk but 404s on the real
// site. Allowed absolute targets are therefore /docs/end-user/... and the
// SPA's own routes.
// Routes that may also carry a subpath (e.g. /statements/0x123). `/docs` is
// deliberately not among them: only /docs/end-user/... is published, so
// prefix-matching /docs would let /docs/founder/... through.
// /api-docs is not a React route: deploy-ui.sh generates the SDK and contract
// references and copies them into each domain's bundle as static files.
const deployedRoutePrefixes = ['/statements', '/start', '/settings', '/explore', '/api-docs']
const deployedExactRoutes = [...deployedRoutePrefixes, '/docs']

function assertEndUserLinksAreDeployable(markdownPath) {
  const text = readFileSync(path.join(root, markdownPath), 'utf8')
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const rawTarget = match[1].trim()
    if (!rawTarget.startsWith('/')) continue

    const [withoutHash] = rawTarget.split('#')
    if (withoutHash.startsWith('/docs/end-user/')) continue
    if (deployedExactRoutes.includes(withoutHash)) continue
    if (deployedRoutePrefixes.some((route) => withoutHash.startsWith(`${route}/`))) continue

    failures.push(
      `${markdownPath} link ${rawTarget}: end-user docs are deployed, but this target is not published. ` +
        `Reference repo-internal paths as inline code instead of linking to them.`,
    )
  }
}

function assertDocumentedPackagePathsExist() {
  const packageJson = readRootJson('package.json')
  const documentedWorkspacePaths = new Set(packageJson.workspaces ?? [])

  // Workspace entries may be globs (e.g. `services/*`); expand one level so the
  // check asserts on the real packages rather than the literal pattern.
  for (const workspacePath of documentedWorkspacePaths) {
    if (!workspacePath.endsWith('/*')) {
      assertExists(`${workspacePath}/package.json`, `workspace package ${workspacePath}`)
      continue
    }

    const parent = workspacePath.slice(0, -2)
    const entries = readdirSync(path.join(root, parent), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `${parent}/${entry.name}`)

    if (entries.length === 0) {
      failures.push(`workspace glob ${workspacePath}: matched no directories`)
      continue
    }

    for (const entry of entries) {
      assertExists(`${entry}/package.json`, `workspace package ${entry}`)
    }
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
    'services/implication-attester/.env.example',
    'services/implication-graph-nudger/.env.example',
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
  // Same treatment as every other end-user doc below: absolute hrefs are app
  // routes or deployed file trees, not repo paths. assertEndUserLinksAreDeployable
  // is what vets them.
  assertMarkdownLinksExist('docs/end-user/conceptspace/index.md', { allowAbsoluteAppRoutes: true })

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
  assertEndUserLinksAreDeployable(file)
}

const aiServiceDocs = [
  'services/attester-core/README.md',
  'services/implication-attester/README.md',
  'services/content-attester/README.md',
  'services/beat-agent/README.md',
  'services/implication-finder/README.md',
  'services/content-finder/README.md',
  'services/implication-graph-nudger/README.md',
  'services/explorer-curator/README.md',
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
  'verifier/README.md',
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
