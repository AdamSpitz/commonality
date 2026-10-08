import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import {
  getCurrentUser,
  getSession,
  linkWallet as linkWalletToMember,
  listMembersByRecent,
  loginWithUsername,
  logout as logoutSession,
  memberLabel,
  switchToAccount,
  unlinkWallet as unlinkWalletFromMember,
  updateDisplayName,
  type MemberAccount,
} from './memberIdentity'

interface SessionContextValue {
  user: MemberAccount | null
  isLoggedIn: boolean
  /** Register or resume a username (creates if new). */
  login: (username: string) => MemberAccount
  /** Switch to an existing local account (no password). */
  switchAccount: (username: string) => MemberAccount
  /** Local accounts for the picker (recent first). */
  accounts: MemberAccount[]
  logout: () => void
  setDisplayName: (name: string) => void
  linkWallet: (address: string) => MemberAccount
  unlinkWallet: () => void
  refresh: () => void
  label: string | null
}

const SessionContext = createContext<SessionContextValue | null>(null)

// Lightweight store so multiple components re-render on session change
let sessionVersion = 0
const listeners = new Set<() => void>()

function emitSessionChange() {
  sessionVersion += 1
  for (const l of listeners) l()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getVersion() {
  return sessionVersion
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const version = useSyncExternalStore(subscribe, getVersion, getVersion)
  void version

  const user = getCurrentUser()
  const accounts = listMembersByRecent()
  const [bump, setBump] = useState(0)
  void bump

  const refresh = useCallback(() => {
    emitSessionChange()
    setBump((n) => n + 1)
  }, [])

  const value = useMemo<SessionContextValue>(() => ({
    user,
    isLoggedIn: Boolean(user),
    accounts,
    login: (username: string) => {
      const m = loginWithUsername(username)
      emitSessionChange()
      setBump((n) => n + 1)
      return m
    },
    switchAccount: (username: string) => {
      const m = switchToAccount(username)
      emitSessionChange()
      setBump((n) => n + 1)
      return m
    },
    logout: () => {
      logoutSession()
      emitSessionChange()
      setBump((n) => n + 1)
    },
    setDisplayName: (name: string) => {
      const session = getSession()
      if (!session) return
      updateDisplayName(session.username, name)
      emitSessionChange()
      setBump((n) => n + 1)
    },
    linkWallet: (address: string) => {
      const session = getSession()
      if (!session) throw new Error('Log in first.')
      const m = linkWalletToMember(session.username, address)
      emitSessionChange()
      setBump((n) => n + 1)
      return m
    },
    unlinkWallet: () => {
      const session = getSession()
      if (!session) return
      unlinkWalletFromMember(session.username)
      emitSessionChange()
      setBump((n) => n + 1)
    },
    refresh,
    label: user ? memberLabel(user.username) : null,
  }), [user, accounts, refresh])

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return ctx
}
