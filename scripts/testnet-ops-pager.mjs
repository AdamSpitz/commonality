#!/usr/bin/env node
/**
 * Testnet ops pager. One pass, every 15 minutes.
 * Messages only when a probe flips between ok and not ok.
 * Silence means nothing new. Stdout is the message or empty.
 * Logs go to stderr. Secrets are never printed.
 *
 * State: OPS_PAGER_STATE_FILE (default tmp/testnet-ops-pager-state.json), gitignored.
 * Secrets: RENDER_API_KEY from the environment or .env.render.
 * RPC: PONDER_RPC_URL_84532 or BASE_SEPOLIA_RPC_URL. Never sepolia.base.org.
 * Notify: ntfy if OPS_PAGER_NTFY_TOPIC or OPS_PAGER_NTFY_URL is set, and/or a
 * GitHub issue when OPS_PAGER_GITHUB_ISSUE=1 (uses gh, GITHUB_REPOSITORY).
 */

import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEnvFile } from './lib/parse-env-file.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CHAIN_ID = '84532'
const LAG_LIMIT_SECONDS = 10 * 60
const PRIVATE_IPFS_SERVICE = 'commonality-published-data-ipfs'
const PUBLIC_EDGES = [
  { name: 'testnet UI config', url: 'https://testnet.commonality.works/config.json', kind: 'config' },
  { name: 'platform API health', url: 'https://commonality-platform-api.onrender.com/health', kind: 'health' },
  { name: 'cause-assist health', url: 'https://commonality-cause-assist.onrender.com/health', kind: 'health' },
]

const MONTHLY_CAPACITY = /monthly capacity limit exceeded|upgrade your scaling policy|exceeded (?:your )?monthly (?:compute|capacity|usage)/i

export function isMonthlyCapacity(text) {
  return MONTHLY_CAPACITY.test(String(text ?? ''))
}

export function isPrunedPublicRpc(url) {
  try {
    return new URL(url).hostname === 'sepolia.base.org'
  } catch {
    return false
  }
}

export function loadDotenv(path) {
  try {
    return parseEnvFile(readFileSync(path, 'utf8'))
  } catch {
    return {}
  }
}

export function resolveConfig(env = process.env, files = {}) {
  const render = files.render ?? loadDotenv(join(ROOT, '.env.render'))
  const local = files.local ?? loadDotenv(join(ROOT, '.env'))
  const pick = (...keys) => {
    for (const key of keys) {
      const value = env[key] || render[key] || local[key]
      if (value) return value
    }
    return ''
  }
  return {
    renderApiKey: pick('RENDER_API_KEY'),
    rpcUrl: pick('PONDER_RPC_URL_84532', 'BASE_SEPOLIA_RPC_URL'),
    stateFile: env.OPS_PAGER_STATE_FILE || join(ROOT, 'tmp/testnet-ops-pager-state.json'),
    ntfyTopic: env.OPS_PAGER_NTFY_TOPIC || '',
    ntfyUrl: env.OPS_PAGER_NTFY_URL || '',
    githubIssue: env.OPS_PAGER_GITHUB_ISSUE === '1',
    githubRepo: env.GITHUB_REPOSITORY || '',
    dryRun: env.OPS_PAGER_DRY_RUN === '1',
  }
}

function serviceList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

function serviceRecord(entry) {
  return entry?.service ?? entry
}

export async function listCommonalityServices(fetchImpl, apiKey) {
  const services = []
  let cursor = ''
  for (let page = 0; page < 20; page += 1) {
    const url = new URL('https://api.render.com/v1/services')
    url.searchParams.set('limit', '100')
    if (cursor) url.searchParams.set('cursor', cursor)
    const response = await fetchImpl(url, {
      headers: { authorization: `Bearer ${apiKey}`, accept: 'application/json' },
    })
    const text = await response.text()
    if (!response.ok) {
      throw new Error(`Render service list HTTP ${response.status}: ${text.slice(0, 180)}`)
    }
    const payload = JSON.parse(text)
    const batch = serviceList(payload)
    if (batch.length === 0) break
    for (const entry of batch) {
      const service = serviceRecord(entry)
      if (String(service?.name ?? '').startsWith('commonality-')) services.push(service)
    }
    const next = batch[batch.length - 1]?.cursor
    if (!next || next === cursor) break
    cursor = next
  }
  return services
}

export async function latestDeployStatus(fetchImpl, apiKey, serviceId) {
  const url = new URL(`https://api.render.com/v1/services/${serviceId}/deploys`)
  url.searchParams.set('limit', '1')
  const response = await fetchImpl(url, {
    headers: { authorization: `Bearer ${apiKey}`, accept: 'application/json' },
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`Render deploys HTTP ${response.status}: ${text.slice(0, 180)}`)
  }
  const payload = JSON.parse(text)
  const first = serviceList(payload)[0]
  return first?.deploy?.status ?? first?.status ?? 'missing'
}

function rpcErrorText(status, body) {
  const message = body?.error?.message ?? body?.message ?? ''
  return `${status} ${message} ${typeof body === 'string' ? body : JSON.stringify(body ?? '')}`
}

export async function ethCall(fetchImpl, rpcUrl, method, params) {
  const response = await fetchImpl(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const text = await response.text()
  let body = null
  try { body = JSON.parse(text) } catch { body = text }
  return { status: response.status, body, text }
}

export async function probeAlchemy(fetchImpl, rpcUrl, sleep) {
  if (!rpcUrl) return { ok: false, reason: 'Indexer RPC URL is unset (PONDER_RPC_URL_84532 / BASE_SEPOLIA_RPC_URL).' }
  if (isPrunedPublicRpc(rpcUrl)) {
    return { ok: false, reason: 'Indexer RPC is https://sepolia.base.org, which prunes history. Point it at Alchemy. Do not use the public endpoint.' }
  }
  const call = () => ethCall(fetchImpl, rpcUrl, 'eth_blockNumber', [])
  let result = await call()
  let detail = rpcErrorText(result.status, result.body)
  if (result.status === 429 && !isMonthlyCapacity(detail)) {
    await sleep(60_000)
    result = await call()
    detail = rpcErrorText(result.status, result.body)
  }
  if (isMonthlyCapacity(detail) || (result.status === 429 && isMonthlyCapacity(result.text))) {
    return {
      ok: false,
      reason: 'Alchemy monthly capacity limit exceeded. Raise the Alchemy cap or wait for the billing period. Do not wipe worker disks or bump start blocks.',
    }
  }
  if (result.status === 429) {
    return { ok: false, reason: 'Alchemy returned 429 after one retry. Not a monthly-capacity body.' }
  }
  const hex = result.body?.result
  if (result.status !== 200 || typeof hex !== 'string') {
    return { ok: false, reason: `Alchemy eth_blockNumber failed (HTTP ${result.status}).` }
  }
  const block = Number.parseInt(hex, 16)
  if (!Number.isFinite(block)) return { ok: false, reason: 'Alchemy eth_blockNumber was not a block number.' }
  const head = await ethCall(fetchImpl, rpcUrl, 'eth_getBlockByNumber', [hex, false])
  const timestamp = Number.parseInt(head.body?.result?.timestamp ?? '', 16)
  return {
    ok: true,
    reason: `Alchemy head is ${block}.`,
    block,
    timestamp: Number.isFinite(timestamp) ? timestamp : null,
  }
}

function indexerBlock(status) {
  if (!status || typeof status !== 'object') return null
  const candidates = []
  if (status.block) candidates.push(status.block)
  for (const value of Object.values(status)) {
    if (value && typeof value === 'object' && value.block) candidates.push(value.block)
  }
  const block = candidates.find((item) => Number.isFinite(item?.number) || Number.isFinite(Number(item?.number)))
  if (!block) return null
  const number = Number(block.number)
  const timestamp = Number(block.timestamp)
  return { number, timestamp: Number.isFinite(timestamp) ? timestamp : null }
}

export function lagSeconds(indexer, head) {
  if (indexer?.timestamp != null && head?.timestamp != null) return head.timestamp - indexer.timestamp
  if (indexer?.number != null && head?.block != null) return (head.block - indexer.number) * 2
  return null
}

export async function probeIndexerLag(fetchImpl, head) {
  const response = await fetchImpl('https://commonality-indexer.onrender.com/status')
  const text = await response.text()
  if (!response.ok) return { ok: false, reason: `Indexer /status HTTP ${response.status}.` }
  let payload = null
  try { payload = JSON.parse(text) } catch { return { ok: false, reason: 'Indexer /status was not JSON.' } }
  const indexed = indexerBlock(payload)
  if (!indexed) return { ok: false, reason: 'Indexer /status had no block number.' }
  if (head && head.ok === false) {
    return { ok: true, reason: `Indexer /status is at block ${indexed.number}. Lag was not measured because the Alchemy head probe failed.` }
  }
  const lag = lagSeconds(indexed, head)
  if (lag == null) return { ok: false, reason: `Indexer is at block ${indexed.number}, but the head timestamp was missing.` }
  if (lag > LAG_LIMIT_SECONDS) {
    const minutes = Math.round(lag / 60)
    return { ok: false, reason: `Indexer lag is about ${minutes} minutes (block ${indexed.number}), over the 10 minute limit.` }
  }
  return { ok: true, reason: `Indexer lag is ${Math.max(0, Math.round(lag))} seconds at block ${indexed.number}.` }
}

function chainIdOf(config) {
  return String(config?.VITE_CHAIN_ID ?? config?.chainId ?? config?.chain ?? '')
}

export async function probePublicEdges(fetchImpl) {
  const problems = []
  for (const edge of PUBLIC_EDGES) {
    try {
      const response = await fetchImpl(edge.url)
      if (response.status !== 200) {
        problems.push(`${edge.name} HTTP ${response.status}`)
        continue
      }
      if (edge.kind === 'config') {
        const config = JSON.parse(await response.text())
        if (chainIdOf(config) !== CHAIN_ID) problems.push(`${edge.name} chain is ${chainIdOf(config) || 'missing'}, not ${CHAIN_ID}`)
      }
    } catch (error) {
      problems.push(`${edge.name} ${error.message}`)
    }
  }
  if (problems.length > 0) return { ok: false, reason: problems.join('; ') + '.' }
  return { ok: true, reason: 'UI config is chain 84532 and both health URLs returned 200.' }
}

export async function probeRenderSuspend(services) {
  const suspended = services.filter((service) => service.suspended && service.suspended !== 'not_suspended')
  if (suspended.length === 0) {
    return { ok: true, reason: `${services.length} Commonality services are not suspended.` }
  }
  const names = suspended.map((service) => `${service.name} (${service.suspended})`).join(', ')
  return { ok: false, reason: `${names} suspended. Resume it in the Render dashboard.` }
}

export async function probePrivateIpfs(fetchImpl, apiKey, services) {
  const service = services.find((item) => item.name === PRIVATE_IPFS_SERVICE)
  if (!service) return { ok: false, reason: `${PRIVATE_IPFS_SERVICE} was not in the Render service list.` }
  if (service.suspended && service.suspended !== 'not_suspended') {
    return { ok: false, reason: `${PRIVATE_IPFS_SERVICE} is ${service.suspended}. Resume it in the Render dashboard.` }
  }
  const status = await latestDeployStatus(fetchImpl, apiKey, service.id)
  if (status !== 'live') return { ok: false, reason: `${PRIVATE_IPFS_SERVICE} latest deploy is ${status}, not live.` }
  return { ok: true, reason: `${PRIVATE_IPFS_SERVICE} is not suspended and the latest deploy is live.` }
}

export async function runProbes({ fetchImpl, sleep, config }) {
  const edges = probePublicEdges(fetchImpl)
  const alchemyPromise = probeAlchemy(fetchImpl, config.rpcUrl, sleep)
  if (!config.renderApiKey) {
    const reason = 'RENDER_API_KEY is unset.'
    const alchemy = await alchemyPromise
    return {
      'render-suspend': { ok: false, reason },
      alchemy: { ok: alchemy.ok, reason: alchemy.reason },
      'indexer-lag': await probeIndexerLag(fetchImpl, alchemy),
      'public-edges': await edges,
      'private-ipfs': { ok: false, reason },
    }
  }
  let services = []
  let renderError = null
  try {
    services = await listCommonalityServices(fetchImpl, config.renderApiKey)
  } catch (error) {
    renderError = error.message
  }
  const alchemy = await alchemyPromise
  const [indexer, publicEdges] = await Promise.all([
    probeIndexerLag(fetchImpl, alchemy),
    edges,
  ])
  return {
    'render-suspend': renderError
      ? { ok: false, reason: renderError }
      : await probeRenderSuspend(services),
    alchemy: { ok: alchemy.ok, reason: alchemy.reason },
    'indexer-lag': indexer,
    'public-edges': publicEdges,
    'private-ipfs': renderError
      ? { ok: false, reason: renderError }
      : await probePrivateIpfs(fetchImpl, config.renderApiKey, services),
  }
}

export function readState(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

export function flips(previous, probes) {
  const names = Object.keys(probes)
  const changed = []
  for (const name of names) {
    const before = previous?.probes?.[name]?.ok
    const after = probes[name].ok
    if (before === undefined) {
      if (!after) changed.push(name)
      continue
    }
    if (before !== after) changed.push(name)
  }
  return changed
}

export function formatMessage(probes, changed) {
  const failing = Object.entries(probes).filter(([, probe]) => !probe.ok)
  if (failing.length === 0) {
    return `Testnet ops all clear. ${changed.join(', ')} ok again.`
  }
  const lines = failing.map(([name, probe]) => `- ${name}: ${probe.reason}`)
  return `Testnet ops failing: ${failing.map(([name]) => name).join(', ')}\n${lines.join('\n')}`
}

export async function notifyGithub(message, failing) {
  const repo = process.env.GITHUB_REPOSITORY
  if (!repo) throw new Error('GITHUB_REPOSITORY is unset')
  spawnSync('gh', ['label', 'create', 'ops-pager', '--repo', repo, '--description', 'Testnet ops pager', '--color', 'B60205'], { encoding: 'utf8' })
  const list = spawnSync('gh', [
    'issue', 'list', '--repo', repo, '--label', 'ops-pager', '--state', 'open', '--json', 'number', '--limit', '1',
  ], { encoding: 'utf8' })
  if (list.status !== 0) throw new Error(list.stderr || 'gh issue list failed')
  const open = JSON.parse(list.stdout || '[]')
  const number = open[0]?.number
  if (failing) {
    if (!number) {
      const created = spawnSync('gh', [
        'issue', 'create', '--repo', repo, '--label', 'ops-pager',
        '--title', 'Testnet ops pager', '--body', message,
      ], { encoding: 'utf8' })
      if (created.status !== 0) throw new Error(created.stderr || 'gh issue create failed')
      return
    }
    const commented = spawnSync('gh', [
      'issue', 'comment', String(number), '--repo', repo, '--body', message,
    ], { encoding: 'utf8' })
    if (commented.status !== 0) throw new Error(commented.stderr || 'gh issue comment failed')
    return
  }
  if (!number) return
  const commented = spawnSync('gh', [
    'issue', 'comment', String(number), '--repo', repo, '--body', message,
  ], { encoding: 'utf8' })
  if (commented.status !== 0) throw new Error(commented.stderr || 'gh issue comment failed')
  const closed = spawnSync('gh', [
    'issue', 'close', String(number), '--repo', repo, '--reason', 'completed',
  ], { encoding: 'utf8' })
  if (closed.status !== 0) throw new Error(closed.stderr || 'gh issue close failed')
}

export async function notifyNtfy(config, message, fetchImpl) {
  const url = config.ntfyUrl || (config.ntfyTopic ? `https://ntfy.sh/${config.ntfyTopic}` : '')
  if (!url) return false
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { title: 'Testnet ops pager', 'content-type': 'text/plain' },
    body: message,
  })
  if (!response.ok) throw new Error(`ntfy HTTP ${response.status}`)
  return true
}

export async function sendMessage(config, message, failing, fetchImpl) {
  if (config.dryRun) return
  if (config.notify) {
    await config.notify(message, failing)
    return
  }
  let sent = false
  if (config.ntfyTopic || config.ntfyUrl) {
    await notifyNtfy(config, message, fetchImpl)
    sent = true
  }
  if (config.githubIssue) {
    await notifyGithub(message, failing)
    sent = true
  }
  if (!sent) throw new Error('No pager destination configured (ntfy topic/url or OPS_PAGER_GITHUB_ISSUE=1).')
}

export function writeState(path, probes) {
  mkdirSync(dirname(path), { recursive: true })
  const compact = {}
  for (const [name, probe] of Object.entries(probes)) compact[name] = { ok: probe.ok }
  writeFileSync(path, `${JSON.stringify({ updatedAt: new Date().toISOString(), probes: compact }, null, 2)}\n`)
}

export async function runPager(options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  const config = options.config ?? resolveConfig()
  const probes = await runProbes({ fetchImpl, sleep, config })
  const previous = options.previous ?? readState(config.stateFile)
  const changed = flips(previous, probes)
  if (changed.length === 0) {
    writeState(config.stateFile, probes)
    return { sent: false, probes, changed }
  }
  const failing = Object.values(probes).some((probe) => !probe.ok)
  const message = formatMessage(probes, changed)
  await sendMessage(config, message, failing, fetchImpl)
  ;(options.writeState ?? writeState)(config.stateFile, probes)
  process.stdout.write(`${message}\n`)
  return { sent: true, probes, changed, message }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  runPager().catch((error) => {
    process.stderr.write(`${error.message}\n`)
    process.exit(1)
  })
}
