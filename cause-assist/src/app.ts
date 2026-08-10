import express, { type NextFunction, type Request, type Response } from 'express'
import { createRateLimiter } from '@commonality/attester-core'
import type { CauseAssistConfig } from './types.js'
import { suggestStatements } from './statementSuggester.js'
import { checkSafety } from './safetyFilter.js'
import { checkImplications } from './implicationCheck.js'
import { atomizeCause, draftDisjunctiveAnchor, sharpenPlank } from './plankStrategies.js'
import { suggestMediatorScaffold } from './mediatorScaffold.js'
import type {
  AtomizeRequest,
  CheckImplicationsRequest,
  DraftAnchorRequest,
  SafetyCheckRequest,
  SharpenPlankRequest,
  SuggestStatementsRequest,
  SuggestMediatorScaffoldRequest,
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
    ['/suggest-statements', '/atomize', '/sharpen-plank', '/draft-anchor', '/suggest-mediator-scaffold', '/check-implications', '/safety-check'],
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

  app.post('/atomize', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as AtomizeRequest
      if (!validStatement(body?.description)) {
        invalidRequest(res, `description is required and must be at most ${MAX_STATEMENT_LENGTH} characters`)
        return
      }
      if (body.existingPlanks !== undefined && (!Array.isArray(body.existingPlanks) || body.existingPlanks.length > MAX_EXISTING_STATEMENTS || body.existingPlanks.some((item) => !validStatement(item)))) {
        invalidRequest(res, `existingPlanks must contain at most ${MAX_EXISTING_STATEMENTS} valid statements`)
        return
      }
      if (body.count !== undefined && (!Number.isInteger(body.count) || body.count < 1 || body.count > MAX_SUGGESTION_COUNT)) {
        invalidRequest(res, `count must be an integer from 1 to ${MAX_SUGGESTION_COUNT}`)
        return
      }
      res.json(await atomizeCause(body, config))
    } catch (error) { next(error) }
  })

  app.post('/sharpen-plank', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as SharpenPlankRequest
      if (!validStatement(body?.plank) || (body.causeDescription !== undefined && !validStatement(body.causeDescription))) {
        invalidRequest(res, `plank and optional causeDescription must be non-empty and at most ${MAX_STATEMENT_LENGTH} characters`)
        return
      }
      res.json(await sharpenPlank(body, config))
    } catch (error) { next(error) }
  })

  app.post('/draft-anchor', (req: Request, res: Response) => {
    const body = req.body as DraftAnchorRequest
    if (!Array.isArray(body?.planks) || body.planks.length < 2 || body.planks.length > MAX_SUPPORTING_STATEMENTS || body.planks.some((item) => !validStatement(item))) {
      invalidRequest(res, `planks must contain 2–${MAX_SUPPORTING_STATEMENTS} valid statements`)
      return
    }
    res.json(draftDisjunctiveAnchor(body.planks))
  })

  app.post('/suggest-mediator-scaffold', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as SuggestMediatorScaffoldRequest
      if (!validStatement(body?.foundingStatement) || (body.name !== undefined && !validStatement(body.name))) {
        invalidRequest(res, `foundingStatement and optional name must be non-empty and at most ${MAX_STATEMENT_LENGTH} characters`)
        return
      }
      res.json(await suggestMediatorScaffold(body, config))
    } catch (error) { next(error) }
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
