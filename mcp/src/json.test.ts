import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { jsonText } from './json.js'
import { isCauseAssistPath, loadMcpConfig, mcpFundingConfigured } from './config.js'
import { FUNDING_TOOL_NAMES } from './fundingTools.js'
import { CONCEPTSPACE_TOOL_NAMES } from './tools.js'

describe('mcp helpers', () => {
  it('serializes bigint as a decimal string', () => {
    assert.equal(jsonText({ n: 1n }), '{\n  "n": "1"\n}')
  })

  it('allow-lists cause-assist paths and rejects others', () => {
    assert.equal(isCauseAssistPath('/atomize'), true)
    assert.equal(isCauseAssistPath('/evaluate-implication'), false)
  })

  it('keeps writes off unless COMMONALITY_MCP_WRITES=1', () => {
    const previous = process.env.COMMONALITY_MCP_WRITES
    delete process.env.COMMONALITY_MCP_WRITES
    assert.equal(loadMcpConfig().writesEnabled, false)
    process.env.COMMONALITY_MCP_WRITES = '1'
    assert.equal(loadMcpConfig().writesEnabled, true)
    if (previous === undefined) delete process.env.COMMONALITY_MCP_WRITES
    else process.env.COMMONALITY_MCP_WRITES = previous
  })

  it('exports the expected tool names', () => {
    assert.ok(CONCEPTSPACE_TOOL_NAMES.includes('fetch_ipfs'))
    assert.ok(CONCEPTSPACE_TOOL_NAMES.includes('upload_ipfs'))
    assert.ok(CONCEPTSPACE_TOOL_NAMES.includes('cause_assist'))
    assert.ok(CONCEPTSPACE_TOOL_NAMES.includes('evaluate_implication'))
    assert.equal(CONCEPTSPACE_TOOL_NAMES.includes('get_project' as never), false)
    assert.deepEqual(FUNDING_TOOL_NAMES, ['get_project'])
  })

  it('registers funding tools only when the funding addresses are configured', () => {
    const names = [
      'ASSURANCE_CONTRACT_FACTORY_ADDRESS',
      'ERC1155_FACTORY_ADDRESS',
      'DELEGATABLE_NOTES_CONTRACT_ADDRESS',
      'NOTE_INTENT_ADDRESS',
    ] as const
    const previous = new Map(names.map((name) => [name, process.env[name]]))
    for (const name of names) delete process.env[name]
    assert.equal(mcpFundingConfigured(), false)
    const address = '0x0000000000000000000000000000000000000001'
    for (const name of names) process.env[name] = address
    assert.equal(mcpFundingConfigured(), true)
    for (const name of names) {
      const value = previous.get(name)
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  })

  it('conceptspace tool module does not import lazy-giving', () => {
    const toolsPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/tools.ts')
    const source = fs.readFileSync(toolsPath, 'utf8')
    assert.equal(source.includes('lazy-giving'), false)
    assert.equal(source.includes('get_project'), false)
  })
})
