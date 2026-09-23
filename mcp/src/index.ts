#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { mcpFundingConfigured } from './config.js'
import { registerCommonalityTools } from './tools.js'

const server = new McpServer({
  name: 'commonality',
  version: '0.1.0',
})

registerCommonalityTools(server)
if (mcpFundingConfigured()) {
  const { registerFundingTools } = await import('./fundingTools.js')
  registerFundingTools(server)
}

const transport = new StdioServerTransport()
await server.connect(transport)
