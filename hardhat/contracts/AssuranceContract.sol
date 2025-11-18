//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

// Useful for debugging. Remove when deploying to a live network.
// import "hardhat/console.sol";

/**
 * Assurance contract that allows people to
 * donate to a project by buying tokens, and if the
 * funding goal is not reached before the deadline
 * then they can get a refund.
 *
 * @author AdamSpitz
 */
abstract contract AssuranceContract {
    event AssuranceContractInitialized(
        address recipient,
        uint256 threshold,
        uint256 deadline
    );
    event AssuranceContractWithdrawal(address indexed recipient, uint256 value);

    address internal immutable _recipient;

    uint256 internal immutable _threshold;
    uint256 internal immutable _deadline;

    constructor(address recipient, uint256 threshold, uint256 deadline) {
        _recipient = recipient;
        _threshold = threshold;
        _deadline = deadline;
        emit AssuranceContractInitialized(recipient, threshold, deadline);
    }

    function getAssuranceContractProgress()
        public
        view
        virtual
        returns (uint256);

    /**
     * If the project is successful, the value can be withdrawn.
     */
    function withdraw() external {
        requireAssuranceContractHasSucceeded();
        uint256 value = address(this).balance;
        payable(_recipient).transfer(value);
        emit AssuranceContractWithdrawal(_recipient, value);
    }

    /**
     * If the total received value has passed the threshold, the project
     * is considered successful.
     */
    function requireAssuranceContractHasSucceeded() internal view {
        require(
            getAssuranceContractProgress() >= _threshold,
            "Not enough funding received"
        );
    }

    /**
     * If the total received value has not passed the threshold and
     * the deadline has passed, the project is considered to have failed.
     */
    function requireAssuranceContractHasFailed() internal view {
        require(
            getAssuranceContractProgress() < _threshold,
            "Project reached funding goal"
        );
        require(block.timestamp >= _deadline, "Project fate still undecided");
    }
}
