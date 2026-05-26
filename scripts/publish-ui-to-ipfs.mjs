import { spawnSync } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const buildDomain = resolveDomain(process.env.VITE_DOMAIN)
const distDir = path.join(rootDir, 'ui', 'dist', buildDomain)
const artifactDir = process.env.UI_IPFS_ARTIFACT_DIR || path.join(rootDir, 'data', 'ui-ipfs')
const ipfsApiBaseUrl = (process.env.UI_IPFS_API_URL || 'http://ipfs:5001').replace(/\/$/, '')
const gatewayBaseUrl = (process.env.UI_IPFS_GATEWAY_URL || 'http://localhost:8080/ipfs').replace(/\/$/, '')
const publishDirName = `${buildDomain}-ui`
const localStableGatewayPort = process.env.UI_LOCAL_GATEWAY_PORT || '8088'

const LOCAL_STABLE_DOMAIN_URLS = {
  VITE_COMMONALITY_URL: `http://commonality.localhost:${localStableGatewayPort}/#/`,
  VITE_PUBSTARTER_URL: `http://lazyGiving.localhost:${localStableGatewayPort}/#/`,
  VITE_ALIGNMENT_URL: `http://alignment.localhost:${localStableGatewayPort}/#/`,
  VITE_TALLY_URL: `http://tally.localhost:${localStableGatewayPort}/#/`,
  VITE_CONTENT_FUNDING_URL: `http://content-funding.localhost:${localStableGatewayPort}/#/`,
  VITE_NONINFLAMMATORY_URL: `http://noninflammatory.localhost:${localStableGatewayPort}/#/`,
  VITE_CSM_URL: `http://csm.localhost:${localStableGatewayPort}/#/`,
  VITE_CONCEPTSPACE_URL: `http://conceptspace.localhost:${localStableGatewayPort}/#/`,
}

const UI_ENV_ADDRESS_MAPPINGS = {
  BELIEFS_CONTRACT_ADDRESS: 'VITE_BELIEFS_CONTRACT_ADDRESS',
  IMPLICATIONS_CONTRACT_ADDRESS: 'VITE_IMPLICATIONS_CONTRACT_ADDRESS',
  MUTABLE_REF_UPDATER_CONTRACT_ADDRESS: 'VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS',
  DELEGATABLE_NOTES_CONTRACT_ADDRESS: 'VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS',
  NOTE_INTENT_ADDRESS: 'VITE_NOTE_INTENT_CONTRACT_ADDRESS',
  ASSURANCE_CONTRACT_FACTORY_ADDRESS: 'VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS',
  ERC1155_FACTORY_ADDRESS: 'VITE_ERC1155_FACTORY_ADDRESS',
  MARKETPLACE_FACTORY_ADDRESS: 'VITE_MARKETPLACE_FACTORY_ADDRESS',
  ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS: 'VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS',
  TRUST_REGISTRY_ADDRESS: 'VITE_TRUST_REGISTRY_CONTRACT_ADDRESS',
  NUDGE_PUBLICATIONS_CONTRACT_ADDRESS: 'VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS',
  PROJECT_FACTORY_ADDRESS: 'VITE_PROJECT_FACTORY_CONTRACT_ADDRESS',
  PAYMENT_TOKEN_ADDRESS: 'VITE_PAYMENT_TOKEN_ADDRESS',
  CONTENT_REGISTRY_ADDRESS: 'VITE_CONTENT_REGISTRY_ADDRESS',
  CHANNEL_REGISTRY_ADDRESS: 'VITE_CHANNEL_REGISTRY_ADDRESS',
  CHANNEL_VERIFIER_ADDRESS: 'VITE_CHANNEL_VERIFIER_ADDRESS',
  CHANNEL_ESCROW_ADDRESS: 'VITE_CHANNEL_ESCROW_ADDRESS',
  CREATOR_CONTRACT_FACTORY_ADDRESS: 'VITE_CREATOR_CONTRACT_FACTORY_ADDRESS',
}

function parseEnvFile(content) {
  const entries = {}

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    entries[key] = value
  }

  return entries
}

async function loadEnvFile(filePath) {
  try {
    return parseEnvFile(await fs.readFile(filePath, 'utf8'))
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return {}
    }
    throw error
  }
}

async function loadUiBuildEnvFromFiles() {
  const rootEnv = await loadEnvFile(path.join(rootDir, '.env'))
  const uiEnv = await loadEnvFile(path.join(rootDir, 'ui', '.env'))
  const env = { ...uiEnv }

  for (const [sourceKey, viteKey] of Object.entries(UI_ENV_ADDRESS_MAPPINGS)) {
    if (rootEnv[sourceKey]) {
      env[viteKey] = rootEnv[sourceKey]
    }
  }

  return Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ''))
}

function runOrThrow(command, args, options = {}) {
  const { env: extraEnv = {}, ...spawnOptions } = options
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...extraEnv,
      HUSKY: process.env.HUSKY || '0',
      VITE_DOMAIN: buildDomain,
      VITE_ROUTER_MODE: process.env.VITE_ROUTER_MODE || extraEnv.VITE_ROUTER_MODE || 'hash',
      VITE_GRAPHQL_URL: process.env.VITE_GRAPHQL_URL || extraEnv.VITE_GRAPHQL_URL || 'http://localhost:42069/graphql',
      VITE_IPFS_GATEWAY: process.env.VITE_IPFS_GATEWAY || extraEnv.VITE_IPFS_GATEWAY || 'http://localhost:8080/ipfs',
      VITE_IPFS_API: process.env.VITE_IPFS_API || extraEnv.VITE_IPFS_API || 'http://localhost:5001',
      VITE_PLATFORM_API_URL: process.env.VITE_PLATFORM_API_URL || extraEnv.VITE_PLATFORM_API_URL || 'http://localhost:3001',
      VITE_ETH_RPC_URL: process.env.VITE_ETH_RPC_URL || extraEnv.VITE_ETH_RPC_URL || 'http://127.0.0.1:8545',
      ...Object.fromEntries(
        Object.entries(LOCAL_STABLE_DOMAIN_URLS).map(([key, value]) => [key, process.env[key] || extraEnv[key] || value]),
      ),
    },
    ...spawnOptions,
  })

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}`)
  }
}

async function collectFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath))
      continue
    }
    if (entry.isFile()) {
      files.push(fullPath)
    }
  }

  return files.sort()
}

function normalizeRelativePath(filePath) {
  return path.relative(distDir, filePath).split(path.sep).join('/')
}

async function publishDirectoryToIpfs() {
  const files = await collectFiles(distDir)
  if (files.length === 0) {
    throw new Error(`No files found in ${distDir}`)
  }

  const form = new FormData()
  for (const filePath of files) {
    const relativePath = normalizeRelativePath(filePath)
    const buffer = await fs.readFile(filePath)
    form.append('file', new File([buffer], `${publishDirName}/${relativePath}`))
  }

  const response = await fetch(`${ipfsApiBaseUrl}/api/v0/add?recursive=true&wrap-with-directory=true&pin=true`, {
    method: 'POST',
    body: form,
  })

  const body = await response.text()
  if (!response.ok) {
    throw new Error(`IPFS add failed with HTTP ${response.status}: ${body}`)
  }

  const lines = body
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const finalLine = lines.at(-1)
  if (!finalLine) {
    throw new Error('IPFS add returned no JSON lines')
  }

  const finalEntry = JSON.parse(finalLine)
  const cid = finalEntry.Hash
  if (!cid) {
    throw new Error(`IPFS add response did not include a final Hash: ${finalLine}`)
  }

  return {
    domain: buildDomain,
    cid,
    files: files.map(normalizeRelativePath),
    ipfsRootUrl: `${gatewayBaseUrl}/${cid}/`,
    spaUrl: `${gatewayBaseUrl}/${cid}/${publishDirName}/#/`,
    stableUrl: `http://${buildDomain}.localhost:${localStableGatewayPort}/#/`,
  }
}

async function writeArtifacts(result) {
  const metadata = `${JSON.stringify(
    {
      domain: result.domain,
      cid: result.cid,
      gatewayUrl: result.spaUrl,
      ipfsRootUrl: result.ipfsRootUrl,
      spaUrl: result.spaUrl,
      stableUrl: result.stableUrl,
      publishedAt: new Date().toISOString(),
      files: result.files,
    },
    null,
    2,
  )}\n`

  const persistArtifacts = async () => {
    await fs.mkdir(artifactDir, { recursive: true })
    await fs.writeFile(path.join(artifactDir, 'cid.txt'), `${result.cid}\n`)
    await fs.writeFile(path.join(artifactDir, 'gateway-url.txt'), `${result.spaUrl}\n`)
    await fs.writeFile(path.join(artifactDir, 'spa-url.txt'), `${result.spaUrl}\n`)
    await fs.writeFile(path.join(artifactDir, 'stable-url.txt'), `${result.stableUrl}\n`)
    await fs.writeFile(path.join(artifactDir, 'metadata.json'), metadata)
  }

  try {
    await persistArtifacts()
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'EACCES') {
      throw error
    }

    // A previous run can leave this dedicated artifact directory behind with
    // mismatched ownership. Recreate it from scratch and try once more.
    await fs.rm(artifactDir, { recursive: true, force: true })
    await persistArtifacts()
  }
}

async function main() {
  const buildEnv = await loadUiBuildEnvFromFiles()

  console.log(`Building ${buildDomain} UI in IPFS mode...`)
  runOrThrow('npm', ['run', 'ui:build:ipfs'], { env: buildEnv })

  console.log(`Publishing ${distDir} to ${ipfsApiBaseUrl}...`)
  const result = await publishDirectoryToIpfs()
  await writeArtifacts(result)

  console.log('')
  console.log('UI published to local IPFS.')
  console.log(`  CID: ${result.cid}`)
  console.log(`  IPFS root: ${result.ipfsRootUrl}`)
  console.log(`  SPA URL: ${result.spaUrl}`)
  console.log(`  Stable local URL: ${result.stableUrl}`)
  console.log(`  Artifacts: ${artifactDir}`)
}

function resolveDomain(value) {
  switch (value) {
    case 'commonality':
    case 'lazyGiving':
    case 'alignment':
    case 'tally':
    case 'content-funding':
    case 'noninflammatory':
    case 'csm':
    case 'conceptspace':
      return value
    default:
      return 'commonality'
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
