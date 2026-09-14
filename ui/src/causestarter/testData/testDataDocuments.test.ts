import { beforeEach, describe, expect, it, vi } from 'vitest'

const runtimeConfig = vi.hoisted(() => ({ COMMONALITY_ENVIRONMENT: 'local' as string, VITE_TEST_DATA_REGISTRY_URL: '' }))
vi.mock('../../shared', () => ({ getRuntimeConfig: () => runtimeConfig }))

import { decryptTestData, resolveRunUrl, testDataEnvironment } from './testDataDocuments'

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

describe('test-data capability documents', () => {
  beforeEach(() => { runtimeConfig.COMMONALITY_ENVIRONMENT = 'local' })

  it('decrypts an AES-GCM document whose authentication tag is separate', async () => {
    const rawKey = new Uint8Array(32).fill(7)
    const iv = new Uint8Array(12).fill(3)
    const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt'])
    const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode('{"ok":true}')))
    const ciphertext = sealed.slice(0, -16)
    const authTag = sealed.slice(-16)
    await expect(decryptTestData({
      schema: 'commonality-test-data-encrypted-v1', algorithm: 'AES-256-GCM',
      iv: base64url(iv), ciphertext: base64url(ciphertext), authTag: base64url(authTag),
    }, base64url(rawKey))).resolves.toEqual({ ok: true })
  })

  it('hard-disables the interface on mainnet', () => {
    runtimeConfig.COMMONALITY_ENVIRONMENT = 'mainnet'
    expect(testDataEnvironment()).toBe('disabled')
  })

  it('resolves immutable run links beside the registry', () => {
    expect(resolveRunUrl('https://example.test/ipns/name/test-data/registry.enc.json', 'runs/one/run.enc.json'))
      .toBe('https://example.test/ipns/name/test-data/runs/one/run.enc.json')
  })
})
