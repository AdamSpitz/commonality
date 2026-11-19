//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IBeneficiaryRegistry} from "./BeneficiaryRegistry.sol";

error InvalidRegistryAddress();
error InvalidPaymentTokenAddress();
error MustSendTokens();
error BeneficiaryNotVerified();
error OnlyBeneficiaryPayoutAddress();
error NoBalance();
error ClaimWaitingPeriodNotElapsed(uint256 withdrawableAt);

/**
 * @title IBeneficiaryEscrow
 * @notice Interface for beneficiary escrow
 */
interface IBeneficiaryEscrow {
    function deposit(bytes32 beneficiaryId, address token, uint256 amount) external;
    function withdraw(bytes32 beneficiaryId, address token) external;
    function balance(bytes32 beneficiaryId, address token) external view returns (uint256);
}

/**
 * @title BeneficiaryEscrow
 * @notice Holds settlement tokens until a beneficiary binds a payout address and withdraws
 * @dev Funds are keyed by beneficiary ID. Only the registry's payout address can withdraw.
 *      Used for public identities that are unclaimed when funds are sent, so their
 *      controller can claim them later after verification.
 *
 *      Token assumptions: each deposited token must be a standard ERC-20 with:
 *      - No transfer fees or callbacks
 *      - No rebasing behavior
 *      - Standard transfer/transferFrom/approve interface
 *
 *      Balances are keyed by (beneficiaryId, token). One channel may hold several tokens.
 *
 *      This contract uses SafeERC20 for all token transfers to handle non-standard
 *      tokens that may not return boolean success values.
 */
contract BeneficiaryEscrow is IBeneficiaryEscrow {
    using SafeERC20 for IERC20;

    mapping(bytes32 beneficiaryId => mapping(address token => uint256 amount)) private _balances;

    /// @notice The registry used to resolve the beneficiary payout address
    address public beneficiaryRegistry;

    /**
     * @notice Emitted when settlement tokens are deposited for a beneficiary
     * @param beneficiaryId The beneficiary the deposit is for
     * @param from The address that deposited the tokens
     * @param amount The amount deposited
     */
    event DepositedV2(bytes32 indexed beneficiaryId, address indexed token, address indexed from, uint256 amount);

    /**
     * @notice Emitted when the beneficiary payout address withdraws escrowed funds
     * @param beneficiaryId The beneficiary the withdrawal is from
     * @param token The ERC-20 withdrawn
     * @param to The payout address that received the tokens
     * @param amount The amount withdrawn
     */
    event WithdrawnV2(bytes32 indexed beneficiaryId, address indexed token, address indexed to, uint256 amount);

    /**
     * @notice Initializes the escrow with a beneficiary registry
     * @param _beneficiaryRegistry The address of the BeneficiaryRegistry contract
     */
    constructor(address _beneficiaryRegistry) {
        if (_beneficiaryRegistry == address(0)) revert InvalidRegistryAddress();
        beneficiaryRegistry = _beneficiaryRegistry;
    }

    /**
     * @notice Deposit settlement tokens into escrow for a beneficiary
     * @param beneficiaryId The beneficiary to deposit funds for
     * @param token The ERC-20 to deposit
     * @param amount The amount of tokens to deposit
     */
    function deposit(bytes32 beneficiaryId, address token, uint256 amount) external {
        if (token == address(0)) revert InvalidPaymentTokenAddress();
        if (amount == 0) revert MustSendTokens();
        _balances[beneficiaryId][token] += amount;
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit DepositedV2(beneficiaryId, token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all escrowed tokens of one currency for a beneficiary
     * @param beneficiaryId The beneficiary to withdraw funds for
     * @param token The ERC-20 to withdraw
     */
    function withdraw(bytes32 beneficiaryId, address token) external {
        if (!IBeneficiaryRegistry(beneficiaryRegistry).isVerified(beneficiaryId)) {
            revert BeneficiaryNotVerified();
        }
        if (msg.sender != IBeneficiaryRegistry(beneficiaryRegistry).payoutAddress(beneficiaryId)) {
            revert OnlyBeneficiaryPayoutAddress();
        }
        uint256 withdrawableAt = IBeneficiaryRegistry(beneficiaryRegistry).claimWithdrawableAt(beneficiaryId);
        if (block.timestamp < withdrawableAt) {
            revert ClaimWaitingPeriodNotElapsed(withdrawableAt);
        }

        uint256 amount = _balances[beneficiaryId][token];
        if (amount == 0) revert NoBalance();

        delete _balances[beneficiaryId][token];
        emit WithdrawnV2(beneficiaryId, token, msg.sender, amount);

        IERC20(token).safeTransfer(msg.sender, amount);
    }

    /**
     * @notice Returns the escrowed balance of one token for a beneficiary
     */
    function balance(bytes32 beneficiaryId, address token) external view returns (uint256) {
        return _balances[beneficiaryId][token];
    }
}
