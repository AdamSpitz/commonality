//SPDX-License-Identifier: MIT
// solhint-disable one-contract-per-file
pragma solidity 0.8.33;

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {PremintingERC1155} from "../utils/PremintingERC1155.sol";
import {AssuranceContract} from "./AssuranceContract.sol";
import {MultiERC1155AssuranceContract} from "./AssuranceContracts.sol";
import {ERC1155SecondaryMarket} from "../marketplace/ERC1155SecondaryMarket.sol";
import {IAssuranceCondition} from "./IAssuranceCondition.sol";
import {ValueThresholdCondition} from "./ValueThresholdCondition.sol";

error InvalidOwnerAddress();
error InvalidRecipientAddress();
error InvalidFactoryAddress();
error InvalidThreshold();
error InvalidDeadline();
error EmptyTokenList();
error TokenArrayLengthMismatch();
error ZeroPrice();

/**
 * @title PremintingERC1155Factory
 * @notice Factory contract for creating PremintingERC1155 token contracts
 */
contract PremintingERC1155Factory {
  /**
   * @notice Emitted when a new PremintingERC1155 contract is created
   */
  event LazyGivingERC1155ContractCreated(address indexed erc1155);

  function createPremintingERC1155(
    address owner,
    string memory metadataURI,
    string memory contractURI
  ) public returns (PremintingERC1155) {
    PremintingERC1155 t = new PremintingERC1155(owner, metadataURI, contractURI);
    emit LazyGivingERC1155ContractCreated(address(t));
    return t;
  }
}

/**
 * @title MarketplaceFactory
 * @notice Factory contract for creating ERC1155SecondaryMarket contracts
 */
contract MarketplaceFactory {
  mapping(address => bool) public isDeployedMarket;

  event LazyGivingERC1155SecondaryMarketCreated(address indexed marketplace);

  function createMarketplace(address erc1155Addr, address paymentToken) public returns (ERC1155SecondaryMarket) {
    ERC1155SecondaryMarket m = new ERC1155SecondaryMarket(erc1155Addr, paymentToken);
    isDeployedMarket[address(m)] = true;
    emit LazyGivingERC1155SecondaryMarketCreated(address(m));
    return m;
  }
}

/**
 * @title AssuranceContractFactory
 * @notice Factory contract for creating MultiERC1155AssuranceContract contracts
 */
contract AssuranceContractFactory {
  mapping(address => bool) public isDeployedAssurance;
  mapping(address => bool) public isDeployedPrimaryMarket;

  event LazyGivingAssuranceContractCreated(address indexed assuranceContract);

  function createAssuranceContract(
    address owner,
    address recipient,
    address paymentToken,
    address erc1155Addr,
    string memory projectMetadataCid
  ) public returns (MultiERC1155AssuranceContract) {
    MultiERC1155AssuranceContract ac = new MultiERC1155AssuranceContract(
      owner,
      recipient,
      paymentToken,
      erc1155Addr,
      projectMetadataCid
    );
    isDeployedAssurance[address(ac)] = true;
    isDeployedPrimaryMarket[address(ac)] = true;
    emit LazyGivingAssuranceContractCreated(address(ac));
    return ac;
  }
}

/**
 * @title ValueThresholdConditionFactory
 * @notice Factory contract for creating ValueThresholdCondition contracts
 */
contract ValueThresholdConditionFactory {
  mapping(address => bool) public isDeployedCondition;

  event ValueThresholdConditionCreated(address indexed condition);

  function createCondition(
    address progressSource,
    uint256 threshold,
    uint256 deadline
  ) public returns (ValueThresholdCondition) {
    ValueThresholdCondition c = new ValueThresholdCondition(progressSource, threshold, deadline);
    isDeployedCondition[address(c)] = true;
    emit ValueThresholdConditionCreated(address(c));
    return c;
  }
}

/**
 * @title ProjectFactory
 * @notice Main entry point for creating a complete project (token, secondary
 *         marketplace, assurance contract, and assurance condition).
 *
 * @dev Trust note: whoever deploys ProjectFactory chooses the four factory addresses;
 *      users must trust the deployer that those factories are the real ones.
 *
 *      Token assumption: `paymentToken` must be a standard ERC-20 (no transfer
 *      fees, no rebasing, no callbacks). ProjectFactory does not enforce this;
 *      the project deployer must provide a compatible token.
 *
 *      Workflow: Creates token, marketplace, and assurance contract; deploys
 *      condition; sets condition and prices; transfers AC ownership; mints
 *      tokens; renounces token ownership.
 */
contract ProjectFactory {
  PremintingERC1155Factory public immutable _premintingERC1155Factory;
  MarketplaceFactory public immutable _marketplaceFactory;
  AssuranceContractFactory public immutable _assuranceFactory;
  ValueThresholdConditionFactory public immutable _conditionFactory;

  /**
   * @notice Emitted once per createERC1155...() call, tying together the four
   *         contracts that make up a single project.
   */
  event ProjectCreated(
    address indexed creator,
    address indexed token,
    address indexed assuranceContract,
    address marketplace,
    address condition
  );

  constructor(
    address erc1155Factory,
    address marketplaceFactory,
    address assuranceFactory,
    address conditionFactory
  ) {
    if (erc1155Factory == address(0)) revert InvalidFactoryAddress();
    if (marketplaceFactory == address(0)) revert InvalidFactoryAddress();
    if (assuranceFactory == address(0)) revert InvalidFactoryAddress();
    if (conditionFactory == address(0)) revert InvalidFactoryAddress();
    _premintingERC1155Factory = PremintingERC1155Factory(erc1155Factory);
    _marketplaceFactory = MarketplaceFactory(marketplaceFactory);
    _assuranceFactory = AssuranceContractFactory(assuranceFactory);
    _conditionFactory = ValueThresholdConditionFactory(conditionFactory);
  }

  struct CreateProjectParams {
    string metadataURI;
    string contractURI;
    address owner;
    address recipient;
    address paymentToken;
    string projectMetadataCid;
    uint256[] ids;
    uint256[] counts;
    uint256[] prices;
  }

  /**
   * @notice Creates a complete project setup with a ValueThreshold condition (the common case)
   */
  function createERC1155AndMarketplaceAndAssuranceContract(
    string memory metadataURI,
    string memory contractURI,
    address owner,
    address recipient,
    address paymentToken,
    uint256 threshold,
    uint256 deadline,
    string memory projectMetadataCid,
    uint256[] memory ids,
    uint256[] memory counts,
    uint256[] memory prices
  ) public returns (IERC1155, ERC1155SecondaryMarket, AssuranceContract) {
    if (threshold == 0) revert InvalidThreshold();
    // slither-disable-next-line timestamp
    if (deadline <= block.timestamp) revert InvalidDeadline();

    CreateProjectParams memory params = CreateProjectParams({
      metadataURI: metadataURI,
      contractURI: contractURI,
      owner: owner,
      recipient: recipient,
      paymentToken: paymentToken,
      projectMetadataCid: projectMetadataCid,
      ids: ids,
      counts: counts,
      prices: prices
    });

    (PremintingERC1155 t, ERC1155SecondaryMarket m, MultiERC1155AssuranceContract ac) =
      _deployTokenMarketplaceAndAC(params);

    ValueThresholdCondition condition = _conditionFactory.createCondition(
      address(ac),
      threshold,
      deadline
    );

    _wireUpAndFinalize(t, ac, IAssuranceCondition(address(condition)), params);

    emit ProjectCreated(msg.sender, address(t), address(ac), address(m), address(condition));

    return (t, m, ac);
  }

  /**
   * @notice Creates a project with a custom IAssuranceCondition (for non-threshold conditions)
   * @dev The condition must already be deployed and reference the assurance contract if needed.
   */
  function createERC1155AndMarketplaceAndAssuranceContractWithCondition(
    string memory metadataURI,
    string memory contractURI,
    address owner,
    address recipient,
    address paymentToken,
    IAssuranceCondition condition,
    string memory projectMetadataCid,
    uint256[] memory ids,
    uint256[] memory counts,
    uint256[] memory prices
  ) public returns (IERC1155, ERC1155SecondaryMarket, AssuranceContract) {
    CreateProjectParams memory params = CreateProjectParams({
      metadataURI: metadataURI,
      contractURI: contractURI,
      owner: owner,
      recipient: recipient,
      paymentToken: paymentToken,
      projectMetadataCid: projectMetadataCid,
      ids: ids,
      counts: counts,
      prices: prices
    });

    (PremintingERC1155 t, ERC1155SecondaryMarket m, MultiERC1155AssuranceContract ac) =
      _deployTokenMarketplaceAndAC(params);

    _wireUpAndFinalize(t, ac, condition, params);

    emit ProjectCreated(msg.sender, address(t), address(ac), address(m), address(condition));

    return (t, m, ac);
  }

  function _deployTokenMarketplaceAndAC(CreateProjectParams memory params)
    private
    returns (PremintingERC1155, ERC1155SecondaryMarket, MultiERC1155AssuranceContract)
  {
    if (params.owner == address(0)) revert InvalidOwnerAddress();
    if (params.recipient == address(0)) revert InvalidRecipientAddress();
    _validateTokenArrays(params.ids, params.counts, params.prices);

    PremintingERC1155 t = _premintingERC1155Factory.createPremintingERC1155(
      address(this),
      params.metadataURI,
      params.contractURI
    );

    ERC1155SecondaryMarket m = _marketplaceFactory.createMarketplace(address(t), params.paymentToken);

    MultiERC1155AssuranceContract ac = _assuranceFactory.createAssuranceContract(
      address(this),
      params.recipient,
      params.paymentToken,
      address(t),
      params.projectMetadataCid
    );

    return (t, m, ac);
  }

  function _wireUpAndFinalize(
    PremintingERC1155 t,
    MultiERC1155AssuranceContract ac,
    IAssuranceCondition condition,
    CreateProjectParams memory params
  ) private {
    ac.setCondition(condition);
    ac.setPricesERC1155(params.ids, params.prices);
    ac.transferOwnership(params.owner);

    t.mintBatch(address(ac), params.ids, params.counts);
    t.renounceOwnership();
  }

  function _validateTokenArrays(
    uint256[] memory ids,
    uint256[] memory counts,
    uint256[] memory prices
  ) private pure {
    if (ids.length == 0) revert EmptyTokenList();
    if (ids.length != counts.length || ids.length != prices.length) revert TokenArrayLengthMismatch();
    for (uint256 i = 0; i < prices.length; i++) {
      if (prices[i] == 0) revert ZeroPrice();
    }
  }
}
