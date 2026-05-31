// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MaliciousERC1155Receiver
 * @notice Used in reentrancy tests: on receiving ERC1155 tokens, tries to call
 *         back into a target contract to test reentrancy guards.
 * @dev Used only in test files, deployed from JS tests.
 */
contract MaliciousERC1155Receiver is ERC165, IERC1155Receiver {
    /// If non-zero, this address is called during onERC1155Received/BatchReceived
    address public attackTarget;
    /// Calldata to send to attackTarget
    bytes public attackCalldata;
    /// Whether to attempt reentrancy
    bool public shouldAttack;
    /// Whether the receiver callback attempted the configured reentrant call
    bool public attackAttempted;
    /// Whether the most recent configured reentrant call succeeded
    bool public attackSucceeded;

    function configureAttack(address target, bytes calldata data) external {
        attackTarget = target;
        attackCalldata = data;
        attackAttempted = false;
        attackSucceeded = false;
        shouldAttack = true;
    }

    function disableAttack() external {
        shouldAttack = false;
    }

    function approveERC20For(address token, address spender, uint256 amount) external {
        IERC20(token).approve(spender, amount);
    }

    function _tryAttack() internal {
        if (shouldAttack && attackTarget != address(0)) {
            attackAttempted = true;
            // solhint-disable-next-line avoid-low-level-calls
            (bool success, ) = attackTarget.call(attackCalldata);
            attackSucceeded = success;
        }
    }

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external override returns (bytes4) {
        _tryAttack();
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external override returns (bytes4) {
        _tryAttack();
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC165, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IERC1155Receiver).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @notice Allow the contract to hold and approve ERC1155 tokens for refund tests
     */
    function approveERC1155For(address token, address spender) external {
        IERC1155(token).setApprovalForAll(spender, true);
    }
}

// Minimal IERC1155 interface for approval
interface IERC1155 {
    function setApprovalForAll(address operator, bool approved) external;
}
