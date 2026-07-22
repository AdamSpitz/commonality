import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

// Tests for refundIntoNote: the mirror image of purchaseFromPrimaryMarket. Once an
// assurance contract has failed, a receipt note can be refunded back into a
// settlement-token note rooted at the same delegation chain — so a failed pledge
// replenishes the same revocable pool it was funded from instead of stranding funds.
describe("DelegatableNotes - Refund Into Note", function () {
  let notes;
  let alice, bob, seller;
  let erc1155Token;
  let paymentToken;
  let assuranceContract;
  let assuranceFactory;
  let deadline;

  const TOKEN_ID = 1;
  const PRICE = ethers.parseEther("0.1"); // price per unit of TOKEN_ID
  const COUNT = 3n; // units bob buys
  const COST = PRICE * COUNT; // 0.3 ETH, well below the 10 ETH threshold → fails

  beforeEach(async function () {
    [alice, bob, seller] = await ethers.getSigners();

    const PremintingERC20 = await ethers.getContractFactory("PremintingERC20");
    paymentToken = await PremintingERC20.deploy(
      seller.address,
      "Delegation Payment Token",
      "DPT",
      "https://example.com/payment-token.json"
    );
    await paymentToken.connect(seller).mint(alice.address, ethers.parseEther("1000"));
    await paymentToken.connect(seller).mint(bob.address, ethers.parseEther("1000"));

    const AssuranceContractFactory = await ethers.getContractFactory("AssuranceContractFactory");
    assuranceFactory = await AssuranceContractFactory.deploy();

    const DelegatableNotes = await ethers.getContractFactory("DelegatableNotes");
    notes = await DelegatableNotes.deploy(
      await assuranceFactory.getAddress()
    );

    const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
    erc1155Token = await PremintingERC1155.deploy(
      seller.address,
      "https://example.com/token/{id}.json",
      "https://example.com/contract.json"
    );

    const latestBlock = await ethers.provider.getBlock("latest");
    deadline = latestBlock.timestamp + 86400;
    const tx = await assuranceFactory.createAssuranceContract(
      seller.address,
      seller.address,
      await paymentToken.getAddress(),
      await erc1155Token.getAddress(),
      "QmTest123"
    );
    const receipt = await tx.wait();
    const acEvent = receipt.logs.find(
      log => log.fragment && log.fragment.name === "LazyGivingAssuranceContractCreated"
    );
    const MultiERC1155AssuranceContract = await ethers.getContractFactory("MultiERC1155AssuranceContract");
    assuranceContract = MultiERC1155AssuranceContract.attach(acEvent.args[0]);

    const ValueThresholdCondition = await ethers.getContractFactory("ValueThresholdCondition");
    const condition = await ValueThresholdCondition.deploy(
      acEvent.args[0],
      ethers.parseEther("10"), // threshold far above COST → contract will fail at the deadline
      deadline
    );
    await assuranceContract.connect(seller).setCondition(await condition.getAddress());

    await erc1155Token.connect(seller).mintBatch(
      await assuranceContract.getAddress(),
      [1, 2, 3],
      [1000, 1000, 1000]
    );
    await assuranceContract.connect(seller).setPricesERC1155(
      [1, 2, 3],
      [ethers.parseEther("0.1"), ethers.parseEther("0.2"), ethers.parseEther("0.5")]
    );
    await erc1155Token.connect(seller).setReceiptTransferBridge(await assuranceContract.getAddress(), true);
  });

  async function depositPaymentNote(signer, amount) {
    await paymentToken.connect(signer).approve(await notes.getAddress(), amount);
    const tx = await notes.connect(signer).deposit(await paymentToken.getAddress(), 0, 0, amount);
    const receipt = await tx.wait();
    const ev = receipt.logs.find(l => l.fragment && l.fragment.name === "NoteCreated");
    return ev.args.noteId;
  }

  // alice deposits, delegates the full note to bob, bob buys COUNT receipts.
  // Returns the receipt note id (held inside DelegatableNotes with chain [alice, bob]).
  async function setUpDelegatedReceiptNote() {
    const paymentNoteId = await depositPaymentNote(alice, COST);
    await notes.connect(alice).delegate(paymentNoteId, [alice.address], bob.address, COST);

    const tx = await notes.connect(bob).purchaseFromPrimaryMarket(
      [{ noteId: paymentNoteId, chain: [bob.address, alice.address], shares: COUNT }],
      await assuranceContract.getAddress(),
      await erc1155Token.getAddress(),
      TOKEN_ID,
      COUNT
    );
    const receipt = await tx.wait();
    const purchased = receipt.logs.find(l => l.fragment && l.fragment.name === "ERC1155Purchased");
    return purchased.args.outputNoteIds[0];
  }

  async function failTheContract() {
    await hre.network.provider.send("evm_increaseTime", [86400]);
    await hre.network.provider.send("evm_mine");
  }

  it("refunds a delegated receipt note back into a settlement-token note with the same chain", async function () {
    const receiptNoteId = await setUpDelegatedReceiptNote();
    await failTheContract();

    const tx = await notes.connect(bob).refundIntoNote(
      receiptNoteId,
      [bob.address, alice.address],
      await assuranceContract.getAddress()
    );
    const receipt = await tx.wait();

    const refundEvent = receipt.logs.find(l => l.fragment && l.fragment.name === "RefundedIntoNote");
    expect(refundEvent).to.not.be.undefined;
    expect(refundEvent.args.refundValue).to.equal(COST);
    const refundNoteId = refundEvent.args.outputNoteId;

    // Receipt note is consumed/deleted.
    const consumedReceipt = await notes.notes(receiptNoteId);
    expect(consumedReceipt.chainHash).to.equal(ethers.ZeroHash);

    // New note is an ERC20 settlement-token note for the full refund value.
    const refundNote = await notes.notes(refundNoteId);
    expect(refundNote.tokenType).to.equal(0); // ERC20
    expect(refundNote.token).to.equal(await paymentToken.getAddress());
    expect(refundNote.amount).to.equal(COST);
    expect(refundNote.tokenId).to.equal(0n);

    // The settlement tokens are held by the notes contract, not handed to an EOA.
    expect(await paymentToken.balanceOf(await notes.getAddress())).to.equal(COST);
  });

  it("preserves revocability: root can revoke the delegate then reclaim the refunded note", async function () {
    const receiptNoteId = await setUpDelegatedReceiptNote();
    await failTheContract();

    const tx = await notes.connect(bob).refundIntoNote(
      receiptNoteId,
      [bob.address, alice.address],
      await assuranceContract.getAddress()
    );
    const receipt = await tx.wait();
    const refundNoteId = receipt.logs.find(
      l => l.fragment && l.fragment.name === "RefundedIntoNote"
    ).args.outputNoteId;

    // Alice (root of the inherited chain) revokes bob, truncating the chain back to [alice].
    await notes.connect(alice).revoke(refundNoteId, [bob.address, alice.address]);

    const balanceBefore = await paymentToken.balanceOf(alice.address);
    await notes.connect(alice).reclaimFunds(refundNoteId);
    const balanceAfter = await paymentToken.balanceOf(alice.address);

    expect(balanceAfter - balanceBefore).to.equal(COST);
  });

  it("reverts if the assurance contract has not failed", async function () {
    const receiptNoteId = await setUpDelegatedReceiptNote();
    // No time advance: the contract is still live (neither succeeded nor failed).
    await expect(
      notes.connect(bob).refundIntoNote(
        receiptNoteId,
        [bob.address, alice.address],
        await assuranceContract.getAddress()
      )
    ).to.be.revertedWithCustomError(assuranceContract, "ConditionNotFailed");
  });

  it("reverts when the note is not an ERC1155 receipt note", async function () {
    const paymentNoteId = await depositPaymentNote(alice, COST);
    await failTheContract();
    await expect(
      notes.connect(alice).refundIntoNote(
        paymentNoteId,
        [alice.address],
        await assuranceContract.getAddress()
      )
    ).to.be.revertedWithCustomError(notes, "NoteIsNotReceiptToken");
  });

  it("reverts when the caller is not the leaf owner of the receipt note", async function () {
    const receiptNoteId = await setUpDelegatedReceiptNote();
    await failTheContract();
    // seller passes the valid chain but is not its leaf (bob is).
    await expect(
      notes.connect(seller).refundIntoNote(
        receiptNoteId,
        [bob.address, alice.address],
        await assuranceContract.getAddress()
      )
    ).to.be.revertedWithCustomError(notes, "NotNoteOwner");
  });

  it("reverts for an unauthorized primary market", async function () {
    const receiptNoteId = await setUpDelegatedReceiptNote();
    await failTheContract();
    await expect(
      notes.connect(bob).refundIntoNote(
        receiptNoteId,
        [bob.address, alice.address],
        seller.address // not an authorized primary market
      )
    ).to.be.revertedWithCustomError(notes, "UnauthorizedMarket");
  });
});
