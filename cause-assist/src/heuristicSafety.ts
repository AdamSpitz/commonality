import type { SafetyCategory, SafetyCheckItem, SafetyVerdict } from './types.js'

type HeuristicRule = {
  category: SafetyCategory
  explanation: string
  pattern: RegExp
}

/**
 * Fast local gate based on legal/AUP themes from specs/product/legal/terms-outline.md
 * and content-and-speech.md. Not a substitute for the LLM filter; catches obvious cases
 * offline and when OpenRouter is unavailable.
 */
const RULES: HeuristicRule[] = [
  {
    category: 'illegal_activity',
    explanation: 'This text appears to solicit or promote illegal activity, which our acceptable-use policy forbids.',
    pattern: /\b(hire\s+a\s+hitman|how\s+to\s+(make|build)\s+(a\s+)?bomb|child\s*porn|csam|sex\s*traffick)\b/i,
  },
  {
    category: 'sanctions_or_terror',
    explanation: 'This text appears to relate to terrorism or sanctions evasion, which we cannot facilitate.',
    pattern: /\b(fund\s+isis|support\s+al[- ]?qaeda|terrorist\s+financing|evade\s+sanctions)\b/i,
  },
  {
    category: 'fraud_or_scam',
    explanation: 'This text looks like a fraud or scam pitch (guaranteed returns, stolen funds, etc.).',
    pattern: /\b(guaranteed\s+\d+%\s+return|ponzi|rug\s*pull|stolen\s+credit\s*cards?|cash\s+out\s+stolen)\b/i,
  },
  {
    category: 'doxxing_or_pii',
    explanation: 'Statements are public and permanent. This looks like personal contact data or a home address that should not be published here.',
    pattern: /(?:\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b)|(?:\b\d{3}-\d{2}-\d{4}\b)|(?:\b\d{1,6}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,5}\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Court|Ct\.?)\b)/i,
  },
  {
    category: 'hate_or_harassment',
    explanation: 'This text appears to promote violence or dehumanizing hate against people, which we do not allow on operated surfaces.',
    pattern: /\b(kill\s+all\s+\w+|exterminate\s+the\s+\w+|gas\s+the\s+\w+)\b/i,
  },
  {
    category: 'political_campaign_funding',
    explanation: 'At launch we exclude election-period campaign fundraising. Reframe as a non-campaign public-goods goal if that is your intent.',
    pattern: /\b(donate\s+to\s+(my|our)\s+campaign|elect\s+(me|us)\s+for\s+(mayor|senate|congress|president)|campaign\s+contribution\s+for\s+\w+\s+for\s+office)\b/i,
  },
]

export function heuristicCheckItem(item: SafetyCheckItem): SafetyVerdict | null {
  const text = item.text.trim()
  if (!text) {
    return {
      text: item.text,
      fieldLabel: item.fieldLabel,
      allowed: true,
      category: 'ok',
      explanation: '',
    }
  }

  for (const rule of RULES) {
    if (rule.pattern.test(text)) {
      return {
        text: item.text,
        fieldLabel: item.fieldLabel,
        allowed: false,
        category: rule.category,
        explanation: rule.explanation,
      }
    }
  }

  return null
}

export function heuristicCheckAll(items: SafetyCheckItem[]): SafetyVerdict[] {
  return items.map((item) => {
    const hit = heuristicCheckItem(item)
    if (hit) return hit
    return {
      text: item.text,
      fieldLabel: item.fieldLabel,
      allowed: true,
      category: 'ok' as const,
      explanation: '',
    }
  })
}
