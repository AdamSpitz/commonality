import { pathToFileURL } from 'node:url'
import { createCauseAssistApp } from './app.js'
import { loadConfigFromEnv } from './config.js'

export { createCauseAssistApp } from './app.js'
export { loadConfigFromEnv } from './config.js'
export { suggestStatements } from './statementSuggester.js'
export { checkSafety } from './safetyFilter.js'
export { checkCoherence } from './coherenceCheck.js'
export { attestCoherenceIfJudged } from './attestCoherence.js'
export type { AttestCoherenceDeps, AttestCoherenceResult } from './attestCoherence.js'
export { createCauseAssistMachinery, createLoadStatementText } from './loadStatementText.js'
export { parseRosterDocument, ROSTER_KIND, ROSTER_SCHEMA_VERSION } from './rosterDocument.js'
export { getCoherenceAttesterAddress, isCoherenceAttesterConfigured } from './blockchain.js'
export { ROSTER_COHERENCE_CLAIM, ROSTER_COHERENCE_TOPIC } from './coherenceClaim.js'
export { heuristicCheckAll, heuristicCheckItem } from './heuristicSafety.js'
export type * from './types.js'

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = loadConfigFromEnv()
  const app = createCauseAssistApp(config)
  app.listen(config.port, () => {
    console.log(
      `cause-assist listening on port ${config.port} (llm=${Boolean(config.apiKey)} model=${config.suggestModel} base=${config.apiBaseUrl})`,
    )
  })
}
