//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {IAssuranceCondition} from "./IAssuranceCondition.sol";
import {IdentityHeldProceeds, NotPayoutAddress} from "./IdentityHeldProceeds.sol";

error InvalidTransitAddress();
error InvalidDestination();
error TicketAlreadyRedeemed();
error RedemptionExpired();
error RedemptionClosed();
error InvalidTransitSignature();
error InvalidDestinationSignature();
error RedemptionConditionAlreadySet();

/**
 * @notice A project whose recipient authority starts as a one-time transit key.
 *         Redemption binds a destination. It does not move funds or accept work.
 */
contract ClaimTicketAssuranceContract is IdentityHeldProceeds, EIP712 {
    bytes32 public constant REDEEM_TYPEHASH = keccak256(
        "RedeemClaimTicket(address destination,uint256 deadline,uint256 nonce)"
    );
    uint256 public constant REDEEM_NONCE = 0;

    address public immutable transitAddress;
    address public destination;
    bool public redeemed;
    IAssuranceCondition public redemptionCondition;

    event TicketRedeemed(address indexed destination, uint256 deadline);

    constructor(
        address owner,
        address transitAddress_,
        address paymentToken,
        address erc1155Addr,
        string memory projectMetadataCid,
        uint256 unclaimedWindow
    ) IdentityHeldProceeds(
        owner, paymentToken, erc1155Addr, projectMetadataCid, address(0), bytes32(0), address(0), unclaimedWindow, true
    ) EIP712("ClaimTicket", "1") {
        if (transitAddress_ == address(0)) revert InvalidTransitAddress();
        transitAddress = transitAddress_;
    }

    /// @notice Zero until redemption, then the bound account. Not the transit address.
    function workAuthority() external view returns (address) {
        return redeemed ? destination : address(0);
    }

    function recipient() external view returns (address) {
        return redeemed ? destination : address(0);
    }

    /// @notice The factory binds the work condition before transferring ownership.
    function bindRedemptionCondition(IAssuranceCondition condition) external onlyOwner {
        if (address(redemptionCondition) != address(0)) revert RedemptionConditionAlreadySet();
        if (address(condition) == address(0)) revert RedemptionClosed();
        redemptionCondition = condition;
    }

    function redeem(
        address destination_,
        bytes calldata transitSignature,
        bytes calldata destinationSignature,
        uint256 deadline
    ) external nonReentrant {
        if (redeemed) revert TicketAlreadyRedeemed();
        if (destination_ == address(0) || destination_ == transitAddress || destination_ == address(this)) {
            revert InvalidDestination();
        }
        if (block.timestamp > deadline) revert RedemptionExpired();
        if (acceptanceClosed || redemptionCondition.hasFailed()) revert RedemptionClosed();
        if (succeededAt != 0 && block.timestamp >= succeededAt + unclaimedProceedsWindow) revert RedemptionClosed();

        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
            REDEEM_TYPEHASH, destination_, deadline, REDEEM_NONCE
        )));
        if (ECDSA.recover(digest, transitSignature) != transitAddress) revert InvalidTransitSignature();

        redeemed = true;
        destination = destination_;
        emit TicketRedeemed(destination_, deadline);

        if (!SignatureChecker.isValidSignatureNow(destination_, digest, destinationSignature)) {
            revert InvalidDestinationSignature();
        }
    }

    function _authorizedPayout() internal view override returns (address payout) {
        if (!redeemed) revert NotPayoutAddress();
        payout = destination;
    }
}
