//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

// Useful for debugging. Remove when deploying to a live network.
import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "./FreeERC1155.sol";
import "./PremintingERC1155.sol";
import "./AssuranceContracts.sol";
import "./ERC1155Marketplace.sol";

contract FreeERC1155Factory {
  event FreeERC1155ContractCreated(address indexed erc1155);

  function createFreeERC1155(string memory metadataURI, string memory contractURI) public returns (FreeERC1155) {
    FreeERC1155 t = new FreeERC1155(metadataURI, contractURI);
    emit FreeERC1155ContractCreated(address(t));
    return t;
  }
}

contract PremintingERC1155Factory {
  event PubstarterERC1155ContractCreated(address indexed erc1155);

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

contract MarketplaceFactory {
  event PubstarterERC1155MarketplaceCreated(address indexed marketplace);

  function createMarketplace(address erc1155Addr) public returns (ERC1155Marketplace) {
    ERC1155Marketplace m = new ERC1155Marketplace(erc1155Addr);
    emit PubstarterERC1155MarketplaceCreated(address(m));
    return m;
  }
}

contract AssuranceContractFactory {
  event PubstarterAssuranceContractCreated(address indexed assuranceContract);

  function createAssuranceContract(
    address owner,
    address recipient,
    uint256 threshold,
    uint256 deadline,
    string memory projectMetadataCid
  ) public returns (MultiERC1155_AssuranceContract) {
    MultiERC1155_AssuranceContract ac = new MultiERC1155_AssuranceContract(
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

contract Pubstarter {
  PremintingERC1155Factory public immutable _premintingERC1155Factory;
  MarketplaceFactory public immutable _marketplaceFactory;
  AssuranceContractFactory public immutable _assuranceFactory;

  constructor(address erc1155Factory, address marketplaceFactory, address assuranceFactory) {
    _premintingERC1155Factory = PremintingERC1155Factory(erc1155Factory);
    _marketplaceFactory = MarketplaceFactory(marketplaceFactory);
    _assuranceFactory = AssuranceContractFactory(assuranceFactory);
  }

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
  ) public returns (IERC1155, ERC1155Marketplace, AssuranceContract) {
    PremintingERC1155 t = _premintingERC1155Factory.createPremintingERC1155(address(this), metadataURI, contractURI);

    ERC1155Marketplace m = _marketplaceFactory.createMarketplace(address(t));

    MultiERC1155_AssuranceContract ac = _assuranceFactory.createAssuranceContract(
      address(this),
      recipient,
      threshold,
      deadline,
      projectMetadataCid
    );

    //console.log("Created contracts: %s, %s, %s", address(t), address(m), address(ac));

    ac.setPricesERC1155(address(t), ids, prices);
    ac.transferOwnership(owner);

    t.mintBatch(address(ac), ids, counts);
    t.renounceOwnership();

    return (t, m, ac);
  }
}
