export const isPrivySmartWalletEnabled =
  import.meta.env.VITE_E2E !== 'true' &&
  (import.meta.env.VITE_PRIVY_SMART_WALLET_BUNDLER_URL?.trim().length ?? 0) > 0
