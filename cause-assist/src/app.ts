import express, { type NextFunction, type Request, type Response } from 'express'
import type { CauseAssistConfig } from './types.js'
import { suggestStatements } from './statementSuggester.js'
import { checkSafety } from './safetyFilter.js'
import { checkImplications } from './implicationCheck.js'
import type {
  CheckImplicationsRequest,
  SafetyCheckRequest,
  SuggestStatementsRequest,
} from './types.js'

export function createCauseAssistApp(config: CauseAssistConfig): express.Express {
  const app = express()
  app.use(express.json({ limit: '256kb' }))

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'cause-assist',
      llmConfigured: Boolean(config.apiKey),
      model: config.suggestModel,
      implicationModel: config.implicationModel,
      apiBaseUrl: config.apiBaseUrl,
    })
  })

  app.post('/suggest-statements', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as SuggestStatementsRequest
      if (typeof body?.goal !== 'string' || !body.goal.trim()) {
        res.status(400).json({ error: 'invalid_request', message: 'goal is required' })
        return
      }
      const result = await suggestStatements(body, config)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  app.post('/check-implications', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as CheckImplicationsRequest
      if (typeof body?.mainStatement !== 'string' || !body.mainStatement.trim()) {
        res.status(400).json({ error: 'invalid_request', message: 'mainStatement is required' })
        return
      }
      if (!Array.isArray(body.supportingStatements)) {
        res.status(400).json({ error: 'invalid_request', message: 'supportingStatements array is required' })
        return
      }
      if (body.supportingStatements.length > 20) {
        res.status(400).json({ error: 'invalid_request', message: 'at most 20 supporting statements per request' })
        return
      }
      const result = await checkImplications(body, config)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  app.post('/safety-check', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as SafetyCheckRequest
      if (!Array.isArray(body?.items)) {
        res.status(400).json({ error: 'invalid_request', message: 'items array is required' })
        return
      }
      if (body.items.length > 20) {
        res.status(400).json({ error: 'invalid_request', message: 'at most 20 items per request' })
        return
      }
      const result = await checkSafety(body, config)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error)
    res.status(500).json({
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  })

  return app
}
