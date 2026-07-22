export type ConsoleErrorSummary = {
  text: string
  url?: string
}

export function formatConsoleErrorSummary(error: ConsoleErrorSummary): string {
  return error.url ? `${error.text} (${error.url})` : error.text
}

export function isBenignArtifactConsoleError(error: ConsoleErrorSummary): boolean {
  const searchable = `${error.text} ${error.url ?? ''}`
  const hasPrivyContext = /PrivyAppProvider|privy|auth\.privy\.io|privy\.io|privy\.app/i.test(searchable)
  const isKnownHostedWidgetNoise = /Failed to fetch|frame-ancestors|Refused to frame|Content Security Policy|status of 403|ERR_NETWORK_CHANGED|Cross-Origin-Opener-Policy/i.test(searchable)
  return hasPrivyContext && isKnownHostedWidgetNoise
}

export function filterActionableArtifactConsoleErrors(errors: ConsoleErrorSummary[]): string[] {
  return errors
    .filter(error => !isBenignArtifactConsoleError(error))
    .map(formatConsoleErrorSummary)
}
