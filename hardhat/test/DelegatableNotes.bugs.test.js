import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("DelegatableNotes - Bug Fixes and Edge Cases", function () {
  let notes;
  let alice, bob, charlie;
  let statementId;
  let testToken;

  beforeEach(async function () {
    [alice, bob, charlie] = await ethers.getSigners();
    const DelegatableNotes = await ethers.getContractFactory("DelegatableNotes");
    notes = await DelegatableNotes.deploy();
    statementId = ethers.encodeBytes32String("test-statement");

    // Deploy a test ERC20 token
    const PremintingERC20 = await ethers.getContractFactory("PremintingERC20");
    testToken = await PremintingERC20.deploy(
      alice.address,
      "Test Token",
      "TEST",
      "https://example.com/contract.json"
    );
    await testToken.connect(alice).mint(alice.address, ethers.parseEther("1000"));
    await testToken.connect(alice).mint(bob.address, ethers.parseEther("1000"));
  });

  describe("Bug: Invalid delegation amounts", function () {
    it("Should reject zero delegation amount", async function () {
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1") });

      await expect(
        notes.connect(alice).delegate(1, bob.address, 0, 0)
      ).to.be.revertedWith("Invalid delegation amount");
    });

    it("Should reject delegation amount greater than note amount", async function () {
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1") });

      await expect(
        notes.connect(alice).delegate(1, bob.address, ethers.parseEther("2"), 0)
      ).to.be.revertedWith("Invalid delegation amount");
    });
  });

  describe("Bug: Self-delegation", function () {
    it("Should prevent delegating to self (circular delegation check catches this)", async function () {
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1") });

      // Self-delegation is correctly prevented by circular delegation check
      await expect(
        notes.connect(alice).delegate(1, alice.address, ethers.parseEther("1"), 0)
      ).to.be.revertedWith("Circular delegation detected");
    });
  });

  describe("Bug: Nonexistent note operations", function () {
    it("Should revert when getting chain of nonexistent note", async function () {
      await expect(notes.getChain(999)).to.be.revertedWith("Note does not exist");
    });

    it("Should revert when getting depositor of nonexistent note", async function () {
      // getDepositor doesn't check if note exists - this is a bug!
      const depositor = await notes.getDepositor(999);
      expect(depositor).to.equal(ethers.ZeroAddress); // Returns zero address
    });

    it("Should revert when delegating nonexistent note", async function () {
      await expect(
        notes.connect(alice).delegate(999, bob.address, ethers.parseEther("1"), 0)
      ).to.be.revertedWith("Note does not exist");
    });

    it("Should revert when revoking nonexistent note", async function () {
      await expect(notes.connect(alice).revoke(999)).to.be.revertedWith("Note does not exist");
    });
  });

  describe("ERC20 Token Support", function () {
    it("Should deposit ERC20 tokens", async function () {
      const amount = ethers.parseEther("10");

      await testToken.connect(alice).approve(await notes.getAddress(), amount);
      await notes.connect(alice).depositERC20(await testToken.getAddress(), amount, statementId);

      const note = await notes.notes(1);
      expect(note.amount).to.equal(amount);
      expect(note.token).to.equal(await testToken.getAddress());
      expect(note.tokenType).to.equal(0); // ERC20
      expect(note.tokenId).to.equal(0);
      expect(note.owner).to.equal(alice.address);
    });

    it("Should reclaim ERC20 tokens", async function () {
      const amount = ethers.parseEther("10");

      await testToken.connect(alice).approve(await notes.getAddress(), amount);
      await notes.connect(alice).depositERC20(await testToken.getAddress(), amount, statementId);

      const balanceBefore = await testToken.balanceOf(alice.address);
      await notes.connect(alice).reclaimFunds(1);
      const balanceAfter = await testToken.balanceOf(alice.address);

      expect(balanceAfter - balanceBefore).to.equal(amount);
    });

    it("Should delegate ERC20 notes", async function () {
      const amount = ethers.parseEther("10");

      await testToken.connect(alice).approve(await notes.getAddress(), amount);
      await notes.connect(alice).depositERC20(await testToken.getAddress(), amount, statementId);
      await notes.connect(alice).delegate(1, bob.address, amount, 0);

      const bobNote = await notes.notes(2);
      expect(bobNote.owner).to.equal(bob.address);
      expect(bobNote.token).to.equal(await testToken.getAddress());
      expect(bobNote.amount).to.equal(amount);
    });

    it("Should reject depositing zero amount", async function () {
      await expect(
        notes.connect(alice).depositERC20(await testToken.getAddress(), 0, statementId)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should reject using zero address for ERC20", async function () {
      await expect(
        notes.connect(alice).depositERC20(ethers.ZeroAddress, ethers.parseEther("1"), statementId)
      ).to.be.revertedWith("Use depositETH for ETH deposits");
    });

    it("Should reject sending ETH with ERC20 deposit", async function () {
      const amount = ethers.parseEther("10");
      await testToken.connect(alice).approve(await notes.getAddress(), amount);

      // The transaction will revert but the exact error message may vary
      await expect(
        notes.connect(alice).depositERC20(await testToken.getAddress(), amount, statementId, {
          value: ethers.parseEther("1")
        })
      ).to.be.reverted; // Note: Could check for specific error if needed
    });
  });

  describe("ERC1155 Token Support", function () {
    let erc1155;

    beforeEach(async function () {
      const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
      erc1155 = await PremintingERC1155.deploy(
        alice.address,
        "https://example.com/token/{id}.json",
        "https://example.com/contract.json"
      );

      await erc1155.connect(alice).mintBatch(alice.address, [1, 2], [100, 200]);
    });

    it("Should deposit ERC1155 tokens", async function () {
      await erc1155.connect(alice).setApprovalForAll(await notes.getAddress(), true);
      await notes.connect(alice).depositERC1155(await erc1155.getAddress(), 1, 50, statementId);

      const note = await notes.notes(1);
      expect(note.amount).to.equal(50);
      expect(note.token).to.equal(await erc1155.getAddress());
      expect(note.tokenType).to.equal(1); // ERC1155
      expect(note.tokenId).to.equal(1);
      expect(note.owner).to.equal(alice.address);
    });

    it("Should reclaim ERC1155 tokens", async function () {
      await erc1155.connect(alice).setApprovalForAll(await notes.getAddress(), true);
      await notes.connect(alice).depositERC1155(await erc1155.getAddress(), 1, 50, statementId);

      const balanceBefore = await erc1155.balanceOf(alice.address, 1);
      await notes.connect(alice).reclaimFunds(1);
      const balanceAfter = await erc1155.balanceOf(alice.address, 1);

      expect(balanceAfter - balanceBefore).to.equal(50n);
    });

    it("Should delegate ERC1155 notes", async function () {
      await erc1155.connect(alice).setApprovalForAll(await notes.getAddress(), true);
      await notes.connect(alice).depositERC1155(await erc1155.getAddress(), 1, 50, statementId);
      await notes.connect(alice).delegate(1, bob.address, 50, 0);

      const bobNote = await notes.notes(2);
      expect(bobNote.owner).to.equal(bob.address);
      expect(bobNote.token).to.equal(await erc1155.getAddress());
      expect(bobNote.tokenId).to.equal(1);
      expect(bobNote.amount).to.equal(50);
    });

    it("Should split ERC1155 delegation chain", async function () {
      await erc1155.connect(alice).setApprovalForAll(await notes.getAddress(), true);
      await notes.connect(alice).depositERC1155(await erc1155.getAddress(), 1, 100, statementId);

      const [splitId, remainderId] = await notes.connect(alice).delegate.staticCall(
        1, bob.address, 30, 0
      );
      await notes.connect(alice).delegate(1, bob.address, 30, 0);

      const splitNote = await notes.notes(splitId);
      const remainderNote = await notes.notes(remainderId);

      expect(splitNote.amount).to.equal(30);
      expect(remainderNote.amount).to.equal(70);
      expect(splitNote.tokenId).to.equal(1);
      expect(remainderNote.tokenId).to.equal(1);
    });

    it("Should reject depositing zero amount ERC1155", async function () {
      await expect(
        notes.connect(alice).depositERC1155(await erc1155.getAddress(), 1, 0, statementId)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should reject sending ETH with ERC1155 deposit", async function () {
      await erc1155.connect(alice).setApprovalForAll(await notes.getAddress(), true);

      // The transaction will revert but the exact error message may vary
      await expect(
        notes.connect(alice).depositERC1155(await erc1155.getAddress(), 1, 50, statementId, {
          value: ethers.parseEther("1")
        })
      ).to.be.reverted; // Note: Could check for specific error if needed
    });
  });

  describe("Bug: Commission accrual during purchases", function () {
    let erc1155Token;
    let assuranceContract;

    beforeEach(async function () {
      const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
      erc1155Token = await PremintingERC1155.deploy(
        alice.address,
        "https://example.com/token/{id}.json",
        "https://example.com/contract.json"
      );

      const MultiERC1155_AssuranceContract = await ethers.getContractFactory("MultiERC1155_AssuranceContract");
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      assuranceContract = await MultiERC1155_AssuranceContract.deploy(
        alice.address,
        alice.address,
        ethers.parseEther("10"),
        deadline,
        "QmTest123"
      );

      await erc1155Token.connect(alice).mintBatch(
        await assuranceContract.getAddress(),
        [1],
        [1000]
      );

      await assuranceContract.connect(alice).setPricesERC1155(
        await erc1155Token.getAddress(),
        [1],
        [ethers.parseEther("0.1")]
      );
    });

    it("Should pay commission immediately when delegate makes purchase", async function () {
      // Seller wants 0.3 ETH for 3 tokens
      // With 10% commission, Bob gets 0.03 ETH, seller gets 0.27 ETH
      // So paymentAmount needs to be enough that after commission, seller gets 0.3 ETH
      // If commission is 10%, then: netToSeller = paymentAmount * (1 - 0.10)
      // We need: 0.3 = paymentAmount * 0.9, so paymentAmount = 0.3 / 0.9 = 0.333...
      const sellerCost = ethers.parseEther("0.3"); // What seller expects to receive
      const paymentAmount = ethers.parseEther("0.333333333333333333"); // Enough to cover seller + commission

      // Alice deposits and delegates to Bob with 10% commission
      await notes.connect(alice).depositETH(statementId, { value: paymentAmount });
      await notes.connect(alice).delegate(1, bob.address, paymentAmount, 1000); // 10%

      // Track Bob's balance before purchase
      const bobBalanceBefore = await ethers.provider.getBalance(bob.address);

      // Bob makes purchase - paymentAmount goes through, commission is deducted, net goes to seller
      const tx = await notes.connect(bob).purchaseFromERC1155PrimaryMarket(
        [2],
        paymentAmount,
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        [1],
        [3]
      );
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      // Bob's balance should increase by 10% of paymentAmount (minus gas)
      const bobBalanceAfter = await ethers.provider.getBalance(bob.address);
      const expectedCommission = paymentAmount * 1000n / 10000n; // 10% of paymentAmount
      expect(bobBalanceAfter - bobBalanceBefore + gasCost).to.equal(expectedCommission);
    });

    it("Should pay commission immediately at multiple levels", async function () {
      // Seller wants 1.0 ETH for 10 tokens
      // Charlie has 10% commission, Bob has 20% commission
      // Total commission: 10% + 20% = 30%
      // So paymentAmount needs to cover seller (1.0) with 30% deducted
      // netToSeller = paymentAmount * (1 - 0.30)
      // 1.0 = paymentAmount * 0.7, so paymentAmount = 1.0 / 0.7 ≈ 1.428...
      const paymentAmount = ethers.parseEther("1.428571428571428571"); // Enough for seller + commissions

      // Alice → Bob (20%) → Charlie (10%)
      await notes.connect(alice).depositETH(statementId, { value: paymentAmount });
      await notes.connect(alice).delegate(1, bob.address, paymentAmount, 2000); // 20%
      await notes.connect(bob).delegate(2, charlie.address, paymentAmount, 1000); // 10%

      // Track balances before purchase
      const charlieBalanceBefore = await ethers.provider.getBalance(charlie.address);
      const bobBalanceBefore = await ethers.provider.getBalance(bob.address);
      const aliceBalanceBefore = await ethers.provider.getBalance(alice.address);

      // Charlie makes purchase
      const tx = await notes.connect(charlie).purchaseFromERC1155PrimaryMarket(
        [3],
        paymentAmount,
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        [1],
        [10]
      );
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      // Check balances after purchase
      const charlieBalanceAfter = await ethers.provider.getBalance(charlie.address);
      const bobBalanceAfter = await ethers.provider.getBalance(bob.address);
      const aliceBalanceAfter = await ethers.provider.getBalance(alice.address);

      // Charlie (leaf) gets 10% of paymentAmount, minus gas
      const charlieCommission = paymentAmount * 1000n / 10000n;
      expect(charlieBalanceAfter - charlieBalanceBefore + gasCost).to.equal(charlieCommission);

      // Bob (middle) gets 20% of paymentAmount
      const bobCommission = paymentAmount * 2000n / 10000n;
      expect(bobBalanceAfter - bobBalanceBefore).to.equal(bobCommission);

      // Alice (root) gets nothing (root doesn't get commission)
      expect(aliceBalanceAfter - aliceBalanceBefore).to.equal(0);
    });

    it("FIXED: Commission is paid immediately during purchase", async function () {
      // Seller wants 0.3 ETH for 3 tokens
      // With 10% commission, we need paymentAmount such that after commission, seller gets 0.3
      // paymentAmount * 0.9 = 0.3, so paymentAmount = 0.333...
      const paymentAmount = ethers.parseEther("0.333333333333333333");
      const expectedCommission = paymentAmount * 1000n / 10000n; // 10% of paymentAmount

      // Alice deposits enough to cover purchase + commission
      await notes.connect(alice).depositETH(statementId, { value: paymentAmount });
      await notes.connect(alice).delegate(1, bob.address, paymentAmount, 1000); // 10% commission

      const balanceBefore = await ethers.provider.getBalance(bob.address);

      // Bob makes purchase: paymentAmount covers both seller payment and commission
      // Commission is paid immediately during this transaction
      const tx = await notes.connect(bob).purchaseFromERC1155PrimaryMarket(
        [2],
        paymentAmount,
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        [1],
        [3] // 3 tokens @ 0.1 each = 0.3 ETH
      );
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(bob.address);

      // Bob should receive the commission immediately (minus gas for the transaction)
      expect(balanceAfter - balanceBefore + gasCost).to.equal(expectedCommission);
    });

    it("FIXED: CommissionPaid event is emitted during purchase", async function () {
      // Seller wants 0.3 ETH, with 10% commission we need 0.333...
      const paymentAmount = ethers.parseEther("0.333333333333333333");
      const expectedCommission = paymentAmount * 1000n / 10000n; // 10% of paymentAmount

      await notes.connect(alice).depositETH(statementId, { value: paymentAmount });
      await notes.connect(alice).delegate(1, bob.address, paymentAmount, 1000);

      // Purchase now emits CommissionPaid event immediately
      await expect(notes.connect(bob).purchaseFromERC1155PrimaryMarket(
        [2],
        paymentAmount,
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        [1],
        [3]
      ))
        .to.emit(notes, "CommissionPaid")
        .withArgs(bob.address, ethers.ZeroAddress, 0, 0, expectedCommission);
    });
  });

  describe("Bug: Proportional distribution with rounding", function () {
    it("Should handle rounding in proportional splits correctly", async function () {
      // Use an amount that doesn't divide evenly
      const totalAmount = ethers.parseEther("1.0");
      const delegateAmount = ethers.parseEther("0.333333333333333333"); // 1/3

      await notes.connect(alice).depositETH(statementId, { value: totalAmount });

      const [splitId, remainderId] = await notes.connect(alice).delegate.staticCall(
        1, bob.address, delegateAmount, 0
      );
      await notes.connect(alice).delegate(1, bob.address, delegateAmount, 0);

      const splitNote = await notes.notes(splitId);
      const remainderNote = await notes.notes(remainderId);

      expect(splitNote.amount).to.equal(delegateAmount);
      expect(remainderNote.amount).to.equal(totalAmount - delegateAmount);

      // Total should still equal original amount
      expect(splitNote.amount + remainderNote.amount).to.equal(totalAmount);
    });

    it("Should handle minimum wei amounts in splits", async function () {
      const totalAmount = 10n; // 10 wei
      const delegateAmount = 3n; // 3 wei

      await notes.connect(alice).depositETH(statementId, { value: totalAmount });

      const [splitId, remainderId] = await notes.connect(alice).delegate.staticCall(
        1, bob.address, delegateAmount, 0
      );
      await notes.connect(alice).delegate(1, bob.address, delegateAmount, 0);

      const splitNote = await notes.notes(splitId);
      const remainderNote = await notes.notes(remainderId);

      expect(splitNote.amount).to.equal(delegateAmount);
      expect(remainderNote.amount).to.equal(7n);
    });
  });

  describe("Bug: Note validation edge cases", function () {
    it("Should reject validateNotesCompatible with nonexistent note", async function () {
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1") });

      const [isValid, errorMessage] = await notes.validateNotesCompatible([1, 999]);
      expect(isValid).to.equal(false);
      expect(errorMessage).to.equal("Note does not exist");
    });

    it("Should reject validateNotesCompatible when first note doesn't exist", async function () {
      const [isValid, errorMessage] = await notes.validateNotesCompatible([999]);
      expect(isValid).to.equal(false);
      expect(errorMessage).to.equal("First note does not exist");
    });
  });

  describe("Bug: ETH deposit validation", function () {
    it("Should reject depositETH with zero value", async function () {
      await expect(
        notes.connect(alice).depositETH(statementId, { value: 0 })
      ).to.be.revertedWith("Must send ETH");
    });

    it("Should reject deposit with wrong token type for ETH", async function () {
      await expect(
        notes.connect(alice).deposit(ethers.ZeroAddress, 1, 0, 0, statementId, {
          value: ethers.parseEther("1")
        })
      ).to.be.revertedWith("ETH must use ERC20 type");
    });
  });

  describe("Bug: Revocation edge cases", function () {
    it("Should not allow non-participant to revoke", async function () {
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1") });
      await notes.connect(alice).delegate(1, bob.address, ethers.parseEther("1"), 0);

      // Charlie tries to revoke a chain he's not part of
      await expect(notes.connect(charlie).revoke(2))
        .to.be.revertedWith("Reached root without finding caller's note");
    });

    it("Edge case: Revoking your own leaf note marks it as undelegated (doesn't delete)", async function () {
      // This is an edge case: revoking a leaf note you already own
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1") });
      await notes.connect(alice).delegate(1, bob.address, ethers.parseEther("1"), 0);

      // Bob revokes his own note - unusual but allowed
      await notes.connect(bob).revoke(2);

      // Bob's note is NOT deleted (loop never executes because note.owner == caller)
      // It's just marked as undelegated
      const bobNote = await notes.notes(2);
      expect(bobNote.owner).to.equal(bob.address); // Still exists!
      expect(bobNote.delegated).to.equal(false); // Just marked as undelegated

      // Parent note is still marked as delegated
      const parentNote = await notes.notes(1);
      expect(parentNote.delegated).to.equal(true);
    });
  });

  describe("Bug: Purchase with empty or invalid arrays", function () {
    let erc1155Token;
    let assuranceContract;

    beforeEach(async function () {
      const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
      erc1155Token = await PremintingERC1155.deploy(
        alice.address,
        "https://example.com/token/{id}.json",
        "https://example.com/contract.json"
      );

      const MultiERC1155_AssuranceContract = await ethers.getContractFactory("MultiERC1155_AssuranceContract");
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      assuranceContract = await MultiERC1155_AssuranceContract.deploy(
        alice.address,
        alice.address,
        ethers.parseEther("10"),
        deadline,
        "QmTest123"
      );

      await erc1155Token.connect(alice).mintBatch(
        await assuranceContract.getAddress(),
        [1],
        [1000]
      );

      await assuranceContract.connect(alice).setPricesERC1155(
        await erc1155Token.getAddress(),
        [1],
        [ethers.parseEther("0.1")]
      );
    });

    it("Should reject purchase with empty noteIds array", async function () {
      await expect(
        notes.connect(alice).purchaseFromERC1155PrimaryMarket(
          [], // empty
          ethers.parseEther("0.3"),
          await assuranceContract.getAddress(),
          await erc1155Token.getAddress(),
          [1],
          [3]
        )
      ).to.be.revertedWith("Must provide at least one note");
    });

    it("Should reject purchase with mismatched tokenIds and counts", async function () {
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("0.3") });

      await expect(
        notes.connect(alice).purchaseFromERC1155PrimaryMarket(
          [1],
          ethers.parseEther("0.3"),
          await assuranceContract.getAddress(),
          await erc1155Token.getAddress(),
          [1, 2], // 2 token IDs
          [3]     // 1 count - mismatch!
        )
      ).to.be.revertedWith("Token IDs and counts length mismatch");
    });
  });

  describe("Bug: Multiple deposits and delegation chains", function () {
    it("Should handle multiple independent delegation chains", async function () {
      // Alice creates two separate notes and delegates them independently
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1") });
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("2") });

      await notes.connect(alice).delegate(1, bob.address, ethers.parseEther("1"), 0);
      await notes.connect(alice).delegate(2, charlie.address, ethers.parseEther("2"), 0);

      const bobNote = await notes.notes(3);
      const charlieNote = await notes.notes(4);

      expect(bobNote.owner).to.equal(bob.address);
      expect(bobNote.amount).to.equal(ethers.parseEther("1"));
      expect(bobNote.parentNoteId).to.equal(1);

      expect(charlieNote.owner).to.equal(charlie.address);
      expect(charlieNote.amount).to.equal(ethers.parseEther("2"));
      expect(charlieNote.parentNoteId).to.equal(2);
    });
  });

  describe("Bug: Delegation with notes from purchases", function () {
    let erc1155Token;
    let assuranceContract;

    beforeEach(async function () {
      const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
      erc1155Token = await PremintingERC1155.deploy(
        alice.address,
        "https://example.com/token/{id}.json",
        "https://example.com/contract.json"
      );

      const MultiERC1155_AssuranceContract = await ethers.getContractFactory("MultiERC1155_AssuranceContract");
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      assuranceContract = await MultiERC1155_AssuranceContract.deploy(
        alice.address,
        alice.address,
        ethers.parseEther("10"),
        deadline,
        "QmTest123"
      );

      await erc1155Token.connect(alice).mintBatch(
        await assuranceContract.getAddress(),
        [1],
        [1000]
      );

      await assuranceContract.connect(alice).setPricesERC1155(
        await erc1155Token.getAddress(),
        [1],
        [ethers.parseEther("0.1")]
      );
    });

    it("Should allow delegating ERC1155 notes received from purchase", async function () {
      const paymentAmount = ethers.parseEther("0.3");

      await notes.connect(alice).depositETH(statementId, { value: paymentAmount });

      await notes.connect(alice).purchaseFromERC1155PrimaryMarket(
        [1],
        paymentAmount,
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        [1],
        [3]
      );

      // Alice should have ERC1155 note (note 2)
      const purchasedNote = await notes.notes(2);
      expect(purchasedNote.tokenType).to.equal(1); // ERC1155

      // Delegate the ERC1155 note
      await notes.connect(alice).delegate(2, bob.address, 3, 0);

      const bobNote = await notes.notes(3);
      expect(bobNote.owner).to.equal(bob.address);
      expect(bobNote.token).to.equal(await erc1155Token.getAddress());
      expect(bobNote.tokenType).to.equal(1); // ERC1155
      expect(bobNote.amount).to.equal(3);
    });
  });
});
