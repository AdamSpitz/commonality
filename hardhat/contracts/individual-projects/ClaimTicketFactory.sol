//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {ClaimTicketAssuranceContract} from "./ClaimTicketAssuranceContract.sol";

/// @notice Deploys ticket assurance contracts. Kept separate so neither
///         ProjectFactory nor FixedControllerFactory has to carry the bytecode.
interface IPaymentTokenRegistry {
    function isAllowed(address token) external view returns (bool);
}

error PaymentTokenNotAllowed(address token);

contract ClaimTicketFactory {
    uint256 public constant UNCLAIMED_PROCEEDS_WINDOW = 90 days;
    mapping(address => bool) public isDeployedPrimaryMarket;
    IPaymentTokenRegistry public immutable paymentTokenRegistry;

    error InvalidTransitAddress();
    error InvalidRegistry();

    event ClaimTicketAssuranceCreated(address indexed assuranceContract, address indexed transitAddress);

    /// @dev A zero registry skips the allowlist. Production deploys always pass the registry.
    constructor(address tokenRegistry) {
        paymentTokenRegistry = IPaymentTokenRegistry(tokenRegistry);
    }

    function create(
        address owner,
        address transitAddress,
        address paymentToken,
        address erc1155Addr,
        string memory projectMetadataCid
    ) external returns (ClaimTicketAssuranceContract ac) {
        if (transitAddress == address(0)) revert InvalidTransitAddress();
        if (address(paymentTokenRegistry) != address(0) && !paymentTokenRegistry.isAllowed(paymentToken)) {
            revert PaymentTokenNotAllowed(paymentToken);
        }
        ac = new ClaimTicketAssuranceContract(
            owner, transitAddress, paymentToken, erc1155Addr, projectMetadataCid, UNCLAIMED_PROCEEDS_WINDOW
        );
        isDeployedPrimaryMarket[address(ac)] = true;
        emit ClaimTicketAssuranceCreated(address(ac), transitAddress);
    }
}
