import { spawnSync } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'ui', 'dist')
const artifactDir = process.env.UI_IPFS_ARTIFACT_DIR || path.join(rootDir, 'data', 'ui-ipfs')
const ipfsApiBaseUrl = (process.env.UI_IPFS_API_URL || 'http://ipfs:5001').replace(/\/$/, '')
const gatewayBaseUrl = (process.env.UI_IPFS_GATEWAY_URL || 'http://localhost:8080/ipfs').replace(/\/$/, '')

function runOrThrow(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      HUSKY: process.env.HUSKY || '0',
      VITE_ROUTER_MODE: process.env.VITE_ROUTER_MODE || 'hash',
      VITE_GRAPHQL_URL: process.env.VITE_GRAPHQL_URL || 'http://localhost:42069/graphql',
      VITE_IPFS_GATEWAY: process.env.VITE_IPFS_GATEWAY || 'http://localhost:8080/ipfs',
      VITE_IPFS_API: process.env.VITE_IPFS_API || 'http://localhost:5001',
      VITE_PLATFORM_API_URL: process.env.VITE_PLATFORM_API_URL || 'http://localhost:3001',
      VITE_ETH_RPC_URL: process.env.VITE_ETH_RPC_URL || 'http://127.0.0.1:8545',
    },
    ...options,
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
    form.append('file', new File([buffer], `commonality-ui/${relativePath}`))
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
    cid,
    files: files.map(normalizeRelativePath),
    gatewayUrl: `${gatewayBaseUrl}/${cid}/#/`,
  }
}

async function writeArtifacts(result) {
  const metadata = `${JSON.stringify(
    {
      cid: result.cid,
      gatewayUrl: result.gatewayUrl,
      publishedAt: new Date().toISOString(),
      files: result.files,
    },
    null,
    2,
  )}\n`

  const persistArtifacts = async () => {
    await fs.mkdir(artifactDir, { recursive: true })
    await fs.writeFile(path.join(artifactDir, 'cid.txt'), `${result.cid}\n`)
    await fs.writeFile(path.join(artifactDir, 'gateway-url.txt'), `${result.gatewayUrl}\n`)
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
  console.log('Building UI in IPFS mode...')
  runOrThrow('npm', ['run', 'build:ipfs', '--workspace=ui'])

  console.log(`Publishing ${distDir} to ${ipfsApiBaseUrl}...`)
  const result = await publishDirectoryToIpfs()
  await writeArtifacts(result)

  console.log('')
  console.log('UI published to local IPFS.')
  console.log(`  CID: ${result.cid}`)
  console.log(`  Gateway: ${result.gatewayUrl}`)
  console.log(`  Artifacts: ${artifactDir}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
