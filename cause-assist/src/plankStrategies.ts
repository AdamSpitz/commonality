import {
  HIDDEN_MAJORITY_PATTERN_TECHNIQUES,
  runStatementStrategy,
  type StatementStrategy,
} from '@commonality/bridge-creator/strategy-engine'
import type { RequestJsonCompletionFn } from '@commonality/attester-core'
import { STATEMENT_QUALITY_GUIDANCE } from './statementGuidance.js'
import type {
  AtomizeRequest, AtomizeResponse, CauseAssistConfig, PlankDraft,
  SharpenPlankRequest, SharpenPlankResponse,
} from './types.js'

const PATTERN_TECHNIQUES = `${HIDDEN_MAJORITY_PATTERN_TECHNIQUES.coalitionUnbundling} ${HIDDEN_MAJORITY_PATTERN_TECHNIQUES.deferDetails} ${HIDDEN_MAJORITY_PATTERN_TECHNIQUES.expressReservations} ${HIDDEN_MAJORITY_PATTERN_TECHNIQUES.hedgeDontBlur} These are generation techniques, not protocol types. Keep each claim attestable and signable. This is editorial cause assistance: clarify positions the organizer already expressed. Do not introduce a compromise, concession, or other change in position; that belongs to an explicitly labeled mediation workflow.`

function records(value: unknown, key: string): Record<string, unknown>[] {
  if (!value || typeof value !== 'object') return []
  const items = (value as Record<string, unknown>)[key]
  return Array.isArray(items) ? items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object') : []
}

function normalizePlanks(value: unknown): PlankDraft[] {
  return records(value, 'planks').flatMap((item) => {
    if (typeof item.text !== 'string' || !item.text.trim()) return []
    return [{ text: item.text.trim(), rationale: typeof item.rationale === 'string' ? item.rationale.trim() : '' }]
  }).slice(0, 5)
}

export const atomizeStrategy: StatementStrategy<AtomizeRequest, PlankDraft[]> = {
  name: 'cause-assist-atomize',
  systemPrompt: `You propose atomic planks for a public-goods cause from an organizer's stated intent. The human may reject every proposal. This is cause assistance, not mediation.\n\n${STATEMENT_QUALITY_GUIDANCE}\n\n${PATTERN_TECHNIQUES}\n\nReturn JSON only: {"planks":[{"text":"...","rationale":"which expressed seam this captures and why it is signable"}]}.`,
  renderInput: (input) => ({
    rough_cause_description: input.description,
    existing_planks: input.existingPlanks ?? [],
    desired_count: input.count ?? 4,
    instruction: 'Produce distinct candidate planks, not a main statement, slogan, manifesto, or anchor. Do not require or assert implications between them.',
  }),
  normalize: normalizePlanks,
  temperature: 0.35,
}

export const sharpenStrategy: StatementStrategy<SharpenPlankRequest, Omit<SharpenPlankResponse, 'source'>> = {
  name: 'cause-assist-sharpen-plank',
  systemPrompt: `You sharpen one cause plank against a two-sided quality bar: crisp enough for an implication attester to reason about, and natural enough for a real supporter to sign publicly.\n\n${STATEMENT_QUALITY_GUIDANCE}\n\n${PATTERN_TECHNIQUES}\n\nPreserve the author's substantive position. Return JSON only: {"plank":"...","rationale":"...","warnings":["..."]}. Warnings identify ambiguity that could silently prevent implication arrows.`,
  renderInput: (input) => ({ plank: input.plank, cause_description: input.causeDescription ?? null }),
  normalize: (value) => {
    const record = value && typeof value === 'object' ? value as Record<string, unknown> : {}
    if (typeof record.plank !== 'string' || !record.plank.trim()) throw new Error('Sharpen response is missing plank')
    return {
      plank: record.plank.trim(),
      rationale: typeof record.rationale === 'string' ? record.rationale.trim() : '',
      warnings: Array.isArray(record.warnings) ? record.warnings.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean) : [],
    }
  },
}

function engineConfig(config: CauseAssistConfig) {
  return { apiKey: config.apiKey!, baseUrl: config.apiBaseUrl, model: config.suggestModel }
}

function dependencies(requestJsonCompletionFn?: RequestJsonCompletionFn) {
  return requestJsonCompletionFn ? { requestJsonCompletion: requestJsonCompletionFn } : undefined
}

export async function atomizeCause(request: AtomizeRequest, config: CauseAssistConfig, requestFn?: RequestJsonCompletionFn): Promise<AtomizeResponse> {
  const count = Math.min(5, Math.max(1, Math.floor(request.count ?? 4)))
  if (!config.apiKey) return { planks: [], source: 'fallback' }
  const planks = await runStatementStrategy(atomizeStrategy, { ...request, count }, engineConfig(config), dependencies(requestFn))
  return { planks: planks.slice(0, count), source: 'llm' }
}

export async function sharpenPlank(request: SharpenPlankRequest, config: CauseAssistConfig, requestFn?: RequestJsonCompletionFn): Promise<SharpenPlankResponse> {
  if (!config.apiKey) return { plank: request.plank.trim(), rationale: 'No language model is configured; wording was left unchanged.', warnings: ['Automated attestability review is unavailable.'], source: 'fallback' }
  return { ...await runStatementStrategy(sharpenStrategy, request, engineConfig(config), dependencies(requestFn)), source: 'llm' }
}

export function draftDisjunctiveAnchor(planks: string[]) {
  const disjuncts = planks.map((plank) => plank.trim())
  const anchor = `I support at least one of the following:\n${disjuncts.map((plank, index) => `${index + 1}. ${plank}`).join('\n')}`
  return {
    anchor,
    disjuncts,
    implicationChecks: disjuncts.map((plank) => ({ mainStatement: plank, supportingStatements: [anchor] })),
  }
}
