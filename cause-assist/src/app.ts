import express, { type NextFunction, type Request, type Response } from 'express'
import { createRateLimiter } from '@commonality/attester-core'
import type { CauseAssistConfig } from './types.js'
import { suggestStatements } from './statementSuggester.js'
import { checkSafety } from './safetyFilter.js'
import { checkImplications } from './implicationCheck.js'
import type {
  CheckImplicationsRequest,
  SafetyCheckRequest,
  SuggestStatementsRequest,
} from './types.js'

const MAX_STATEMENT_LENGTH = 2_000
const MAX_FIELD_LABEL_LENGTH = 200
const MAX_SUPPORTING_STATEMENTS = 20
const MAX_SAFETY_ITEMS = 20
const MAX_EXISTING_STATEMENTS = 20
const MAX_SUGGESTION_COUNT = 5

function validStatement(value: unknown): value is string {
  return typeof value === 'string'
    && value.trim().length > 0
    && value.length <= MAX_STATEMENT_LENGTH
}

function invalidRequest(res: Response, message: string): void {
  res.status(400).json({ error: 'invalid_request', message })
}

export function createCauseAssistApp(config: CauseAssistConfig): express.Express {
  const app = express()
  // Requests arrive through the CauseStarter nginx service in Compose.
  app.set('trust proxy', 1)
  app.use(express.json({ limit: '64kb' }))
  app.use(
    ['/suggest-statements', '/check-implications', '/safety-check'],
    createRateLimiter({
      windowMs: 60_000,
      maxRequests: 20,
      message: 'Too many cause-assist requests; try again shortly.',
    }),
  )

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
      if (!validStatement(body?.goal)) {
        invalidRequest(res, `goal is required and must be at most ${MAX_STATEMENT_LENGTH} characters`)
        return
      }
      if (
        body.existingStatements !== undefined
        && (
          !Array.isArray(body.existingStatements)
          || body.existingStatements.length > MAX_EXISTING_STATEMENTS
          || body.existingStatements.some((statement) => !validStatement(statement))
        )
      ) {
        invalidRequest(
          res,
          `existingStatements must contain at most ${MAX_EXISTING_STATEMENTS} non-empty statements of at most ${MAX_STATEMENT_LENGTH} characters`,
        )
        return
      }
      if (
        body.count !== undefined
        && (!Number.isInteger(body.count) || body.count < 1 || body.count > MAX_SUGGESTION_COUNT)
      ) {
        invalidRequest(res, `count must be an integer from 1 to ${MAX_SUGGESTION_COUNT}`)
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
      if (!validStatement(body?.mainStatement)) {
        invalidRequest(
          res,
          `mainStatement is required and must be at most ${MAX_STATEMENT_LENGTH} characters`,
        )
        return
      }
      if (
        !Array.isArray(body.supportingStatements)
        || body.supportingStatements.length > MAX_SUPPORTING_STATEMENTS
        || body.supportingStatements.some((statement) => !validStatement(statement))
      ) {
        invalidRequest(
          res,
          `supportingStatements must contain at most ${MAX_SUPPORTING_STATEMENTS} non-empty statements of at most ${MAX_STATEMENT_LENGTH} characters`,
        )
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
      if (
        !Array.isArray(body?.items)
        || body.items.length > MAX_SAFETY_ITEMS
        || body.items.some(
          (item) => !item
            || !validStatement(item.text)
            || (item.fieldLabel !== undefined
              && (typeof item.fieldLabel !== 'string'
                || item.fieldLabel.length > MAX_FIELD_LABEL_LENGTH)),
        )
      ) {
        invalidRequest(
          res,
          `items must contain at most ${MAX_SAFETY_ITEMS} entries with non-empty text of at most ${MAX_STATEMENT_LENGTH} characters`,
        )
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
