import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getProject } from '@commonality/sdk/lazy-giving'
import { textResult } from './json.js'
import { getMachinery } from './machinery.js'

export const FUNDING_TOOL_NAMES = ['get_project'] as const

export function registerFundingTools(server: McpServer): void {
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
