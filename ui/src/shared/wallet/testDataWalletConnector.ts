import {
  createWalletClient,
  fromHex,
  getAddress,
  http,
  numberToHex,
  type EIP1193RequestFn,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { rpc } from 'viem/utils'
import { createConnector, type CreateConnectorFn } from 'wagmi'
import { ChainNotConfiguredError, ConnectorNotConnectedError } from '@wagmi/core'
import { SwitchChainError } from 'viem'

/** In-memory signer used only by a decrypted local/testnet admin run. */
export function testDataWalletConnector(privateKey: Hex, label: string): CreateConnectorFn {
  const account = privateKeyToAccount(privateKey)
  let connected = false
  let connectedChainId = 0

  return createConnector(config => ({
    id: `test-data-${account.address}`,
    name: label,
    type: 'testDataWallet',
    async setup() { connectedChainId = config.chains[0]!.id },
    async connect({ withCapabilities } = {}) {
      connected = true
      const accounts = [account.address] as const
      return {
        accounts: (withCapabilities
          ? accounts.map(address => ({ address, capabilities: {} }))
          : accounts) as never,
        chainId: connectedChainId,
      }
    },
    async disconnect() { connected = false },
    async getAccounts() {
      if (!connected) throw new ConnectorNotConnectedError()
      return [account.address]
    },
    async getChainId() { return connectedChainId },
    async isAuthorized() { return connected },
    async switchChain({ chainId }) {
      const chain = config.chains.find(candidate => candidate.id === chainId)
      if (!chain) throw new SwitchChainError(new ChainNotConfiguredError())
      connectedChainId = chainId
      config.emitter.emit('change', { chainId })
      return chain
    },
    onAccountsChanged(accounts) {
      if (accounts.length === 0) void this.onDisconnect()
      else config.emitter.emit('change', { accounts: accounts.map(value => getAddress(value)) })
    },
    onChainChanged(value) {
      connectedChainId = Number(value)
      config.emitter.emit('change', { chainId: connectedChainId })
    },
    async onDisconnect() {
      connected = false
      config.emitter.emit('disconnect')
    },
    async getProvider({ chainId } = {}) {
      const chain = config.chains.find(candidate => candidate.id === chainId) ?? config.chains[0]!
      const url = chain.rpcUrls.default.http[0]!
      const wallet = createWalletClient({ account, chain, transport: http(url) })
      const request: EIP1193RequestFn = async ({ method, params }) => {
        if (method === 'eth_chainId') return numberToHex(connectedChainId)
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') return connected ? [account.address] : []
        if (method === 'wallet_switchEthereumChain') {
          const next = fromHex((params as [{ chainId: Hex }])[0].chainId, 'number')
          await this.switchChain!({ chainId: next })
          return null
        }
        if (method === 'eth_sendTransaction') {
          const [transaction] = params as [Record<string, unknown>]
          return wallet.sendTransaction({ ...transaction, account, chain } as never)
        }
        if (method === 'personal_sign') {
          const [data] = params as [Hex, string]
          return account.signMessage({ message: { raw: data } })
        }
        if (method === 'eth_signTypedData_v4') {
          const [, typedData] = params as [string, string]
          return account.signTypedData(JSON.parse(typedData))
        }
        const body = { method, params }
        const response = await rpc.http(url, { body })
        if (response.error) throw new Error(response.error.message)
        return response.result
      }
      return { request }
    },
  }))
}
