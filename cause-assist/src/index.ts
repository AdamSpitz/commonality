import { pathToFileURL } from 'node:url'
import { createCauseAssistApp } from './app.js'
import { loadConfigFromEnv } from './config.js'

export { createCauseAssistApp } from './app.js'
export { loadConfigFromEnv } from './config.js'
export { suggestStatements } from './statementSuggester.js'
export { checkSafety } from './safetyFilter.js'
export { checkCoherence } from './coherenceCheck.js'
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
