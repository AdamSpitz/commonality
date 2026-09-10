//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MultiERC1155AssuranceContract} from "./AssuranceContracts.sol";

interface IProjectBeneficiaryEscrow {
  function deposit(bytes32 beneficiaryId, uint256 amount) external;
}

error RecipientNotBeneficiaryEscrow();

/**
 * @notice A LazyGiving assurance contract whose successful proceeds can be
 *         deposited into the shared beneficiary escrow.
 */
contract BeneficiaryAssuranceContract is MultiERC1155AssuranceContract {
  using SafeERC20 for IERC20;

  bytes32 public immutable beneficiaryId;
  bool public immutable recipientIsEscrow;

  constructor(
    address owner,
    address payoutRecipient,
    address paymentToken,
    address erc1155Addr,
    string memory projectMetadataCid,
    bytes32 _beneficiaryId,
    bool _recipientIsEscrow
  ) MultiERC1155AssuranceContract(owner, payoutRecipient, paymentToken, erc1155Addr, projectMetadataCid) {
    beneficiaryId = _beneficiaryId;
    recipientIsEscrow = _recipientIsEscrow;
  }

  function recipient() external view returns (address) {
    return _recipient;
  }

  function withdrawToBeneficiaryEscrow() external {
    if (!recipientIsEscrow) revert RecipientNotBeneficiaryEscrow();
    requireAssuranceContractHasSucceeded();
    uint256 value = IERC20(paymentToken).balanceOf(address(this));
    emit AssuranceContractWithdrawal(_recipient, value);
    IERC20(paymentToken).forceApprove(_recipient, value);
    IProjectBeneficiaryEscrow(_recipient).deposit(beneficiaryId, value);
    IERC20(paymentToken).forceApprove(_recipient, 0);
  }
}
