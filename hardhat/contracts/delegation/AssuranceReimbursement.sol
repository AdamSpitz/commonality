// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/// @notice Optional assurance-specific capability, separate from buying receipts.
interface IAssuranceReimbursement {
    function totalEarlyContributions() external view returns (uint256);
    function totalRetroReceived() external view returns (uint256);
    function withdrawReimbursementTo(address to, uint256 amount) external;
}

/// @notice Adapter for the existing assurance pool's cumulative pro-rata model.
/// Notes own the per-chain basis and withdrawn amount; this adapter owns the
/// interpretation of assurance pool totals. It is not a generic reimbursement
/// formula for arbitrary markets. It preserves the existing ABI and rounding.
library AssuranceReimbursement {
    function earned(address market, uint256 contribution) internal view returns (uint256) {
        IAssuranceReimbursement pool = IAssuranceReimbursement(market);
        uint256 totalBasis = pool.totalEarlyContributions();
        return totalBasis == 0 ? 0 : contribution * pool.totalRetroReceived() / totalBasis;
    }

    function withdraw(address market, address recipient, uint256 amount) internal {
        IAssuranceReimbursement(market).withdrawReimbursementTo(recipient, amount);
    }
}
