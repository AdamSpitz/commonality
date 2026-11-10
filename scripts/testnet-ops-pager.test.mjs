import assert from 'node:assert/strict'
import test from 'node:test'
import {
  flips,
  formatMessage,
  isMonthlyCapacity,
  isPrunedPublicRpc,
  lagSeconds,
  probeAlchemy,
  probeProjectedSpend,
  resolveConfig,
  probeIndexerLag,
  probePrivateIpfs,
  probePublicEdges,
  probeRenderSuspend,
  runPager,
} from './testnet-ops-pager.mjs'

test('raw-log spend model does not page on block rate alone', async () => {
  for (const elapsed of [200, 2000]) {
    const result = await probeProjectedSpend(async (_url, init) => {
      const request = JSON.parse(init.body)
      assert.equal(request.method, 'eth_getBlockByNumber')
      assert.deepEqual(request.params, ['0x3e8', false])
      return { status: 200, text: async () => JSON.stringify({ result: { timestamp: `0x${(5000 - elapsed).toString(16)}` } }) }
    }, 'https://example.test', { ok: true, block: 2000, timestamp: 5000 })
    assert.equal(result.ok, true)
    assert.match(result.reason, /Model, not billed usage/)
    assert.match(result.reason, /event-bearing headers/)
  }
})

test('raw-log spend model pages when a poll exceeds the log window or assumed event headers', async () => {
  const head = { ok: true, block: 2000, timestamp: 5000 }
  const fetchImpl = async () => ({ status: 200, text: async () => JSON.stringify({ result: { timestamp: '0x12c0' } }) })
  const split = await probeProjectedSpend(fetchImpl, '', head, {
    logWindow: 1, baselineMonthlyCu: 0, capUsd: 30, threshold: 0.7,
  })
  assert.equal(split.ok, false)
  assert.match(split.reason, /eth_getLogs/)
  const quiet = await probeProjectedSpend(fetchImpl, '', head, {
    eventHeadersPerPoll: 0, baselineMonthlyCu: 0, capUsd: 30, threshold: 0.7,
  })
  assert.equal(quiet.ok, true)
  const busy = await probeProjectedSpend(fetchImpl, '', head, {
    eventHeadersPerPoll: 500, baselineMonthlyCu: 0, capUsd: 1, threshold: 0.7,
  })
  assert.equal(busy.ok, false)
})

test('spend model fails closed on invalid config, missing head, and bad timestamps', async () => {
  const head = { ok: true, block: 2000, timestamp: 5000 }
  const forbidden = async () => { throw new Error('must not fetch') }
  for (const settings of [{ capUsd: 0 }, { threshold: 2 }, { baselineMonthlyCu: -1 }, { pollIntervalMs: 0 }, { eventHeadersPerPoll: -1 }, { logWindow: 1.5 }]) {
    assert.equal((await probeProjectedSpend(forbidden, '', head, settings)).ok, false)
  }
  for (const badHead of [null, { ok: false }, { ...head, timestamp: null }]) {
    assert.equal((await probeProjectedSpend(forbidden, '', badHead)).ok, false)
  }
  for (const timestamp of [undefined, '0x1388', '0x1389']) {
    const result = await probeProjectedSpend(async () => ({ status: 200, text: async () => JSON.stringify({ result: { timestamp } }) }), '', head)
    assert.equal(result.ok, false)
  }
})

test('spend config accepts explicit zero baseline and overrides defaults', () => {
  const config = resolveConfig({ OPS_PAGER_ALCHEMY_BASELINE_MONTHLY_CU: '0', OPS_PAGER_ALCHEMY_CAP_USD: '100' }, { render: {}, local: {} })
  assert.equal(config.spend.baselineMonthlyCu, 0)
  assert.equal(config.spend.capUsd, 100)
})

test('monthly capacity matches Alchemy fuse text and not a bare 429', () => {
  assert.equal(isMonthlyCapacity('429 Monthly capacity limit exceeded'), true)
  assert.equal(isMonthlyCapacity('upgrade your scaling policy'), true)
  assert.equal(isMonthlyCapacity('compute units per second capacity exceeded'), false)
})

test('refuses the pruned public Base Sepolia endpoint', () => {
  assert.equal(isPrunedPublicRpc('https://sepolia.base.org'), true)
  assert.equal(isPrunedPublicRpc('https://base-sepolia.g.alchemy.com/v2/key'), false)
})

test('lag uses timestamps and treats a few blocks as fine', () => {
  assert.equal(lagSeconds({ number: 100, timestamp: 1_000 }, { timestamp: 1_020 }), 20)
  assert.equal(lagSeconds({ number: 100, timestamp: 1_000 }, { timestamp: 1_700 }) > 600, true)
  assert.equal(lagSeconds({ number: 90 }, { block: 100 }), 20)
})

test('render suspend names the service and the resume action', async () => {
  const ok = await probeRenderSuspend([{ name: 'commonality-indexer', suspended: 'not_suspended' }])
  assert.equal(ok.ok, true)
  const bad = await probeRenderSuspend([{ name: 'commonality-alignment-trust-bootstrap', suspended: 'suspended' }])
  assert.match(bad.reason, /alignment-trust-bootstrap/)
  assert.match(bad.reason, /Render dashboard/)
})

test('private IPFS fails when the latest deploy is not live', async () => {
  const fetchImpl = async () => ({ ok: true, status: 200, text: async () => JSON.stringify([{ deploy: { status: 'build_failed' } }]) })
  const result = await probePrivateIpfs(fetchImpl, 'key', [{ name: 'commonality-published-data-ipfs', id: 'srv-1', suspended: 'not_suspended' }])
  assert.equal(result.ok, false)
  assert.match(result.reason, /build_failed/)
})

test('alchemy pages on monthly capacity without a retry, and retries a burst 429 once', async () => {
  let calls = 0
  const fetchImpl = async () => {
    calls += 1
    return { status: 429, text: async () => 'Monthly capacity limit exceeded', body: { message: 'Monthly capacity limit exceeded' } }
  }
  const monthly = await probeAlchemy(fetchImpl, 'https://example.test/v2/secret', async () => { throw new Error('must not retry') })
  assert.equal(monthly.ok, false)
  assert.match(monthly.reason, /Do not wipe worker disks/)
  assert.equal(calls, 1)

  calls = 0
  let slept = 0
  const burst = await probeAlchemy(async (_url, init) => {
    calls += 1
    if (calls === 1) return { status: 429, text: async () => 'compute units per second' }
    const method = JSON.parse(init.body).method
    if (method === 'eth_blockNumber') return { status: 200, text: async () => JSON.stringify({ result: '0x10' }) }
    if (method === 'eth_chainId') return { status: 200, text: async () => JSON.stringify({ result: '0x14a34' }) }
    return { status: 200, text: async () => JSON.stringify({ result: { timestamp: '0x10' } }) }
  }, 'https://example.test/v2/secret', async (ms) => { slept = ms })
  assert.equal(burst.ok, true)
  assert.equal(slept, 60_000)
})

test('alchemy fails when the RPC chain is not Base Sepolia', async () => {
  const result = await probeAlchemy(async (_url, init) => {
    const method = JSON.parse(init.body).method
    if (method === 'eth_blockNumber') return { status: 200, text: async () => JSON.stringify({ result: '0x10' }) }
    return { status: 200, text: async () => JSON.stringify({ result: '0x1' }) }
  }, 'https://example.test/v2/secret', async () => {})
  assert.equal(result.ok, false)
  assert.match(result.reason, /not 84532/)
  assert.doesNotMatch(result.reason, /example.test/)
})

test('indexer lag is not a second failure when the Alchemy head probe already failed', async () => {
  const result = await probeIndexerLag(async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ block: { number: 10, timestamp: 1_000 } }),
  }), { ok: false, reason: 'Alchemy monthly capacity limit exceeded.' })
  assert.equal(result.ok, true)
  assert.match(result.reason, /not measured/i)
})

test('public edges require chain 84532 and HTTP 200', async () => {
  const fetchImpl = async (url) => {
    if (String(url).includes('config.json')) {
      return { status: 200, text: async () => JSON.stringify({ VITE_CHAIN_ID: '1' }) }
    }
    return { status: 503, text: async () => 'no' }
  }
  const result = await probePublicEdges(fetchImpl)
  assert.equal(result.ok, false)
  assert.match(result.reason, /not 84532/)
  assert.match(result.reason, /HTTP 503/)
})

test('pages on the first red result, stays quiet while unchanged, and sends one all-clear', async () => {
  const probes = {
    'render-suspend': { ok: false, reason: 'commonality-foo is suspended. Resume it in the Render dashboard.' },
    alchemy: { ok: true, reason: 'ok' },
  }
  assert.deepEqual(flips(null, probes), ['render-suspend'])
  assert.match(formatMessage(probes, ['render-suspend']), /render-suspend/)
  assert.equal(flips({ probes: { 'render-suspend': { ok: false }, alchemy: { ok: true } } }, probes).length, 0)
  const cleared = {
    'render-suspend': { ok: true, reason: 'ok' },
    alchemy: { ok: true, reason: 'ok' },
  }
  assert.deepEqual(flips({ probes: { 'render-suspend': { ok: false }, alchemy: { ok: true } } }, cleared), ['render-suspend'])
  assert.match(formatMessage(cleared, ['render-suspend']), /all clear/)
  const partial = {
    'render-suspend': { ok: true, reason: 'ok' },
    alchemy: { ok: false, reason: 'still capped' },
  }
  assert.match(formatMessage(partial, ['render-suspend']), /alchemy/)
  assert.doesNotMatch(formatMessage(partial, ['render-suspend']), /all clear/)

  let wrote = false
  await assert.rejects(() => runPager({
    config: {
      renderApiKey: '',
      rpcUrl: 'https://example.test',
      stateFile: '/tmp/unused',
      dryRun: false,
      notify: async () => { throw new Error('mailbox down') },
    },
    fetchImpl: async (url) => ({ ok: true, status: 200, text: async () => String(url).includes('config') ? '{"VITE_CHAIN_ID":"84532"}' : 'ok' }),
    sleep: async () => {},
    previous: null,
    writeState: () => { wrote = true },
  }))
  assert.equal(wrote, false)
})
