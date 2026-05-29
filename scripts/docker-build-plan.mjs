import { existsSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const stateFile = path.join(rootDir, '.cache', 'docker-build-state.json')
const plannerVersion = 1

const commonIgnores = new Set([
  '.DS_Store',
  '.cache',
  '.git',
  '.idea',
  '.turbo',
  '.vscode',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'test-logs',
  'tmp',
])

const rootWorkspaceManifests = [
  'sdk/package.json',
  'attester-core/package.json',
  'finder-core/package.json',
  'nudger-core/package.json',
  'service-host/package.json',
  'implication-attester/package.json',
  'content-attester/package.json',
  'implication-finder/package.json',
  'content-finder/package.json',
  'bridge-creator/package.json',
  'explorer-curator/package.json',
  'platform-api-service/package.json',
  'implication-graph-nudger/package.json',
  'ui/package.json',
]

const buildConfigs = {
  'hardhat-deploy': {
    buildKey: 'hardhat-deploy',
    image: 'commonality-hardhat-deploy:dev',
    hashEntries: [
      { path: 'hardhat', ignore: ['artifacts', 'cache', 'coverage', 'typechain-types'] },
    ],
  },
  indexer: {
    buildKey: 'indexer',
    image: 'commonality-indexer:dev',
    hashEntries: [
      { path: 'indexer', ignore: [] },
    ],
  },
  'platform-api-service': {
    buildKey: 'platform-api-service',
    image: 'commonality-platform-api-service:dev',
    hashEntries: [
      '.dockerignore',
      '.npmrc',
      'package.json',
      'package-lock.json',
      'platform-api-service/Dockerfile',
      ...rootWorkspaceManifests,
      { path: 'sdk', ignore: [] },
      { path: 'platform-api-service', ignore: ['dist'] },
    ],
  },
  'service-host': {
    buildKey: 'service-host',
    image: 'commonality-service-host:dev',
    hashEntries: [
      '.dockerignore',
      '.npmrc',
      'package.json',
      'package-lock.json',
      'service-host/Dockerfile',
      ...rootWorkspaceManifests,
      { path: 'sdk', ignore: [] },
      { path: 'attester-core', ignore: [] },
      { path: 'finder-core', ignore: [] },
      { path: 'nudger-core', ignore: [] },
      { path: 'implication-attester', ignore: ['dist'] },
      { path: 'content-attester', ignore: ['dist'] },
      { path: 'implication-finder', ignore: ['dist'] },
      { path: 'content-finder', ignore: ['dist'] },
      { path: 'implication-graph-nudger', ignore: ['dist'] },
      { path: 'bridge-creator', ignore: ['dist'] },
      { path: 'explorer-curator', ignore: ['dist'] },
      { path: 'service-host', ignore: ['dist'] },
    ],
  },
  'service-host-attesters': {
    buildKey: 'service-host',
    image: 'commonality-service-host:dev',
    hashEntries: [
      '.dockerignore',
      '.npmrc',
      'package.json',
      'package-lock.json',
      'service-host/Dockerfile',
      ...rootWorkspaceManifests,
      { path: 'sdk', ignore: [] },
      { path: 'attester-core', ignore: [] },
      { path: 'finder-core', ignore: [] },
      { path: 'nudger-core', ignore: [] },
      { path: 'implication-attester', ignore: ['dist'] },
      { path: 'content-attester', ignore: ['dist'] },
      { path: 'implication-finder', ignore: ['dist'] },
      { path: 'content-finder', ignore: ['dist'] },
      { path: 'implication-graph-nudger', ignore: ['dist'] },
      { path: 'bridge-creator', ignore: ['dist'] },
      { path: 'explorer-curator', ignore: ['dist'] },
      { path: 'service-host', ignore: ['dist'] },
    ],
  },
  'service-host-workers': {
    buildKey: 'service-host',
    image: 'commonality-service-host:dev',
    hashEntries: [
      '.dockerignore',
      '.npmrc',
      'package.json',
      'package-lock.json',
      'service-host/Dockerfile',
      ...rootWorkspaceManifests,
      { path: 'sdk', ignore: [] },
      { path: 'attester-core', ignore: [] },
      { path: 'finder-core', ignore: [] },
      { path: 'nudger-core', ignore: [] },
      { path: 'implication-attester', ignore: ['dist'] },
      { path: 'content-attester', ignore: ['dist'] },
      { path: 'implication-finder', ignore: ['dist'] },
      { path: 'content-finder', ignore: ['dist'] },
      { path: 'implication-graph-nudger', ignore: ['dist'] },
      { path: 'bridge-creator', ignore: ['dist'] },
      { path: 'explorer-curator', ignore: ['dist'] },
      { path: 'service-host', ignore: ['dist'] },
    ],
  },
  'ui-ipfs-publisher-commonality': {
    buildKey: 'ui-ipfs-publisher',
    image: 'commonality-ui-ipfs-publisher:dev',
    hashEntries: [
      '.dockerignore',
      '.npmrc',
      'package.json',
      'package-lock.json',
      'scripts/publish-ui-to-ipfs.mjs',
      'ui/Dockerfile',
      'ui/.env.ipfs',
      'sdk/package.json',
      'ui/package.json',
      { path: 'sdk', ignore: [] },
      { path: 'ui', ignore: ['dist'] },
    ],
  },
}

buildConfigs['ui-ipfs-publisher-lazyGiving'] = buildConfigs['ui-ipfs-publisher-commonality']
buildConfigs['ui-ipfs-publisher-alignment'] = buildConfigs['ui-ipfs-publisher-commonality']
buildConfigs['ui-ipfs-publisher-tally'] = buildConfigs['ui-ipfs-publisher-commonality']
buildConfigs['ui-ipfs-publisher-content-funding'] = buildConfigs['ui-ipfs-publisher-commonality']
buildConfigs['ui-ipfs-publisher-civility'] = buildConfigs['ui-ipfs-publisher-commonality']
buildConfigs['ui-ipfs-publisher-common-sense-majority'] = buildConfigs['ui-ipfs-publisher-commonality']
buildConfigs['ui-ipfs-publisher-conceptspace'] = buildConfigs['ui-ipfs-publisher-commonality']

const commands = new Set(['list', 'record'])
const [, , command, ...serviceNames] = process.argv

if (!commands.has(command)) {
  console.error('Usage: node scripts/docker-build-plan.mjs <list|record> <service> [service...]')
  process.exit(1)
}

if (serviceNames.length === 0) {
  console.error('At least one service name is required.')
  process.exit(1)
}

for (const serviceName of serviceNames) {
  if (!(serviceName in buildConfigs)) {
    console.error(`Unknown service: ${serviceName}`)
    process.exit(1)
  }
}

const selectedConfigs = dedupeBuildConfigs(serviceNames)
const currentState = await loadState()

if (command === 'list') {
  const servicesToBuild = []

  for (const { serviceName, config } of selectedConfigs) {
    const hash = await computeHash(config.hashEntries)
    const previous = currentState.entries[config.buildKey]
    const imagePresent = dockerImageExists(config.image)

    if (!imagePresent || previous?.hash !== hash) {
      servicesToBuild.push(serviceName)
    }
  }

  for (const serviceName of servicesToBuild) {
    console.log(serviceName)
  }

  process.exit(0)
}

for (const { config } of selectedConfigs) {
  currentState.entries[config.buildKey] = {
    hash: await computeHash(config.hashEntries),
    image: config.image,
    plannerVersion,
    recordedAt: new Date().toISOString(),
  }
}

await fs.mkdir(path.dirname(stateFile), { recursive: true })
await fs.writeFile(stateFile, `${JSON.stringify(currentState, null, 2)}\n`)

function dedupeBuildConfigs(names) {
  const byBuildKey = new Map()

  for (const serviceName of names) {
    const config = buildConfigs[serviceName]
    if (!byBuildKey.has(config.buildKey)) {
      byBuildKey.set(config.buildKey, { serviceName, config })
    }
  }

  return [...byBuildKey.values()]
}

async function loadState() {
  if (!existsSync(stateFile)) {
    return {
      plannerVersion,
      entries: {},
    }
  }

  try {
    const parsed = JSON.parse(await fs.readFile(stateFile, 'utf8'))
    if (parsed?.plannerVersion !== plannerVersion || typeof parsed.entries !== 'object' || parsed.entries === null) {
      return {
        plannerVersion,
        entries: {},
      }
    }

    return parsed
  } catch {
    return {
      plannerVersion,
      entries: {},
    }
  }
}

function dockerImageExists(imageName) {
  const result = spawnSync('docker', ['image', 'inspect', imageName], {
    cwd: rootDir,
    stdio: 'ignore',
  })

  return result.status === 0
}

async function computeHash(entries) {
  const hash = crypto.createHash('sha256')

  for (const entry of entries) {
    if (typeof entry === 'string') {
      await hashPath(entry, [], hash)
      continue
    }

    await hashPath(entry.path, entry.ignore ?? [], hash)
  }

  return hash.digest('hex')
}

async function hashPath(relativePath, extraIgnores, hash) {
  const absolutePath = path.join(rootDir, relativePath)
  const stats = await fs.stat(absolutePath)

  if (stats.isDirectory()) {
    await hashDirectory(relativePath, extraIgnores, hash)
    return
  }

  await hashFile(relativePath, hash)
}

async function hashDirectory(relativeDir, extraIgnores, hash) {
  const absoluteDir = path.join(rootDir, relativeDir)
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true })
  const sortedEntries = entries.toSorted((left, right) => left.name.localeCompare(right.name))

  for (const entry of sortedEntries) {
    if (shouldIgnore(entry.name, extraIgnores)) {
      continue
    }

    const childRelativePath = path.posix.join(relativeDir.split(path.sep).join('/'), entry.name)
    const childAbsolutePath = path.join(absoluteDir, entry.name)
    const childStats = await fs.stat(childAbsolutePath)

    if (childStats.isDirectory()) {
      await hashDirectory(childRelativePath, extraIgnores, hash)
      continue
    }

    if (childStats.isFile()) {
      await hashFile(childRelativePath, hash)
    }
  }
}

function shouldIgnore(name, extraIgnores) {
  if (commonIgnores.has(name)) {
    return true
  }

  if (name.startsWith('.env')) {
    return true
  }

  if (name.endsWith('.log') || name.endsWith('.md') || name.endsWith('.swp') || name.endsWith('.swo')) {
    return true
  }

  return extraIgnores.includes(name)
}

async function hashFile(relativePath, hash) {
  const absolutePath = path.join(rootDir, relativePath)
  hash.update(relativePath)
  hash.update(await fs.readFile(absolutePath))
}
