/**
 * Local member identity for ui3.
 *
 * Members log in with a **username**. Wallet connect/link happens only on the
 * profile page. Elsewhere we reference people by username, not ETH address.
 */

export interface MemberAccount {
  /** Unique handle, stored lowercase, displayed as @username. */
  username: string
  displayName?: string
  /** Optional linked wallet (set from profile page). */
  walletAddress?: string
  createdAt: string
  updatedAt: string
}

export interface SessionState {
  username: string
}

const MEMBERS_KEY = 'ui3.members.v1'
const SESSION_KEY = 'ui3.session.v1'
/** Most-recently-used usernames for the account picker (newest first). */
const RECENT_KEY = 'ui3.members.recent.v1'

function nowIso(): string {
  return new Date().toISOString()
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

/** Normalize username: lowercase, alphanumeric + underscore, 2–24 chars. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@+/, '')
}

export function validateUsername(raw: string): string | null {
  const u = normalizeUsername(raw)
  if (u.length < 2) return 'Username must be at least 2 characters.'
  if (u.length > 24) return 'Username must be at most 24 characters.'
  if (!/^[a-z0-9_]+$/.test(u)) return 'Use letters, numbers, and underscores only.'
  return null
}

export function listMembers(): MemberAccount[] {
  return readJson<MemberAccount[]>(MEMBERS_KEY, [])
    .slice()
    .sort((a, b) => a.username.localeCompare(b.username))
}

function listRecentUsernames(): string[] {
  return readJson<string[]>(RECENT_KEY, [])
}

function touchRecent(username: string): void {
  const u = normalizeUsername(username)
  const next = [u, ...listRecentUsernames().filter((x) => x !== u)].slice(0, 20)
  writeJson(RECENT_KEY, next)
}

/** Members ordered by last login (then alphabetical). */
export function listMembersByRecent(): MemberAccount[] {
  const recent = listRecentUsernames()
  const all = listMembers()
  const byName = new Map(all.map((m) => [m.username, m]))
  const ordered: MemberAccount[] = []
  for (const u of recent) {
    const m = byName.get(u)
    if (m) {
      ordered.push(m)
      byName.delete(u)
    }
  }
  const rest = [...byName.values()].sort((a, b) => a.username.localeCompare(b.username))
  return [...ordered, ...rest]
}

export function getMember(username: string): MemberAccount | null {
  const u = normalizeUsername(username)
  return listMembers().find((m) => m.username === u) ?? null
}

export function getMemberByWallet(address: string): MemberAccount | null {
  const lower = address.toLowerCase()
  return listMembers().find((m) => m.walletAddress?.toLowerCase() === lower) ?? null
}

function saveMember(member: MemberAccount): MemberAccount {
  const list = listMembers()
  const next = { ...member, updatedAt: nowIso() }
  const idx = list.findIndex((m) => m.username === next.username)
  if (idx >= 0) list[idx] = next
  else list.push(next)
  writeJson(MEMBERS_KEY, list)
  return next
}

export function getSession(): SessionState | null {
  return readJson<SessionState | null>(SESSION_KEY, null)
}

export function getCurrentUser(): MemberAccount | null {
  const session = getSession()
  if (!session?.username) return null
  return getMember(session.username)
}

/**
 * Log in or register with a username (local-only account).
 * Does not connect a wallet.
 */
export function loginWithUsername(rawUsername: string): MemberAccount {
  const err = validateUsername(rawUsername)
  if (err) throw new Error(err)
  const username = normalizeUsername(rawUsername)
  let member = getMember(username)
  const ts = nowIso()
  if (!member) {
    member = saveMember({
      username,
      createdAt: ts,
      updatedAt: ts,
    })
  }
  writeJson(SESSION_KEY, { username } satisfies SessionState)
  touchRecent(username)
  return member
}

/**
 * Password-less switch to an existing local account (must already exist).
 */
export function switchToAccount(rawUsername: string): MemberAccount {
  const username = normalizeUsername(rawUsername)
  const member = getMember(username)
  if (!member) {
    throw new Error(`No local account @${username}. Create it with Log in / Create.`)
  }
  writeJson(SESSION_KEY, { username } satisfies SessionState)
  touchRecent(username)
  return member
}

export function logout(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(SESSION_KEY)
}

export function updateDisplayName(username: string, displayName: string): MemberAccount | null {
  const member = getMember(username)
  if (!member) return null
  return saveMember({
    ...member,
    displayName: displayName.trim() || undefined,
  })
}

/**
 * Link a wallet to the member profile. Call only from the profile page
 * after the user connects via WalletButton there.
 */
export function linkWallet(username: string, address: string): MemberAccount {
  const member = getMember(username)
  if (!member) throw new Error('Not logged in.')
  const lower = address.toLowerCase()
  // Ensure one wallet → one member
  for (const m of listMembers()) {
    if (m.username !== member.username && m.walletAddress?.toLowerCase() === lower) {
      throw new Error(`That wallet is already linked to @${m.username}.`)
    }
  }
  return saveMember({
    ...member,
    walletAddress: address,
  })
}

export function unlinkWallet(username: string): MemberAccount | null {
  const member = getMember(username)
  if (!member) return null
  return saveMember({
    ...member,
    walletAddress: undefined,
  })
}

/** Display label: @username (or displayName · @username). */
export function memberLabel(usernameOrRef: string): string {
  const u = normalizeUsername(usernameOrRef)
  // eth address leftover?
  if (/^0x[0-9a-fA-F]{40}$/.test(usernameOrRef)) {
    const byWallet = getMemberByWallet(usernameOrRef)
    if (byWallet) {
      return byWallet.displayName
        ? `${byWallet.displayName} (@${byWallet.username})`
        : `@${byWallet.username}`
    }
    return 'Unknown member'
  }
  const member = getMember(u)
  if (member?.displayName) return `${member.displayName} (@${member.username})`
  if (member) return `@${member.username}`
  // Username not registered locally yet — still show as handle
  if (/^[a-z0-9_]+$/.test(u) && u.length >= 2) return `@${u}`
  return usernameOrRef
}

export function memberShortLabel(usernameOrRef: string): string {
  const u = normalizeUsername(usernameOrRef)
  if (/^0x[0-9a-fA-F]{40}$/.test(usernameOrRef)) {
    const byWallet = getMemberByWallet(usernameOrRef)
    return byWallet ? `@${byWallet.username}` : 'Unknown'
  }
  return `@${u}`
}

/** Resolve session actor for cause history: prefer username. */
export function sessionActorUsername(): string | undefined {
  return getSession()?.username
}

/** Wallet address of current user if linked (for chain txs when connected). */
export function sessionWalletAddress(): string | undefined {
  return getCurrentUser()?.walletAddress
}
