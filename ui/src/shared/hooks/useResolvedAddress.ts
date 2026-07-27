import { useEffect, useState } from 'react'
import { usePublicClient } from 'wagmi'
import { isAddress } from 'viem'
import { normalize } from 'viem/ens'

export interface ResolvedAddress {
  /** The address the input denotes, whether typed literally or resolved from ENS. */
  address: `0x${string}` | null
  /** The normalized ENS name, when the address came from ENS rather than being typed. */
  ensName: string | null
  resolving: boolean
  /** User-facing explanation of why the input does not denote an address. */
  error: string | null
}

const EMPTY: ResolvedAddress = { address: null, ensName: null, resolving: false, error: null }

function same(a: ResolvedAddress, b: ResolvedAddress): boolean {
  return (
    a.address === b.address &&
    a.ensName === b.ensName &&
    a.resolving === b.resolving &&
    a.error === b.error
  )
}

/**
 * Keep the previous object when nothing actually changed, so that typing
 * through a long address — every prefix of which is equally unparseable —
 * does not re-render the consumer on each keystroke.
 */
function settle(next: ResolvedAddress) {
  return (prev: ResolvedAddress) => (same(prev, next) ? prev : next)
}

interface Options {
  /** Skip resolution entirely (e.g. the field is not the active input mode). */
  enabled?: boolean
  debounceMs?: number
}

/**
 * Turns free text into an address: a literal `0x…` passes through, an ENS name
 * is resolved against the connected public client after a debounce, and
 * anything else reports why it is neither.
 *
 * Callers that need the user to *confirm* a destination should key that on
 * `ensName` — an address arrived at indirectly is the one worth double-checking.
 */
export function useResolvedAddress(input: string, options: Options = {}): ResolvedAddress {
  const { enabled = true, debounceMs = 600 } = options
  const publicClient = usePublicClient()
  const [state, setState] = useState<ResolvedAddress>(EMPTY)

  useEffect(() => {
    if (!enabled) {
      setState(settle(EMPTY))
      return
    }

    const trimmed = input.trim()

    if (trimmed.length === 0) {
      setState(settle(EMPTY))
      return
    }

    if (isAddress(trimmed)) {
      setState(settle({ address: trimmed as `0x${string}`, ensName: null, resolving: false, error: null }))
      return
    }

    if (!trimmed.includes('.')) {
      setState(settle({
        address: null,
        ensName: null,
        resolving: false,
        error: 'Enter a valid Ethereum address (0x...) or ENS name (name.eth)',
      }))
      return
    }

    setState(settle({ address: null, ensName: null, resolving: true, error: null }))

    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        if (!publicClient) {
          if (!cancelled) {
            setState(settle({
              address: null,
              ensName: null,
              resolving: false,
              error: 'Cannot resolve ENS names — no network connection',
            }))
          }
          return
        }

        const normalizedName = normalize(trimmed)
        const resolved = await publicClient.getEnsAddress({ name: normalizedName })
        if (cancelled) return

        setState(
          settle(
            resolved
              ? { address: resolved, ensName: normalizedName, resolving: false, error: null }
              : {
                  address: null,
                  ensName: null,
                  resolving: false,
                  error: `Could not resolve "${trimmed}" — no address found for this ENS name`,
                },
          ),
        )
      } catch (err) {
        if (cancelled) return
        console.error('ENS resolution error:', err)
        setState(settle({
          address: null,
          ensName: null,
          resolving: false,
          error: `Could not resolve ENS name: ${err instanceof Error ? err.message : 'Unknown error'}`,
        }))
      }
    }, debounceMs)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [input, enabled, debounceMs, publicClient])

  return state
}
