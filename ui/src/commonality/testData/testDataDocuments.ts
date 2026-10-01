import { getRuntimeConfig } from '../../shared'

export interface EncryptedTestDataDocument {
  schema: 'commonality-test-data-encrypted-v1'
  algorithm: 'AES-256-GCM'
  iv: string
  authTag: string
  ciphertext: string
}

export interface TestDataRegistryEntry {
  runId: string
  createdAt: string
  network: 'local' | 'testnet'
  chainId: number
  userCount: number
  actionCount: number
  href: string
}

export interface TestDataRegistry {
  schema: 'commonality-test-data-v1'
  updatedAt: string
  runs: TestDataRegistryEntry[]
}

export interface TestDataUser {
  id: number
  label: string
  address: `0x${string}`
  privateKey: `0x${string}`
  engagement: string
  wealth: number
  interests: Record<string, unknown>
  trustNetwork: string[]
  [key: string]: unknown
}

export interface TestDataRun {
  schema: 'commonality-test-data-v1'
  runId: string
  createdAt: string
  network: 'local' | 'testnet'
  chainId: number
  gitCommit?: string
  parameters: Record<string, unknown>
  entities: Record<string, unknown>
  users: TestDataUser[]
  actions: Array<Record<string, unknown>>
  metrics: Record<string, unknown>
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(base64)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

export async function decryptTestData<T>(document: EncryptedTestDataDocument, capability: string): Promise<T> {
  if (document.schema !== 'commonality-test-data-encrypted-v1' || document.algorithm !== 'AES-256-GCM') {
    throw new Error('This is not a supported Commonality test-data document.')
  }
  const rawKey = decodeBase64Url(capability)
  if (rawKey.byteLength !== 32) throw new Error('The admin capability is not a 256-bit key.')
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt'])
  const ciphertext = new Uint8Array([
    ...decodeBase64Url(document.ciphertext),
    ...decodeBase64Url(document.authTag),
  ])
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: decodeBase64Url(document.iv), tagLength: 128 },
      key,
      ciphertext,
    )
    return JSON.parse(new TextDecoder().decode(plaintext)) as T
  } catch {
    throw new Error('Could not decrypt this test-data document. Check the bookmarked capability key.')
  }
}

export async function fetchEncryptedTestData<T>(url: string, capability: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, { cache: 'no-store' })
  } catch (reason) {
    const detail = reason instanceof Error ? reason.message : String(reason)
    throw new Error(`Could not load test data from ${url}: ${detail}`)
  }
  if (!response.ok) throw new Error(`Could not load test data (HTTP ${response.status}).`)
  return decryptTestData<T>(await response.json() as EncryptedTestDataDocument, capability)
}

export function testDataEnvironment(): 'local' | 'testnet' | 'disabled' {
  const environment = getRuntimeConfig().COMMONALITY_ENVIRONMENT
  if (!environment || environment === 'local') return 'local'
  return environment === 'testnet' ? 'testnet' : 'disabled'
}

export function testDataRegistryUrl(): string | undefined {
  const configured = getRuntimeConfig().VITE_TEST_DATA_REGISTRY_URL
  if (configured) return configured
  if (testDataEnvironment() === 'disabled') return undefined
  return '/test-data/registry.enc.json'
}

export interface TestDataPageLink {
  title: string
  path: string
  detail?: string
  slug?: string
}

const BOARD_ROLE_ORDER = ['commonality', 'natural-left', 'natural-right', 'modified-left', 'modified-right', 'plain']

const BOARD_ROLE_LABEL: Record<string, string> = {
  commonality: 'Common ground',
  'natural-left': 'Natural left',
  'natural-right': 'Natural right',
  'modified-left': 'Modified left',
  'modified-right': 'Modified right',
  plain: 'Cause board',
}

export function boardRoleLabel(role: string | undefined): string {
  if (!role) return 'Cause board'
  return BOARD_ROLE_LABEL[role] ?? role
}

function linksFrom(value: unknown): TestDataPageLink[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    const title = typeof record.title === 'string' ? record.title : ''
    const path = typeof record.path === 'string' ? record.path : ''
    if (!title || !path.startsWith('/')) return []
    const detail = typeof record.role === 'string' ? record.role : undefined
    const slug = typeof record.slug === 'string' ? record.slug : undefined
    return [{ title, path, ...(detail ? { detail } : {}), ...(slug ? { slug } : {}) }]
  })
}

/** Cause boards and bridge clusters recorded on a generated run. */
export function testDataRunLinks(entities: Record<string, unknown>): { causeBoards: TestDataPageLink[]; bridges: TestDataPageLink[] } {
  return {
    causeBoards: linksFrom(entities.causeBoards),
    bridges: linksFrom(entities.bridges),
  }
}

export interface TestDataPageGroup {
  kind: 'bridge' | 'cause'
  title: string
  path: string
  boards: TestDataPageLink[]
}

function bridgeStem(slug: string | undefined): string | undefined {
  if (!slug) return undefined
  return slug.endsWith('-cluster') ? slug.slice(0, -'-cluster'.length) : slug
}

function displayCauseTitle(title: string): string {
  if (/\s/.test(title)) return title
  return title.replaceAll('-', ' ').replace(/\b\w/g, character => character.toUpperCase())
}

function humanBridgeTitle(bridge: TestDataPageLink, boards: TestDataPageLink[]): string {
  const commonGround = boards.find(board => board.detail === 'commonality')
  if (commonGround) return commonGround.title.replace(/ — .*$/, '')
  return bridge.title.replace(/ bridge$/i, '').replaceAll('-', ' ')
}

function byRole(a: TestDataPageLink, b: TestDataPageLink): number {
  const rank = (role: string | undefined) => {
    const index = BOARD_ROLE_ORDER.indexOf(role ?? '')
    return index === -1 ? BOARD_ROLE_ORDER.length : index
  }
  return rank(a.detail) - rank(b.detail) || a.title.localeCompare(b.title)
}

/**
 * Group recorded publications the way someone browsing the run wants to open them:
 * each bridge with the boards that belong to it, then standalone cause boards.
 */
export function testDataPageGroups(entities: Record<string, unknown>): TestDataPageGroup[] {
  const { causeBoards, bridges } = testDataRunLinks(entities)
  const claimed = new Set<string>()
  const groups: TestDataPageGroup[] = bridges.map(bridge => {
    const stem = bridgeStem(bridge.slug)
    const boards = stem
      ? causeBoards.filter(board => board.slug === stem || board.slug?.startsWith(`${stem}-`))
      : []
    for (const board of boards) claimed.add(board.path)
    return { kind: 'bridge' as const, title: humanBridgeTitle(bridge, boards), path: bridge.path, boards: boards.sort(byRole) }
  })
  for (const board of causeBoards) {
    if (claimed.has(board.path)) continue
    groups.push({ kind: 'cause', title: displayCauseTitle(board.title), path: board.path, boards: [] })
  }
  return groups
}

export function resolveRunUrl(registryUrl: string, href: string): string {
  const absolute = /^https?:\/\//i.test(registryUrl)
  const resolved = new URL(href, absolute ? registryUrl : `https://placeholder.local${registryUrl}`)
  return absolute ? resolved.toString() : `${resolved.pathname}${resolved.search}`
}
