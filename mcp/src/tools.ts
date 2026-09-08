import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { fetchFromIPFS, uploadToIPFS, createWriteClients } from '@commonality/sdk/utils'
import { getStatementWithContent, getImplicationsFrom, getImplicationsTo, getUserBelief, believeStatement } from '@commonality/sdk/conceptspace'
import { getUserRef } from '@commonality/sdk/mutable-refs'
import { getProject } from '@commonality/sdk/lazy-giving'
import { BeliefsAbi } from '@commonality/sdk/abis'
import { errorResult, textResult } from './json.js'
import { isCauseAssistPath, loadMcpConfig } from './config.js'
import { fetchJson } from './http.js'
import { getMachinery } from './machinery.js'

function asCid(cid: string): IpfsCidV1 {
  return cid as IpfsCidV1
}

function requireWrites() {
  const config = loadMcpConfig()
  if (!config.writesEnabled) {
    throw new Error('Writes are disabled. Set COMMONALITY_MCP_WRITES=1 to enable upload_ipfs and believe_statement.')
  }
  return config
}

export const TOOL_NAMES = [
  'get_statement',
  'fetch_ipfs',
  'get_implications_from',
  'get_implications_to',
  'get_user_belief',
  'get_user_ref',
  'get_project',
  'indexer_status',
  'cause_assist',
  'implication_attester_status',
  'evaluate_implication',
  'upload_ipfs',
  'believe_statement',
] as const

export function registerCommonalityTools(server: McpServer): void {
  registerReadTools(server)
  registerHttpTools(server)
  registerWriteTools(server)
}

function registerReadTools(server: McpServer): void {
  server.tool(
    'get_statement',
    'Read a statement CID: on-chain belief counts plus displayable IPFS/PublishedData content.',
    { cid: z.string().describe('IPFS CID of the statement') },
    async ({ cid }) => {
      const statement = await getStatementWithContent(getMachinery(), asCid(cid))
      return textResult(statement)
    },
  )

  server.tool(
    'fetch_ipfs',
    'Fetch JSON from the configured IPFS gateway (SDK fetchFromIPFS).',
    { cid: z.string() },
    async ({ cid }) => {
      const content = await fetchFromIPFS(getMachinery().ipfsConfig, cid)
      return textResult(content)
    },
  )

  server.tool(
    'get_implications_from',
    'On-chain implication attestations originating from this statement CID.',
    {
      cid: z.string(),
      trustedAttesters: z.array(z.string()).optional(),
    },
    async ({ cid, trustedAttesters }) => {
      const rows = await getImplicationsFrom(getMachinery(), asCid(cid), trustedAttesters)
      return textResult(rows)
    },
  )

  server.tool(
    'get_implications_to',
    'On-chain implication attestations pointing at this statement CID.',
    {
      cid: z.string(),
      trustedAttesters: z.array(z.string()).optional(),
    },
    async ({ cid, trustedAttesters }) => {
      const rows = await getImplicationsTo(getMachinery(), asCid(cid), trustedAttesters)
      return textResult(rows)
    },
  )

  server.tool(
    'get_user_belief',
    'One address’s belief state for one statement CID.',
    { address: z.string(), cid: z.string() },
    async ({ address, cid }) => {
      const belief = await getUserBelief(getMachinery(), address, asCid(cid))
      return textResult(belief)
    },
  )

  server.tool(
    'get_user_ref',
    'Named mutable ref (cause boards are organizer-owned refs pointing at a roster CID).',
    { owner: z.string().describe('Organizer address'), name: z.string().describe('Ref name / slug') },
    async ({ owner, name }) => {
      const ref = await getUserRef(getMachinery(), owner, name)
      return textResult(ref)
    },
  )

  server.tool(
    'get_project',
    'Fold a LazyGiving assurance-contract address into project state.',
    { address: z.string().describe('Assurance contract address') },
    async ({ address }) => {
      const project = await getProject(getMachinery(), address)
      return textResult(project)
    },
  )

}

function registerHttpTools(server: McpServer): void {
  server.tool(
    'indexer_status',
    'GET the event-cache /status endpoint.',
    async () => {
      const { eventCacheUrl } = loadMcpConfig()
      return textResult(await fetchJson(`${eventCacheUrl}/status`))
    },
  )

  server.tool(
    'cause_assist',
    'Call Cause Assist wording helpers (no chain writes). path must be an allow-listed endpoint.',
    {
      path: z.string().describe('e.g. /atomize, /sharpen-plank, /health'),
      body: z.record(z.unknown()).optional(),
    },
    async ({ path, body }) => {
      if (!isCauseAssistPath(path)) {
        return errorResult(`Unsupported cause-assist path: ${path}`)
      }
      const { causeAssistUrl } = loadMcpConfig()
      const method = path === '/health' ? 'GET' : 'POST'
      return textResult(await fetchJson(`${causeAssistUrl}${path}`, {
        method,
        headers: method === 'POST' ? { 'content-type': 'application/json' } : undefined,
        body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
      }))
    },
  )

  server.tool(
    'implication_attester_status',
    'Implication attester GET /health (and /quote if present).',
    async () => {
      const { implicationAttesterUrl } = loadMcpConfig()
      const health = await fetchJson(`${implicationAttesterUrl}/health`)
      const quote = await fetchJson(`${implicationAttesterUrl}/quote`)
      return textResult({ health, quote })
    },
  )

  server.tool(
    'evaluate_implication',
    'POST /evaluate-implication on the implication attester. May return HTTP 402 (x402 payment). Positive results publish on-chain as that attester identity, not as the user.',
    { fromStatementCid: z.string(), toStatementCid: z.string() },
    async ({ fromStatementCid, toStatementCid }) => {
      const { implicationAttesterUrl } = loadMcpConfig()
      return textResult(await fetchJson(`${implicationAttesterUrl}/evaluate-implication`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fromStatementCid, toStatementCid }),
      }))
    },
  )

}

function registerWriteTools(server: McpServer): void {
  server.tool(
    'upload_ipfs',
    'Upload a JSON object to IPFS via the SDK (requires IPFS_API and COMMONALITY_MCP_WRITES=1).',
    { content: z.record(z.unknown()) },
    async ({ content }) => {
      try {
        requireWrites()
        const cid = await uploadToIPFS(getMachinery().ipfsConfig, content)
        return textResult({ cid })
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error))
      }
    },
  )

  server.tool(
    'believe_statement',
    'On-chain setBelief(BELIEVES) for a statement CID. Requires COMMONALITY_MCP_WRITES=1 and MCP_PRIVATE_KEY (or ETHEREUM_PRIVATE_KEY).',
    { cid: z.string() },
    async ({ cid }) => {
      try {
        const config = requireWrites()
        if (!config.privateKey) {
          throw new Error('Set MCP_PRIVATE_KEY or ETHEREUM_PRIVATE_KEY for writes.')
        }
        const clients = createWriteClients(config.privateKey, config.rpcUrl)
        const hash = await believeStatement(
          clients,
          { address: config.contractAddresses.beliefs, abi: BeliefsAbi },
          asCid(cid),
        )
        return textResult({ transactionHash: hash })
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error))
      }
    },
  )
}
