//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IAssuranceCondition} from "./IAssuranceCondition.sol";

/**
 * @title AssuranceContract
 * @notice Abstract assurance contract that allows people to donate to a project by buying tokens
 * @dev Uses a pluggable IAssuranceCondition to determine success/failure.
 *      The condition is set once after construction (to solve the chicken-and-egg problem
 *      where the condition may need to reference this contract's address).
 *      This is an abstract contract that must be implemented by a concrete contract.
 *
 *      Token assumptions: The paymentToken must be a standard ERC-20 token with:
 *      - No transfer fees or callbacks
 *      - No rebasing behavior
 *      - Standard transfer/transferFrom/approve interface
 *
 *      This contract uses SafeERC20 for all token transfers to handle non-standard
 *      tokens that may not return boolean success values.
 *
 * @author AdamSpitz
 */

abstract contract AssuranceContract {
    using SafeERC20 for IERC20;

    error OnlyRecipientCanWithdraw();
    error ConditionNotMet();
    error ConditionNotFailed();
    error ConditionHasFailed();
    error ConditionAlreadySet();
    error ConditionNotSet();
    error InvalidPaymentTokenAddress();

    /**
     * @notice Emitted when the assurance contract's condition is set
     * @param recipient The address that will receive funds if the project succeeds
     * @param condition The address of the IAssuranceCondition contract
     */
    event AssuranceContractInitialized(
        address indexed recipient,
        address indexed condition
    );

    /**
     * @notice Emitted when the recipient withdraws funds from a successful project
     * @param recipient The address that received the funds
     * @param value The amount of ETH withdrawn
     */
    event AssuranceContractWithdrawal(address indexed recipient, uint256 value);

    address internal immutable _recipient;
    address public immutable paymentToken;

    IAssuranceCondition internal _condition;
    bool private _conditionSet;

    /**
     * @notice Initializes the assurance contract with the recipient and settlement token
     * @param recipient The address that will receive funds if the project succeeds
     * @param _paymentToken The ERC-20 token used for settlement
     */
    constructor(address recipient, address _paymentToken) {
        if (_paymentToken == address(0)) revert InvalidPaymentTokenAddress();
        _recipient = recipient;
        paymentToken = _paymentToken;
    }

    /**
     * @notice Sets the condition contract (can only be called once)
     * @param condition The IAssuranceCondition contract that determines success/failure
     * @dev Must be access-controlled by the concrete contract (e.g. onlyOwner)
     */
    function _setCondition(IAssuranceCondition condition) internal {
        if (_conditionSet) revert ConditionAlreadySet();
        _condition = condition;
        _conditionSet = true;
        emit AssuranceContractInitialized(_recipient, address(condition));
    }

    /**
     * @notice Returns the current funding progress of the assurance contract
     * @return The total amount of value received so far
     * @dev Must be implemented by the concrete contract
     */
    function getAssuranceContractProgress()
        public
        view
        virtual
        returns (uint256);

    /**
     * @notice Withdraws all funds if the project has succeeded
     * @dev Only the recipient can call this function. Reverts if the project has not succeeded.
     */
    function withdraw() external {
        if (msg.sender != _recipient) revert OnlyRecipientCanWithdraw();
        requireAssuranceContractHasSucceeded();
        uint256 value = IERC20(paymentToken).balanceOf(address(this));
        emit AssuranceContractWithdrawal(_recipient, value);
        IERC20(paymentToken).safeTransfer(_recipient, value);
    }

    /**
     * @notice Reverts if the assurance contract has not succeeded
     */
    function requireAssuranceContractHasSucceeded() internal view {
        if (!_conditionSet) revert ConditionNotSet();
        if (!_condition.hasSucceeded()) revert ConditionNotMet();
    }

    /**
     * @notice Reverts if the assurance contract has not failed
     */
    function requireAssuranceContractHasFailed() internal view {
        if (!_conditionSet) revert ConditionNotSet();
        if (!_condition.hasFailed()) revert ConditionNotFailed();
    }

    /**
     * @notice Reverts if the assurance contract has already failed
     */
    function requireAssuranceContractHasNotFailed() internal view {
        if (_conditionSet && _condition.hasFailed()) revert ConditionHasFailed();
    }
}
