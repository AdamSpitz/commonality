import { heuristicCheckItem } from './heuristicSafety.js'
import { checkImplications } from './implicationCheck.js'
import type { CauseAssistConfig, PlankDraft } from './types.js'
import type { RequestJsonCompletionFn } from '@commonality/attester-core'

const TAXONOMY = /\b(is|are)\s+(a\s+)?((worthwhile|important|valuable|local)\s+)*public\s+goods?\b/i
const MATERIAL_SUPPORT = /\bmaterial support\b/i
const PAY_THE_WORK = /\b(get paid|nights[- ]and[- ]weekends|unpaid nights)\b/i
const ATTESTATION_META = /\b(attested as|attestation graph|implication attester)\b/i
const SLOGAN_ONLY = /^(i am pro[- ]?(choice|life)|defund the police|black lives matter|make america great again)\.?$/i

export function qualityFailures(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return ['empty']
  const failures: string[] = []
  if (TAXONOMY.test(trimmed)) failures.push('taxonomy: classifies the topic instead of wanting an outcome')
  if (MATERIAL_SUPPORT.test(trimmed) || PAY_THE_WORK.test(trimmed)) {
    failures.push('funding-mechanism: planks the pay, not the work-product')
  }
  if (ATTESTATION_META.test(trimmed)) failures.push('meta: talks about the protocol instead of a signable want')
  if (SLOGAN_ONLY.test(trimmed)) failures.push('slogan: not self-contained enough to sign')
  const safety = heuristicCheckItem({ text: trimmed })
  if (safety && !safety.allowed) failures.push(`safety: ${safety.category}`)
  return failures
}

export function isSignablePlank(text: string): boolean {
  return qualityFailures(text).length === 0
}

export function filterSignablePlanks(planks: PlankDraft[]): PlankDraft[] {
  return planks.filter((plank) => isSignablePlank(plank.text))
}

/** If the sharpened wording fails the seed checks, keep the original and warn. */
export function gateSharpenedPlank(original: string, candidate: string, warnings: string[]): {
  plank: string
  warnings: string[]
  withheld: boolean
} {
  const failures = qualityFailures(candidate)
  if (failures.length === 0) return { plank: candidate, warnings, withheld: false }
  return {
    plank: original.trim(),
    warnings: [
      ...warnings,
      'Suggested rewording was withheld because it failed the same checks as seed generation.',
      ...failures,
    ],
    withheld: true,
  }
}

export async function attesterRoutingObjections(
  modifiedPlanks: string[],
  bridgePlank: string,
  config: CauseAssistConfig,
  requestFn?: RequestJsonCompletionFn,
): Promise<string[]> {
  if (!config.apiKey) return []
  const objections: string[] = []
  for (const modified of modifiedPlanks) {
    const check = await checkImplications(
      { mainStatement: modified, supportingStatements: [bridgePlank] },
      config,
      requestFn,
    )
    const verdict = check.results[0]
    if (!verdict) continue
    if (verdict.source === 'heuristic') continue
    if (!verdict.implies || verdict.confidence === 'low') {
      objections.push(
        `routing: attester did not bless modified→bridge (${verdict.confidence}: ${verdict.reasoning})`,
      )
    }
  }
  return objections
}
