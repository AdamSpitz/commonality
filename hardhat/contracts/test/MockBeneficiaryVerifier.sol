//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IBeneficiaryVerifier} from "../content-funding/BeneficiaryRegistry.sol";

/**
 * @title MockBeneficiaryVerifier
 * @notice Test-only mock channel verifier that returns a configurable result
 */
contract MockBeneficiaryVerifier is IBeneficiaryVerifier {
    bool private _isValid;

    /**
     * @notice Set whether verifyClaimProof should return true or false
     * @param valid The value to return from verifyClaimProof
     */
    function setValid(bool valid) external {
        _isValid = valid;
    }

    /// @inheritdoc IBeneficiaryVerifier
    function verifyClaimProof(
        bytes32,
        address,
        bytes32,
        uint256,
        bytes32,
        bytes calldata
    ) external view override returns (bool) {
        return _isValid;
    }
}
