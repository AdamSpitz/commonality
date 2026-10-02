import { beforeEach, describe, expect, it, vi } from 'vitest'

const runtimeConfig = vi.hoisted(() => ({ COMMONALITY_ENVIRONMENT: 'local' as string, VITE_TEST_DATA_REGISTRY_URL: '' }))
vi.mock('../../shared', () => ({ getRuntimeConfig: () => runtimeConfig }))

import { decryptTestData, resolveRunUrl, testDataEnvironment, testDataPageGroups, testDataRunLinks, testDataRunProjects } from './testDataDocuments'

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

  it('keeps cause-board and bridge paths from a run', () => {
    expect(testDataRunLinks({
      causeBoards: [{ title: 'Abortion — natural-left', path: '/cause/0xabc/abortion-left', role: 'natural-left' }, { title: 'skip' }],
      bridges: [{ title: 'Abortion bridge', path: '/bridge/0xabc/abortion-cluster' }],
    })).toEqual({
      causeBoards: [{ title: 'Abortion — natural-left', path: '/cause/0xabc/abortion-left', detail: 'natural-left' }],
      bridges: [{ title: 'Abortion bridge', path: '/bridge/0xabc/abortion-cluster' }],
    })
  })

  it('links campaign projects by assurance address and keeps their titles', () => {
    expect(testDataRunProjects({ projects: [{ title: 'Grey County guitar songbook', assuranceContract: '0xabc' }] }))
      .toEqual([{ title: 'Grey County guitar songbook', path: '/projects/0xabc', assuranceContract: '0xabc' }])
  })

  it('groups each bridge with its boards, then standalone causes', () => {
    expect(testDataPageGroups({
      causeBoards: [
        { title: 'open-source', role: 'plain', slug: 'campaign-open-source', path: '/cause/0x1/campaign-open-source' },
        { title: 'Abortion common ground — common ground', role: 'commonality', slug: 'medium-abortion-common-ground-bridge', path: '/cause/0x2/common' },
        { title: 'Abortion common ground — natural-left', role: 'natural-left', slug: 'medium-abortion-common-ground-left', path: '/cause/0x2/left' },
      ],
      bridges: [
        { title: 'abortion-common-ground bridge', slug: 'medium-abortion-common-ground-cluster', path: '/bridge/0x2/cluster' },
      ],
    })).toEqual([
      {
        kind: 'bridge',
        title: 'Abortion common ground',
        path: '/bridge/0x2/cluster',
        boards: [
          { title: 'Abortion common ground — common ground', path: '/cause/0x2/common', detail: 'commonality', slug: 'medium-abortion-common-ground-bridge' },
          { title: 'Abortion common ground — natural-left', path: '/cause/0x2/left', detail: 'natural-left', slug: 'medium-abortion-common-ground-left' },
        ],
      },
      { kind: 'cause', title: 'Open Source', path: '/cause/0x1/campaign-open-source', boards: [] },
    ])
  })

  it('hard-disables the interface on mainnet', () => {
    runtimeConfig.COMMONALITY_ENVIRONMENT = 'mainnet'
    expect(testDataEnvironment()).toBe('disabled')
  })

  it('resolves immutable run links beside the registry', () => {
    expect(resolveRunUrl('https://example.test/ipns/name/test-data/registry.enc.json', 'runs/one/run.enc.json'))
      .toBe('https://example.test/ipns/name/test-data/runs/one/run.enc.json')
    expect(resolveRunUrl('/test-data/registry.enc.json', 'runs/one/run.enc.json'))
      .toBe('/test-data/runs/one/run.enc.json')
  })
})
