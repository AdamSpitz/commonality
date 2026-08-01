import fs from 'node:fs'
import { decodeAbiParameters, decodeFunctionData, sha256, toBytes } from 'viem'

const publishedDataAbi = [{
  type: 'function',
  name: 'publishData',
  stateMutability: 'nonpayable',
  inputs: [{ name: 'content', type: 'bytes' }],
  outputs: [{ name: 'dataId', type: 'bytes32' }],
}]

function readEnv(path) {
  if (!fs.existsSync(path)) return {}
  return Object.fromEntries(fs.readFileSync(path, 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)] }))
}

const fileEnv = { ...readEnv('.env.secrets'), ...readEnv('.env') }
const eventCacheUrl = process.env.EVENT_CACHE_URL ?? 'https://commonality-indexer.onrender.com'
const contractAddress = process.env.PUBLISHED_DATA_CONTRACT_ADDRESS ?? '0x3b8043B19D02e81b1069263Db98284346eB1A922'
const providers = [
  ['Base public', 'https://sepolia.base.org'],
  ['Configured', process.env.BASE_SEPOLIA_RPC_URL ?? fileEnv.BASE_SEPOLIA_RPC_URL],
].filter(([, url], index, all) => url && all.findIndex(([, candidate]) => candidate === url) === index)

async function rpc(url, method, params) {
  const started = performance.now()
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const body = await response.json()
  if (!response.ok || body.error) throw new Error(`${method} failed: ${response.status} ${JSON.stringify(body.error)}`)
  return { result: body.result, ms: performance.now() - started }
}

function recover(tx, event) {
  if (tx.to?.toLowerCase() !== contractAddress.toLowerCase()) {
    return { ok: false, route: 'wrapped', reason: `top-level destination is ${tx.to}` }
  }
  const decoded = decodeFunctionData({ abi: publishedDataAbi, data: tx.input })
  const content = decoded.args[0]
  const computed = sha256(content)
  const eventContent = decodeAbiParameters([{ type: 'bytes' }], event.data)[0]
  return {
    ok: computed.toLowerCase() === event.topic2.toLowerCase() && eventContent.toLowerCase() === content.toLowerCase(),
    route: 'direct',
    bytes: toBytes(content).length,
  }
}

const eventsUrl = new URL('/api/events', eventCacheUrl)
eventsUrl.searchParams.set('chainId', '84532')
eventsUrl.searchParams.set('contractAddress', contractAddress)
eventsUrl.searchParams.set('eventName', 'DataPublished')
eventsUrl.searchParams.set('limit', '1000')
const eventResponse = await fetch(eventsUrl)
if (!eventResponse.ok) throw new Error(`Indexer request failed: ${eventResponse.status}`)
const events = (await eventResponse.json()).items
const uniqueEvents = [...new Map(events.map((event) => [event.transactionHash, event])).values()]

console.log(`Found ${events.length} events in ${uniqueEvents.length} transactions.`)
for (const [name, url] of providers) {
  const cache = new Map()
  const coldStarted = performance.now()
  const fetched = await Promise.all(uniqueEvents.map(async (event) => {
    const response = await rpc(url, 'eth_getTransactionByHash', [event.transactionHash])
    cache.set(event.transactionHash, response.result)
    return { event, tx: response.result, requestMs: response.ms }
  }))
  const coldWallMs = performance.now() - coldStarted
  const recoveries = fetched.map(({ event, tx }) => recover(tx, event))
  const warmStarted = performance.now()
  const warmRecoveries = uniqueEvents.map((event) => recover(cache.get(event.transactionHash), event))
  const warmWallMs = performance.now() - warmStarted
  const requestTimes = fetched.map(({ requestMs }) => requestMs).sort((a, b) => a - b)
  console.log(JSON.stringify({
    provider: name,
    transactions: uniqueEvents.length,
    coldConcurrentWallMs: Math.round(coldWallMs),
    individualRequestMs: requestTimes.map(Math.round),
    warmMemoryCacheWallMs: Math.round(warmWallMs * 100) / 100,
    direct: recoveries.filter((result) => result.route === 'direct').length,
    wrapped: recoveries.filter((result) => result.route === 'wrapped').length,
    verified: recoveries.filter((result) => result.ok).length,
    warmVerified: warmRecoveries.filter((result) => result.ok).length,
    totalContentBytes: recoveries.reduce((sum, result) => sum + (result.bytes ?? 0), 0),
  }, null, 2))
}
