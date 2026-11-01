import { createCoinbaseWalletSDK } from '@coinbase/wallet-sdk'

const BASE_SEPOLIA = 84532
const out = document.getElementById('out')
const paymasterPath = '/paymaster'
const paymasterUrl = `${window.location.origin}${paymasterPath}`
document.getElementById('paymaster-url').textContent = paymasterUrl

function log(label, value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, (_k, v) => (
    typeof v === 'bigint' ? v.toString() : v
  ), 2)
  out.textContent = `${label}\n${text}`
  console.log(label, value)
}

const sdk = createCoinbaseWalletSDK({
  appName: 'Commonality Base Account spike',
  appLogoUrl: null,
  appChainIds: [BASE_SEPOLIA],
  preference: {
    options: 'smartWalletOnly',
  },
})

const provider = sdk.getProvider()
let account

document.getElementById('connect').onclick = async () => {
  try {
    const accounts = await provider.request({ method: 'eth_requestAccounts' })
    account = accounts[0]
    let chainId = await provider.request({ method: 'eth_chainId' })
    if (Number(chainId) !== BASE_SEPOLIA) {
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x14a34' }],
        })
        chainId = await provider.request({ method: 'eth_chainId' })
      } catch (switchErr) {
        log('Connected, but could not switch to Base Sepolia', { account, chainId, switchErr: String(switchErr) })
        return
      }
    }
    log('Connected', { account, chainId })
  } catch (err) {
    log('Connect failed', err?.message ?? String(err))
  }
}

document.getElementById('caps').onclick = async () => {
  if (!account) {
    log('Connect first', '')
    return
  }
  try {
    const caps = await provider.request({
      method: 'wallet_getCapabilities',
      params: [account],
    })
    log('wallet_getCapabilities', caps)
  } catch (err) {
    log('wallet_getCapabilities failed', err?.message ?? String(err))
  }
}

document.getElementById('probe').onclick = async () => {
  if (!account) {
    log('Connect first', '')
    return
  }
  try {
    const result = await provider.request({
      method: 'wallet_sendCalls',
      params: [{
        version: '2.0.0',
        from: account,
        chainId: '0x14a34',
        atomicRequired: false,
        calls: [{
          to: account,
          value: '0x0',
          data: '0x',
        }],
        capabilities: {
          paymasterService: { url: paymasterUrl },
        },
      }],
    })
    log('wallet_sendCalls returned (check terminal for PAYMASTER POST)', result)
  } catch (err) {
    log(
      'wallet_sendCalls failed (still check the terminal: a PAYMASTER POST means they hit our URL)',
      err?.message ?? String(err),
    )
  }
}
