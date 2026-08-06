import {
  type Address,
  custom,
  type EIP1193RequestFn,
  fromHex,
  getAddress,
  type Hex,
  numberToHex,
  RpcRequestError,
  SwitchChainError,
  UserRejectedRequestError,
} from 'viem'
import { rpc } from 'viem/utils'
import { createConnector, type CreateConnectorFn } from 'wagmi'
import { hardhat } from 'wagmi/chains'
import { ChainNotConfiguredError, ConnectorNotConnectedError } from '@wagmi/core'
import type { HardhatDevAccount } from './hardhatAccounts'

/**
 * Local-only connector for one Hardhat unlocked account.
 * Forwards RPC to the local node; Hardhat auto-signs as unlocked accounts.
 */
export function hardhatLocalConnector(account: HardhatDevAccount): CreateConnectorFn {
  const address = getAddress(account.address)
  let connected = false
  let connectedChainId: number = hardhat.id

  return createConnector((config) => ({
    id: `hardhat-${account.index}`,
    name: account.label,
    type: 'hardhatLocal',
    async setup() {
      connectedChainId = config.chains[0]?.id ?? hardhat.id
    },
    async connect({ chainId, withCapabilities } = {}) {
      connected = true
      let currentChainId = connectedChainId
      if (chainId && chainId !== currentChainId) {
        const chain = await this.switchChain!({ chainId })
        currentChainId = chain.id
      }
      const accounts = [address] as const
      return {
        accounts: (withCapabilities
          ? accounts.map((x) => ({
              address: getAddress(x),
              capabilities: {},
            }))
          : accounts.map((x) => getAddress(x))) as never,
        chainId: currentChainId,
      }
    },
    async disconnect() {
      connected = false
    },
    async getAccounts() {
      if (!connected) throw new ConnectorNotConnectedError()
      return [address]
    },
    async getChainId() {
      return connectedChainId
    },
    async isAuthorized() {
      return connected
    },
    async switchChain({ chainId }) {
      const chain = config.chains.find((c) => c.id === chainId)
      if (!chain) throw new SwitchChainError(new ChainNotConfiguredError())
      connectedChainId = chainId
      this.onChainChanged(numberToHex(chainId))
      return chain
    },
    onAccountsChanged(accounts) {
      if (accounts.length === 0) this.onDisconnect()
      else config.emitter.emit('change', { accounts: accounts.map((a) => getAddress(a)) })
    },
    onChainChanged(chain) {
      const id = Number(chain)
      connectedChainId = id
      config.emitter.emit('change', { chainId: id })
    },
    async onDisconnect() {
      connected = false
      config.emitter.emit('disconnect')
    },
    async getProvider({ chainId } = {}) {
      const chain = config.chains.find((c) => c.id === chainId) ?? config.chains[0]!
      const url = chain.rpcUrls.default.http[0]!

      const request: EIP1193RequestFn = async ({ method, params }) => {
        if (method === 'eth_chainId') return numberToHex(connectedChainId)
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
          return connected ? [address] : []
        }
        if (method === 'wallet_switchEthereumChain') {
          type Params = [{ chainId: Hex }]
          const next = fromHex((params as Params)[0].chainId, 'number')
          const found = config.chains.find((c) => c.id === next)
          if (!found) throw new SwitchChainError(new ChainNotConfiguredError())
          connectedChainId = next
          this.onChainChanged(numberToHex(next))
          return null
        }
        if (method === 'wallet_requestPermissions' || method === 'wallet_getPermissions') {
          return [{ parentCapability: 'eth_accounts' }]
        }
        if (method === 'personal_sign') {
          // Hardhat prefers eth_sign(address, data); personal_sign is (data, address).
          method = 'eth_sign'
          type Params = [data: Hex, addr: Address]
          params = [(params as Params)[1], (params as Params)[0]]
        }
        if (method === 'eth_sendTransaction' && Array.isArray(params) && params[0]) {
          const tx = params[0] as Record<string, unknown>
          if (!tx.from) {
            params = [{ ...tx, from: address }]
          }
        }

        const body = { method, params }
        const { error, result } = await rpc.http(url, { body })
        if (error) {
          if (error.message?.toLowerCase().includes('user rejected')) {
            throw new UserRejectedRequestError(new Error(error.message))
          }
          throw new RpcRequestError({ body, error, url })
        }
        return result
      }

      return custom({ request })({ retryCount: 0 })
    },
  }))
}
