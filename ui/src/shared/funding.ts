// Funding-only shared entry. Conceptspace and Tally must not import this file.
// The main `shared` barrel stays free of payment-token formatting and project
// fold caches so a non-financial page does not load them. See
// specs/tech/conceptspace-repo-split-analysis.md.

export {
  DEFAULT_PAYMENT_CURRENCY,
  formatCurrencyAmount,
  formatCurrencyAmountWithLocalEstimate,
  formatCurrencyProgress,
  formatCurrencyRaised,
  formatCurrencyTotals,
  getConfiguredPaymentCurrency,
  getCurrencyForNote,
} from './currency/currency'
export { usePaymentTokenCurrency } from './currency/usePaymentTokenCurrency'

export { loadProjectWithCache, projectFoldCacheOptions, useCachedProject } from './hooks/useCachedProject'
export { useCachedProjects } from './hooks/useCachedProjects'
