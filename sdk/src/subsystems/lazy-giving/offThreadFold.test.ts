import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createSDKMachinery } from '../../machinery.js'
import { browseStatements } from '../conceptspace/queries/browse.js'
import { getAllProjects } from './queries.js'

describe('off-thread global folds', () => {
  it('getAllProjects returns the worker result without folding inline', async () => {
    const machinery = createSDKMachinery({
      offThreadGlobalFold: async (name, args) => {
        assert.equal(name, 'getAllProjects')
        assert.deepEqual(args, [])
        return [{ address: '0xabc' }]
      },
    })
    const projects = await getAllProjects(machinery)
    assert.equal(projects.length, 1)
    assert.equal((projects[0] as { address?: string }).address, '0xabc')
  })

  it('browseStatements returns the worker result without folding inline', async () => {
    const machinery = createSDKMachinery({
      offThreadGlobalFold: async (name) => {
        assert.equal(name, 'browseStatements')
        return [{ id: 'statement-1' }]
      },
    })
    const statements = await browseStatements(machinery, { limit: 5, orderBy: 'believerCount' })
    assert.equal(statements[0]?.id, 'statement-1')
  })
})