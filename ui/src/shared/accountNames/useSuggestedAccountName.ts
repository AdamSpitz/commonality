import { useCallback, useEffect, useState } from 'react'
import type { SuggestedName } from '@commonality/sdk/suggested-names'
import { getSuggestedDisplayName } from './loadSuggestedDisplayName'
import { useMachinery } from '../hooks/useMachinery'
import {
  ACCEPTED_SUGGESTED_NAME_EVENT,
  acceptSuggestedName,
  loadAcceptedSuggestedName,
} from './acceptedSuggestedNames'

const SUGGESTION_NOTE = 'Anyone can suggest a name for an address. Nothing checks that the name is true. Accept stores it only in this browser.'

export function suggestionTrustNote(suggestion: SuggestedName, account: string): string {
  const fromSelf = suggestion.attester.toLowerCase() === account.toLowerCase()
  const who = fromSelf ? 'This address suggested the name for itself.' : 'Another address suggested this name.'
  return `${who} ${SUGGESTION_NOTE}`
}

export function useSuggestedAccountName(address: string) {
  const machinery = useMachinery()
  const [acceptedName, setAcceptedName] = useState<string | null>(() => loadAcceptedSuggestedName(address))
  const [suggestion, setSuggestion] = useState<SuggestedName | null>(null)

  useEffect(() => {
    setAcceptedName(loadAcceptedSuggestedName(address))
  }, [address])

  useEffect(() => {
    const onAccepted = (event: Event) => {
      const detail = (event as CustomEvent<{ address?: string; name?: string }>).detail
      if (detail?.address === address.toLowerCase()) setAcceptedName(detail.name ?? null)
    }
    window.addEventListener(ACCEPTED_SUGGESTED_NAME_EVENT, onAccepted)
    return () => window.removeEventListener(ACCEPTED_SUGGESTED_NAME_EVENT, onAccepted)
  }, [address])

  useEffect(() => {
    let cancelled = false
    setSuggestion(null)
    getSuggestedDisplayName(machinery, address)
      .then((next) => {
        if (!cancelled) setSuggestion(next)
      })
      .catch(() => {
        if (!cancelled) setSuggestion(null)
      })
    return () => {
      cancelled = true
    }
  }, [machinery, address])

  const accept = useCallback(() => {
    if (!suggestion) return
    acceptSuggestedName(address, suggestion.name)
  }, [address, suggestion])

  return { acceptedName, suggestion, accept }
}
