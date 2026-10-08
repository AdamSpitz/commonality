import { appendFileSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { MinedExample } from './extract.js'

export function saveExamples(corpusDir: string, examples: MinedExample[]): { file: string; count: number } {
  if (examples.length === 0) {
    throw new Error('Nothing to save.')
  }
  const runsDir = path.join(corpusDir, 'runs')
  mkdirSync(runsDir, { recursive: true })
  const day = new Date().toISOString().slice(0, 10)
  const file = path.join(runsDir, `${day}.jsonl`)
  for (const example of examples) {
    appendFileSync(file, `${JSON.stringify({ ...example, savedAt: new Date().toISOString() })}\n`)
  }
  const latest = path.join(corpusDir, 'latest.json')
  const previous = existsSync(latest) ? JSON.parse(readFileSync(latest, 'utf8')) as MinedExample[] : []
  writeFileSync(latest, `${JSON.stringify([...previous, ...examples], null, 2)}\n`)
  return { file: path.relative(corpusDir, file), count: examples.length }
}
