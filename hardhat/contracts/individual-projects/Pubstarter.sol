//SPDX-License-Identifier: MIT
// solhint-disable one-contract-per-file
pragma solidity 0.8.33;

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {FreeERC1155} from "../utils/FreeERC1155.sol";
import {PremintingERC1155} from "../utils/PremintingERC1155.sol";
import {MultiERC1155AssuranceContract} from "./AssuranceContracts.sol";
import {ERC1155SecondaryMarket} from "../marketplace/ERC1155SecondaryMarket.sol";

error InvalidOwnerAddress();
error InvalidRecipientAddress();

/**
 * @title FreeERC1155Factory
 * @notice Factory contract for creating FreeERC1155 token contracts
 */
contract FreeERC1155Factory {
  /**
   * @notice Emitted when a new FreeERC1155 contract is created
   * @param erc1155 The address of the created FreeERC1155 contract
   */
  event FreeERC1155ContractCreated(address indexed erc1155);

  /**
   * @notice Creates a new FreeERC1155 token contract
   * @param metadataURI The base URI for token metadata
   * @param contractURI The contract metadata URI
   * @return The address of the created FreeERC1155 contract
   */
  function createFreeERC1155(string memory metadataURI, string memory contractURI) public returns (FreeERC1155) {
    FreeERC1155 t = new FreeERC1155(metadataURI, contractURI);
    emit FreeERC1155ContractCreated(address(t));
    return t;
  }
}

/**
 * @title PremintingERC1155Factory
 * @notice Factory contract for creating PremintingERC1155 token contracts
 */
contract PremintingERC1155Factory {
  /**
   * @notice Emitted when a new PremintingERC1155 contract is created
   * @param erc1155 The address of the created PremintingERC1155 contract
   */
  event PubstarterERC1155ContractCreated(address indexed erc1155);

  /**
   * @notice Creates a new PremintingERC1155 token contract
   * @param owner The address that will own the created contract
   * @param metadataURI The base URI for token metadata
   * @param contractURI The contract metadata URI
   * @return The address of the created PremintingERC1155 contract
   */
  function createPremintingERC1155(
    address owner,
    string memory metadataURI,
    string memory contractURI
  ) public returns (PremintingERC1155) {
    PremintingERC1155 t = new PremintingERC1155(owner, metadataURI, contractURI);
    emit PubstarterERC1155ContractCreated(address(t));
    return t;
  }
}

/**
 * @title MarketplaceFactory
 * @notice Factory contract for creating ERC1155SecondaryMarket contracts
 */
contract MarketplaceFactory {
  /**
   * @notice Emitted when a new ERC1155SecondaryMarket contract is created
   * @param marketplace The address of the created ERC1155SecondaryMarket contract
   */
  event PubstarterERC1155SecondaryMarketCreated(address indexed marketplace);

  /**
   * @notice Creates a new ERC1155SecondaryMarket contract
   * @param erc1155Addr The address of the ERC1155 token contract to create a marketplace for
   * @return The address of the created ERC1155SecondaryMarket contract
   */
  function createMarketplace(address erc1155Addr) public returns (ERC1155SecondaryMarket) {
    ERC1155SecondaryMarket m = new ERC1155SecondaryMarket(erc1155Addr);
    emit PubstarterERC1155SecondaryMarketCreated(address(m));
    return m;
  }
}

/**
 * @title AssuranceContractFactory
 * @notice Factory contract for creating MultiERC1155AssuranceContract contracts
 */
contract AssuranceContractFactory {
   /**
    * @notice Emitted when a new MultiERC1155AssuranceContract is created
   * @param assuranceContract The address of the created assurance contract
   */
  event PubstarterAssuranceContractCreated(address indexed assuranceContract);

   /**
    * @notice Creates a new MultiERC1155AssuranceContract
   * @param owner The address that will own the assurance contract
   * @param recipient The address that will receive funds if project succeeds
   * @param threshold The funding threshold for project success
   * @param deadline The deadline after which project can fail if threshold not reached
   * @param projectMetadataCid The IPFS CID containing project metadata
   * @return The address of the created assurance contract
   */
  function createAssuranceContract(
    address owner,
    address recipient,
    uint256 threshold,
    uint256 deadline,
    string memory projectMetadataCid
  ) public returns (MultiERC1155AssuranceContract) {
    MultiERC1155AssuranceContract ac = new MultiERC1155AssuranceContract(
      owner,
      recipient,
      threshold,
      deadline,
      projectMetadataCid
    );
    emit PubstarterAssuranceContractCreated(address(ac));
    return ac;
  }
}

/**
 * @title Pubstarter
 * @notice Main entry point with factory contracts for creating all project components
 * @dev Workflow: Creates token, marketplace, and assurance contract; sets prices;
 *      transfers ownership; mints tokens to assurance contract; renounces token ownership.
 */
contract Pubstarter {
  PremintingERC1155Factory public immutable _premintingERC1155Factory;
  MarketplaceFactory public immutable _marketplaceFactory;
  AssuranceContractFactory public immutable _assuranceFactory;

  /**
   * @notice Initializes the Pubstarter contract with factory addresses
   * @param erc1155Factory The address of the PremintingERC1155Factory
   * @param marketplaceFactory The address of the MarketplaceFactory
   * @param assuranceFactory The address of the AssuranceContractFactory
   */
  constructor(address erc1155Factory, address marketplaceFactory, address assuranceFactory) {
    _premintingERC1155Factory = PremintingERC1155Factory(erc1155Factory);
    _marketplaceFactory = MarketplaceFactory(marketplaceFactory);
    _assuranceFactory = AssuranceContractFactory(assuranceFactory);
  }

  /**
   * @notice Creates a complete project setup with token, marketplace, and assurance contract
   * @dev Creates token, marketplace, and assurance contract; sets prices;
   *      transfers ownership; mints tokens to assurance contract; renounces token ownership.
   * @param metadataURI The base URI for token metadata
   * @param contractURI The contract metadata URI
   * @param owner The address that will own the assurance contract
   * @param recipient The address that will receive funds if project succeeds
   * @param threshold The funding threshold for project success
   * @param deadline The deadline after which project can fail if threshold not reached
   * @param projectMetadataCid The IPFS CID containing project metadata
   * @param ids Array of token IDs to mint
   * @param counts Array of token amounts to mint
   * @param prices Array of token prices corresponding to each ID
   * @return t The created ERC1155 token contract
   * @return m The created marketplace contract
   * @return ac The created assurance contract
   */
  function createERC1155AndMarketplaceAndAssuranceContract(
    string memory metadataURI,
    string memory contractURI,
    address owner,
    address recipient,
    uint256 threshold,
    uint256 deadline,
    string memory projectMetadataCid,
    uint256[] memory ids,
    uint256[] memory counts,
    uint256[] memory prices
  ) public returns (IERC1155, ERC1155SecondaryMarket, AssuranceContract) {
    if (owner == address(0)) revert InvalidOwnerAddress();
    if (recipient == address(0)) revert InvalidRecipientAddress();

    PremintingERC1155 t = _premintingERC1155Factory.createPremintingERC1155(address(this), metadataURI, contractURI);

    ERC1155SecondaryMarket m = _marketplaceFactory.createMarketplace(address(t));

    MultiERC1155_AssuranceContract ac = _assuranceFactory.createAssuranceContract(
      address(this),
      recipient,
      threshold,
      deadline,
      projectMetadataCid
    );

    ac.setPricesERC1155(address(t), ids, prices);
    ac.transferOwnership(owner);

    t.mintBatch(address(ac), ids, counts);
    t.renounceOwnership();

    return (t, m, ac);
  }
}
