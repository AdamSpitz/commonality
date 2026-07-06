// Turns the raw error thrown by a wallet / on-chain call into a short, calm
// sentence a normal contributor can act on. Wallet and RPC errors are often
// multi-line JSON-ish dumps ("MetaMask Tx Signature: User denied transaction
// signature. {code: 4001, ...}") that are alarming and useless in a UI Alert.
//
// This only rewrites the handful of failures a contributor actually hits and
// can do something about (they cancelled, or they're out of gas). Anything
// unrecognized falls through to `fallback` so we never hide a real revert
// reason behind a vague message.

function errorText(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (err && typeof err === 'object') {
    const maybe = err as { message?: unknown; shortMessage?: unknown }
    if (typeof maybe.shortMessage === 'string') return maybe.shortMessage
    if (typeof maybe.message === 'string') return maybe.message
  }
  return ''
}

export function humanizeTxError(err: unknown, fallback: string): string {
  const text = errorText(err)
  const lower = text.toLowerCase()

  // User cancelled the signature in their wallet. viem/EIP-1193 uses code 4001.
  if (
    lower.includes('user rejected') ||
    lower.includes('user denied') ||
    lower.includes('user cancel') ||
    lower.includes('rejected the request') ||
    lower.includes('action_rejected') ||
    lower.includes('code: 4001') ||
    lower.includes('code 4001')
  ) {
    return 'You cancelled the transaction in your wallet. Nothing was sent — you can try again when you’re ready.'
  }

  // Not enough ETH to pay the network fee (only relevant when gas is not sponsored).
  if (
    lower.includes('insufficient funds') ||
    lower.includes('gas required exceeds') ||
    lower.includes('insufficient balance for gas')
  ) {
    return 'Your wallet doesn’t have enough ETH to cover the network fee for this transaction. Add a little ETH and try again.'
  }

  return text || fallback
}
