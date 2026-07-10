// Step 2 of the spike.
//
// Mint a Coinbase Onramp session token bound to our counterfactual smart-account
// address on Base, then print the pay.coinbase.com URL that buys USDC into it.
// Open that URL, complete Coinbase's KYC + a small card purchase, and choose
// Base / USDC if not already preset.
//
// Requires CDP_API_KEY_ID + CDP_API_KEY_SECRET in .env (see .env.example).

import { readFileSync } from 'node:fs'
import { generateJwt } from '@coinbase/cdp-sdk/auth'

// --- load .env (tiny parser; avoids a dependency) ---
try {
  for (const line of readFileSync(new URL('./.env', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/s, '$1')
  }
} catch {
  console.error('No .env found. Copy .env.example to .env and fill in your CDP keys.')
  process.exit(1)
}

const { CDP_API_KEY_ID, CDP_API_KEY_SECRET } = process.env
if (!CDP_API_KEY_ID || !CDP_API_KEY_SECRET) {
  console.error('CDP_API_KEY_ID and CDP_API_KEY_SECRET must be set in .env')
  process.exit(1)
}

const state = JSON.parse(readFileSync(new URL('./spike-state.json', import.meta.url), 'utf8'))
const address = state.smartAccountAddress
if (!address) {
  console.error('No smartAccountAddress in spike-state.json — run `npm run derive` first.')
  process.exit(1)
}

let clientIp = process.env.CLIENT_IP
if (!clientIp) {
  try {
    clientIp = (await (await fetch('https://api.ipify.org')).text()).trim()
  } catch {
    /* Coinbase treats clientIp as optional-ish; continue without it */
  }
}

const requestHost = 'api.developer.coinbase.com'
const requestPath = '/onramp/v1/token'

const jwt = await generateJwt({
  apiKeyId: CDP_API_KEY_ID,
  apiKeySecret: CDP_API_KEY_SECRET,
  requestMethod: 'POST',
  requestHost,
  requestPath,
  expiresIn: 120,
})

const body = {
  addresses: [{ address, blockchains: ['base'] }],
  assets: ['USDC'],
  ...(clientIp ? { clientIp } : {}),
}

const res = await fetch(`https://${requestHost}${requestPath}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const text = await res.text()
if (!res.ok) {
  console.error(`Session-token request failed (${res.status}):\n${text}`)
  process.exit(1)
}

const json = JSON.parse(text)
const token = json.token || json.data?.token || json.session_token
if (!token) {
  console.error('Could not find session token in response:\n', text)
  process.exit(1)
}

const params = new URLSearchParams({
  sessionToken: token,
  defaultAsset: 'USDC',
  defaultNetwork: 'base',
  defaultPaymentMethod: 'CARD',
  presetFiatAmount: '5',
  fiatCurrency: 'USD',
})
const url = `https://pay.coinbase.com/buy/select-asset?${params.toString()}`

console.log('\n=== Coinbase Onramp URL (buys ~$5 USDC on Base into the spike address) ===\n')
console.log('Destination smart account:', address)
console.log('\n' + url + '\n')
console.log('Open it in a browser, finish KYC + the purchase, then run `npm run watch`')
console.log('to confirm the USDC actually lands at the counterfactual address.')
console.log('\n(Session tokens are single-use and expire quickly — re-run `npm run url` if it stales.)')
