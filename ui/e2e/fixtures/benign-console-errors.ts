export type ConsoleErrorSummary = {
  text: string
  url?: string
}

export function formatConsoleErrorSummary(error: ConsoleErrorSummary): string {
  return error.url ? `${error.text} (${error.url})` : error.text
}

export function isBenignArtifactConsoleError(error: ConsoleErrorSummary): boolean {
  void error
  return false
}

export function filterActionableArtifactConsoleErrors(errors: ConsoleErrorSummary[]): string[] {
  return errors
    .filter(error => !isBenignArtifactConsoleError(error))
    .map(formatConsoleErrorSummary)
}
