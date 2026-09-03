import { useState } from 'react'
import {
  addTrustedNudger,
  isTrustedNudger,
  loadTrustedNudgers,
  removeTrustedNudger,
  type TrustedNudgerEntry,
} from '../hooks/useTrustedNudgers'

/** Shared opt-in toggle over the trusted-nudger store. Layout stays with the caller. */
export function useMediatorOptIn(address: string, entry: TrustedNudgerEntry | null) {
  const [nudgers, setNudgers] = useState(loadTrustedNudgers)
  const optedIn = isTrustedNudger(address, nudgers)
  const toggle = () => {
    if (!entry) return
    setNudgers(optedIn ? removeTrustedNudger(address) : addTrustedNudger(entry))
  }
  return { optedIn, toggle, canToggle: Boolean(entry) }
}
