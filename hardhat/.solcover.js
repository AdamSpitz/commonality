// Config for solidity-coverage (`npx hardhat coverage`, aka `npm run coverage`).
// Coverage on the contracts is a *report*, not a gate — see
// specs/decisions/0002-code-quality-metrics.md for the rationale.
module.exports = {
  // Mocks and test-only helpers under contracts/test/ are exercised only
  // incidentally. Excluding them keeps the report focused on the contracts that
  // actually ship to mainnet, so an unexercised branch there is a real signal.
  skipFiles: ['test'],
};
