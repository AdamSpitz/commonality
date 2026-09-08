import assert from 'node:assert/strict'
import { jsonText } from './json.js'
import { isCauseAssistPath, loadMcpConfig } from './config.js'
import { TOOL_NAMES } from './tools.js'

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
    assert.ok(TOOL_NAMES.includes('fetch_ipfs'))
    assert.ok(TOOL_NAMES.includes('upload_ipfs'))
    assert.ok(TOOL_NAMES.includes('cause_assist'))
    assert.ok(TOOL_NAMES.includes('evaluate_implication'))
  })
})
