//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/**
 * @title AssuranceContract
 * @notice Abstract assurance contract that allows people to donate to a project by buying tokens
 * @dev If the funding goal is not reached before the deadline, contributors can get a refund.
 *      This is an abstract contract that must be implemented by a concrete contract.
 * @author AdamSpitz
 */
abstract contract AssuranceContract {
    /**
     * @notice Emitted when the assurance contract is initialized
     * @param recipient The address that will receive funds if the project succeeds
     * @param threshold The funding threshold that must be reached for success
     * @param deadline The timestamp after which the project can fail if threshold not reached
     */
    event AssuranceContractInitialized(
        address indexed recipient,
        uint256 threshold,
        uint256 deadline
    );

    /**
     * @notice Emitted when the recipient withdraws funds from a successful project
     * @param recipient The address that received the funds
     * @param value The amount of ETH withdrawn
     */
    event AssuranceContractWithdrawal(address indexed recipient, uint256 value);

    address internal immutable _recipient;

    uint256 internal immutable _threshold;
    uint256 internal immutable _deadline;

    /**
     * @notice Initializes the assurance contract with funding parameters
     * @param recipient The address that will receive funds if the project succeeds
     * @param threshold The funding threshold that must be reached for success
     * @param deadline The timestamp after which the project can fail if threshold not reached
     */
    constructor(address recipient, uint256 threshold, uint256 deadline) {
        _recipient = recipient;
        _threshold = threshold;
        _deadline = deadline;
        emit AssuranceContractInitialized(recipient, threshold, deadline);
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
        require(msg.sender == _recipient, "Only recipient can withdraw");
        requireAssuranceContractHasSucceeded();
        uint256 value = address(this).balance;
        payable(_recipient).transfer(value);
        emit AssuranceContractWithdrawal(_recipient, value);
    }

    /**
     * @notice Reverts if the assurance contract has not succeeded
     * @dev The project succeeds when the total received value meets or exceeds the threshold
     */
    function requireAssuranceContractHasSucceeded() internal view {
        require(
            getAssuranceContractProgress() >= _threshold,
            "Not enough funding received"
        );
    }

    /**
     * @notice Reverts if the assurance contract has not failed
     * @dev The project fails when the deadline has passed and the threshold was not reached
     */
    function requireAssuranceContractHasFailed() internal view {
        require(
            getAssuranceContractProgress() < _threshold,
            "Project reached funding goal"
        );
        require(block.timestamp >= _deadline, "Project fate still undecided");
    }
}
