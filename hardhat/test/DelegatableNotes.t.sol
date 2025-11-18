// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../contracts/DelegatableNotes.sol";
import "../contracts/PremintingERC20.sol";
import "../contracts/AssuranceContracts.sol";
import "../contracts/PremintingERC1155.sol";

// Simple test contract for DelegatableNotes
contract DelegatableNotesTest {
    DelegatableNotes public notes;
    PremintingERC20 public token;
    MultiERC1155_AssuranceContract public assuranceContract;
    PremintingERC1155 public erc1155;

    address alice = address(0x1);
    address bob = address(0x2);
    bytes32 constant statementId = bytes32(uint256(0x1234));

    event TestResult(string message, bool success);

    constructor() {
        notes = new DelegatableNotes();
        token = new PremintingERC20(address(this), "Test", "TST", "ipfs://contractURI");

        // Setup ERC1155 and assurance contract
        erc1155 = new PremintingERC1155(address(this), "ipfs://test", "ipfs://contract");
        assuranceContract = new MultiERC1155_AssuranceContract(
            address(this),
            address(this),
            1 ether,
            block.timestamp + 1 days,
            "ipfs://project"
        );

        uint256[] memory ids = new uint256[](1);
        ids[0] = 1;
        uint256[] memory prices = new uint256[](1);
        prices[0] = 0.1 ether;

        assuranceContract.setPricesERC1155(address(erc1155), ids, prices);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100;
        erc1155.mintBatch(address(assuranceContract), ids, amounts);
    }

    function testDepositETH() public payable returns (bool) {
        // Deposit ETH from this contract
        uint256 noteId = notes.depositETH{value: 0.5 ether}(statementId);

        (uint256 amount, address tokenAddr, address owner, , bool delegated, bytes32 storedStatementId) = notes.notes(noteId);

        bool success = amount == 0.5 ether &&
                      tokenAddr == address(0) &&
                      owner == address(this) &&
                      !delegated &&
                      storedStatementId == statementId;

        emit TestResult("testDepositETH", success);
        return success;
    }

    function testDepositERC20() public returns (bool) {
        uint256 depositAmount = 1000;

        token.mint(address(this), depositAmount);
        token.approve(address(notes), depositAmount);

        uint256 noteId = notes.deposit(address(token), depositAmount, statementId);

        (uint256 amount, address tokenAddr, address owner, , bool delegated, bytes32 storedStatementId) = notes.notes(noteId);

        bool success = amount == depositAmount &&
                      tokenAddr == address(token) &&
                      owner == address(this) &&
                      !delegated &&
                      storedStatementId == statementId;

        emit TestResult("testDepositERC20", success);
        return success;
    }

    function testDelegate() public payable returns (bool) {
        uint256 noteId = notes.depositETH{value: 1 ether}(statementId);

        (uint256 delegatedNoteId, ) = notes.delegate(noteId, bob, 1 ether);

        (, , , , bool delegated, ) = notes.notes(noteId);
        (, , address delegateOwner, uint256 parentId, , bytes32 delegateStatementId) = notes.notes(delegatedNoteId);

        bool success = delegated &&
                      delegateOwner == bob &&
                      parentId == noteId &&
                      delegateStatementId == statementId;

        emit TestResult("testDelegate", success);
        return success;
    }

    function testPartialDelegate() public payable returns (bool) {
        uint256 noteId = notes.depositETH{value: 1 ether}(statementId);

        (uint256 delegatedNoteId, uint256 remainderNoteId) = notes.delegate(noteId, bob, 0.6 ether);

        (uint256 delegatedAmount, , address delegateOwner, , , bytes32 delegateStatementId) = notes.notes(delegatedNoteId);
        (uint256 remainderAmount, , address remainderOwner, , , bytes32 remainderStatementId) = notes.notes(remainderNoteId);

        bool success = delegatedAmount == 0.6 ether &&
                      delegateOwner == bob &&
                      remainderAmount == 0.4 ether &&
                      remainderOwner == address(this) &&
                      delegateStatementId == statementId &&
                      remainderStatementId == statementId;

        emit TestResult("testPartialDelegate", success);
        return success;
    }

    function testReclaimFunds() public payable returns (bool) {
        uint256 balanceBefore = address(this).balance;

        uint256 noteId = notes.depositETH{value: 0.5 ether}(statementId);
        notes.reclaimFunds(noteId);

        uint256 balanceAfter = address(this).balance;

        bool success = balanceAfter == balanceBefore;

        emit TestResult("testReclaimFunds", success);
        return success;
    }

    function runAllTests() external payable {
        testDepositETH();
        testDepositERC20();
        testDelegate();
        testPartialDelegate();
        testReclaimFunds();
    }

    receive() external payable {}
}
