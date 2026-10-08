import express, { type Request, type Response } from 'express'
import { ARTIFACT_KINDS, isArtifactType, type ArtifactType } from './artifacts.js'
import { GEO_KINDS, isGeoLevel, type GeoLevel } from './geo.js'
import { configuredSources, mine } from './sources.js'
import { saveExamples } from './save.js'
import { corpusDir } from './env.js'
import type { MinedExample } from './extract.js'

function invalid(res: Response, message: string): void {
  res.status(400).json({ error: 'invalid_request', message })
}

export function createMiningApp(): express.Express {
  const app = express()
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'data-mining' })
  })

  app.get('/api/catalog', (_req, res) => {
    res.json({
      artifacts: ARTIFACT_KINDS,
      sources: configuredSources(),
      geoLevels: GEO_KINDS,
    })
  })

  app.post('/api/mine', async (req: Request, res: Response) => {
    const query = typeof req.body?.query === 'string' ? req.body.query : ''
    const url = typeof req.body?.url === 'string' ? req.body.url : undefined
    const typesRaw = Array.isArray(req.body?.types) ? req.body.types : []
    const sourcesRaw = Array.isArray(req.body?.sources) ? req.body.sources : []
    const geoRaw = Array.isArray(req.body?.geoLevels) ? req.body.geoLevels : []
    const types = typesRaw.filter((value: unknown): value is ArtifactType => (
      typeof value === 'string' && isArtifactType(value)
    ))
    const sources = sourcesRaw.filter((value: unknown): value is string => typeof value === 'string')
    const geoLevels = geoRaw.filter((value: unknown): value is GeoLevel => (
      typeof value === 'string' && isGeoLevel(value)
    ))
    if (types.length === 0) {
      invalid(res, 'Choose at least one artifact type.')
      return
    }
    if (sources.length === 0) {
      invalid(res, 'Choose at least one source.')
      return
    }
    try {
      const result = await mine({ query, url, types, sources, geoLevels, limit: req.body?.limit }, { corpusDir: corpusDir() })
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: 'mine_failed', message: error instanceof Error ? error.message : String(error) })
    }
  })

  app.post('/api/save', (req: Request, res: Response) => {
    const examples = Array.isArray(req.body?.examples) ? req.body.examples as MinedExample[] : []
    const usable = examples.filter((row) => row && typeof row.text === 'string' && typeof row.type === 'string')
    try {
      const saved = saveExamples(corpusDir(), usable)
      res.json(saved)
    } catch (error) {
      invalid(res, error instanceof Error ? error.message : String(error))
    }
  })

  return app
}
