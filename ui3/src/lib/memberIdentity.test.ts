import { beforeEach, describe, expect, it } from 'vitest'
import {
  getCurrentUser,
  getMember,
  getMemberByWallet,
  linkWallet,
  listMembersByRecent,
  loginWithUsername,
  logout,
  memberLabel,
  memberShortLabel,
  normalizeUsername,
  switchToAccount,
  validateUsername,
} from './memberIdentity'

describe('memberIdentity', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('validates and normalizes usernames', () => {
    expect(normalizeUsername('@River_Sam')).toBe('river_sam')
    expect(validateUsername('a')).toMatch(/at least/)
    expect(validateUsername('ok_user')).toBeNull()
  })

  it('logs in / creates account without wallet', () => {
    const m = loginWithUsername('River_Sam')
    expect(m.username).toBe('river_sam')
    expect(getCurrentUser()?.username).toBe('river_sam')
    expect(m.walletAddress).toBeUndefined()
    logout()
    expect(getCurrentUser()).toBeNull()
  })

  it('links wallet once and labels members by username', () => {
    loginWithUsername('alice')
    linkWallet('alice', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')
    expect(getMember('alice')?.walletAddress?.toLowerCase()).toContain('0xf39')
    expect(getMemberByWallet('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')?.username).toBe('alice')
    expect(memberShortLabel('alice')).toBe('@alice')
    expect(memberLabel('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')).toContain('@alice')

    loginWithUsername('bob')
    expect(() => linkWallet('bob', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')).toThrow(/already linked/)
  })

  it('switches between existing accounts without password', () => {
    loginWithUsername('alice')
    loginWithUsername('bob')
    expect(getCurrentUser()?.username).toBe('bob')
    expect(listMembersByRecent().map((m) => m.username)[0]).toBe('bob')

    switchToAccount('alice')
    expect(getCurrentUser()?.username).toBe('alice')
    expect(listMembersByRecent().map((m) => m.username).slice(0, 2)).toEqual(['alice', 'bob'])

    expect(() => switchToAccount('nobody_here')).toThrow(/No local account/)
  })
})
