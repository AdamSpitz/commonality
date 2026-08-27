import { describe, expect, it } from 'vitest'
import {
  HARDHAT_DEV_ACCOUNTS,
  HARDHAT_DEV_ADDRESSES,
  HARDHAT_DEV_PRIVATE_KEYS,
  isLocalDevHost,
  shortAddress,
} from './hardhatAccounts'
import { privateKeyToAccount } from 'viem/accounts'

describe('hardhatAccounts', () => {
  it('has ten well-known Hardhat accounts with matching keys', () => {
    expect(HARDHAT_DEV_ACCOUNTS).toHaveLength(10)
    expect(HARDHAT_DEV_PRIVATE_KEYS).toHaveLength(10)
    expect(HARDHAT_DEV_ADDRESSES).toHaveLength(10)

    for (const account of HARDHAT_DEV_ACCOUNTS) {
      const derived = privateKeyToAccount(account.privateKey)
      expect(derived.address.toLowerCase()).toBe(account.address.toLowerCase())
      expect(account.label).toBe(`Hardhat #${account.index}`)
    }

    expect(HARDHAT_DEV_ACCOUNTS[0]!.address.toLowerCase()).toBe(
      '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
    )
  })

  it('detects local loopback hosts', () => {
    expect(isLocalDevHost('localhost')).toBe(true)
    expect(isLocalDevHost('127.0.0.1')).toBe(true)
    expect(isLocalDevHost('[::1]')).toBe(true)
    expect(isLocalDevHost('causestarter.localhost')).toBe(true)
    expect(isLocalDevHost('example.com')).toBe(false)
    expect(isLocalDevHost('')).toBe(false)
  })

  it('shortens addresses', () => {
    expect(shortAddress('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')).toBe('0xf39F…2266')
  })
})
