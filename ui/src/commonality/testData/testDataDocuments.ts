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

export function resolveRunUrl(registryUrl: string, href: string): string {
  const absolute = /^https?:\/\//i.test(registryUrl)
  const resolved = new URL(href, absolute ? registryUrl : `https://placeholder.local${registryUrl}`)
  return absolute ? resolved.toString() : `${resolved.pathname}${resolved.search}`
}
