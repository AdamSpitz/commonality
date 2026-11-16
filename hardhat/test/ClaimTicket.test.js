import { expect } from 'chai';
import hardhat from 'hardhat';
import { deployProjectFactory, defaultProjectParams } from './helpers/projectFactory.js';

const { ethers } = hardhat;
const DAY = 24 * 60 * 60;
const WORK = 'claim-ticket:piece';

async function setup() {
  const fixture = await deployProjectFactory();
  const [alice, bob, other] = await ethers.getSigners();
  const transit = ethers.Wallet.createRandom().connect(ethers.provider);
  const deadline = BigInt((await ethers.provider.getBlock('latest')).timestamp + 30 * DAY);
  const { projectFactory: factory, beneficiaryPaymentToken: paymentToken, workRegistry } = fixture;
  const create = async (transitWallet = transit, workIds = [WORK], projectDeadline = deadline) => {
    const args = defaultProjectParams(alice.address, transitWallet.address, paymentToken.target, projectDeadline);
    args[5] = 5n;
    const tx = await factory.connect(alice).createClaimTicketProject(...args, workIds);
    const receipt = await tx.wait();
    const event = receipt.logs.map(log => { try { return factory.interface.parseLog(log); } catch { return null; } })
      .find(log => log?.name === 'ClaimTicketProjectCreated');
    const ac = await ethers.getContractAt('ClaimTicketAssuranceContract', event.args.project);
    const created = receipt.logs.map(log => { try { return factory.interface.parseLog(log); } catch { return null; } })
      .find(log => log?.name === 'ProjectCreated');
    const condition = await ethers.getContractAt('WorkFundingCondition', created.args.condition);
    return { ac, condition, token: created.args.token, transit: transitWallet };
  };
  return { ...fixture, factory, paymentToken, workRegistry, alice, bob, other, transit, deadline, create };
}

function redeemTypes() {
  return {
    RedeemClaimTicket: [
      { name: 'destination', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
    ],
  };
}

async function asSender(wallet) {
  await ethers.provider.send('hardhat_setBalance', [wallet.address, '0x1000000000000000000']);
  return wallet;
}

async function signRedeem(ac, signer, destination, deadline) {
  const domain = {
    name: 'ClaimTicket',
    version: '1',
    chainId: (await ethers.provider.getNetwork()).chainId,
    verifyingContract: ac.target,
  };
  return signer.signTypedData(domain, redeemTypes(), { destination, deadline, nonce: 0n });
}

describe('claim tickets', function () {
  it('records one transit address and rejects a duplicate', async function () {
    const { factory, transit, create } = await setup();
    const { ac } = await create();
    expect(await factory.ticketProjectOf(transit.address)).to.equal(ac.target);
    expect(await ac.transitAddress()).to.equal(transit.address);
    expect(await ac.redeemed()).to.equal(false);
    await expect(create()).to.be.revertedWithCustomError(factory, 'DuplicateTransitAddress');
  });

  it('binds an EOA and then gives only that account work and proceeds authority', async function () {
    const { factory, workRegistry, alice, bob, other, transit, deadline, create } = await setup();
    const { ac, condition } = await create();
    const scopeBefore = await factory.workBeneficiaryOf(ac.target);
    expect(scopeBefore).to.equal(await factory.walletWorkBeneficiary(transit.address));
    await expect(factory.connect(alice).acceptWorkProject(ac.target)).to.be.revertedWithCustomError(condition, 'OnlyBeneficiary');
    await expect(factory.connect(bob).acceptWorkProject(ac.target)).to.be.revertedWithCustomError(condition, 'OnlyBeneficiary');
    await expect(ac.connect(bob).claim()).to.be.revertedWithCustomError(ac, 'NotPayoutAddress');
    await expect(ac.connect(bob).refuse()).to.be.revertedWithCustomError(ac, 'NotPayoutAddress');

    const redeemDeadline = deadline;
    const transitSig = await signRedeem(ac, transit, bob.address, redeemDeadline);
    const bobSig = await signRedeem(ac, bob, bob.address, redeemDeadline);
    const wrongDest = await signRedeem(ac, bob, other.address, redeemDeadline);
    await expect(ac.redeem(bob.address, transitSig, wrongDest, redeemDeadline))
      .to.be.revertedWithCustomError(ac, 'InvalidDestinationSignature');
    await expect(ac.redeem(ethers.ZeroAddress, transitSig, bobSig, redeemDeadline))
      .to.be.revertedWithCustomError(ac, 'InvalidDestination');
    await expect(ac.redeem(transit.address, transitSig, bobSig, redeemDeadline))
      .to.be.revertedWithCustomError(ac, 'InvalidDestination');
    await expect(ac.redeem(ac.target, transitSig, bobSig, redeemDeadline))
      .to.be.revertedWithCustomError(ac, 'InvalidDestination');
    await expect(ac.redeem(bob.address, bobSig, bobSig, redeemDeadline))
      .to.be.revertedWithCustomError(ac, 'InvalidTransitSignature');
    const mismatched = await signRedeem(ac, transit, other.address, redeemDeadline);
    await expect(ac.redeem(bob.address, mismatched, bobSig, redeemDeadline))
      .to.be.revertedWithCustomError(ac, 'InvalidTransitSignature');
    await expect(ac.redeem(bob.address, transitSig, bobSig, 1n))
      .to.be.revertedWithCustomError(ac, 'RedemptionExpired');

    await ac.redeem(bob.address, transitSig, bobSig, redeemDeadline);
    expect(await ac.destination()).to.equal(bob.address);
    expect(await factory.workBeneficiaryOf(ac.target)).to.equal(scopeBefore);
    expect(await workRegistry.projectFor(ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'bytes32'], [scopeBefore, ethers.keccak256(ethers.toUtf8Bytes(WORK))],
    )))).to.equal(ac.target);

    await expect(ac.redeem(other.address, await signRedeem(ac, transit, other.address, redeemDeadline), await signRedeem(ac, other, other.address, redeemDeadline), redeemDeadline))
      .to.be.revertedWithCustomError(ac, 'TicketAlreadyRedeemed');
    await expect(factory.connect(await asSender(transit)).acceptWorkProject(ac.target)).to.be.revertedWithCustomError(condition, 'OnlyBeneficiary');
    await expect(factory.connect(alice).acceptWorkProject(ac.target)).to.be.revertedWithCustomError(condition, 'OnlyBeneficiary');
    await factory.connect(bob).acceptWorkProject(ac.target);
    expect(await condition.acceptedAt()).to.be.greaterThan(0n);
    expect(await condition.VETO_WINDOW()).to.equal(7n * BigInt(DAY));
    await expect(ac.connect(await asSender(transit)).claim()).to.be.revertedWithCustomError(ac, 'NotPayoutAddress');
    await expect(ac.connect(bob).claim()).to.be.revertedWithCustomError(ac, 'ConditionNotMet');
  });

  it('accepts an ERC-1271 destination and blocks a callback from claiming or redeeming twice', async function () {
    const { bob, transit, deadline, create } = await setup();
    const { ac } = await create();
    const wallet = await ethers.deployContract('MockERC1271');
    const redeemDeadline = deadline;
    const transitSig = await signRedeem(ac, transit, wallet.target, redeemDeadline);
    const destSig = '0x';
    await wallet.setCallback(ac.target, ac.interface.encodeFunctionData('redeem', [wallet.target, transitSig, destSig, redeemDeadline]));
    await ac.redeem(wallet.target, transitSig, destSig, redeemDeadline);
    expect(await ac.redeemed()).to.equal(true);
    expect(await ac.destination()).to.equal(wallet.target);

    const secondTransit = ethers.Wallet.createRandom().connect(ethers.provider);
    const second = await create(secondTransit);
    const claimCall = second.ac.interface.encodeFunctionData('claim');
    await wallet.setCallback(second.ac.target, claimCall);
    const sig = await signRedeem(second.ac, secondTransit, wallet.target, redeemDeadline);
    await second.ac.redeem(wallet.target, sig, destSig, redeemDeadline);
    expect(await second.ac.redeemed()).to.equal(true);
  });

  it('rejects redemption after the work deadline and does not let the transit key claim a later refusal', async function () {
    const { factory, paymentToken, alice, bob, transit, create } = await setup();
    const { ac, condition } = await create();
    await ethers.provider.send('evm_increaseTime', [31 * DAY]);
    await ethers.provider.send('evm_mine', []);
    expect(await condition.hasFailed()).to.equal(true);
    const redeemDeadline = BigInt((await ethers.provider.getBlock('latest')).timestamp + DAY);
    await expect(ac.redeem(
      bob.address,
      await signRedeem(ac, transit, bob.address, redeemDeadline),
      await signRedeem(ac, bob, bob.address, redeemDeadline),
      redeemDeadline,
    )).to.be.revertedWithCustomError(ac, 'RedemptionClosed');

    const liveTransit = ethers.Wallet.createRandom().connect(ethers.provider);
    const liveDeadline = BigInt((await ethers.provider.getBlock('latest')).timestamp + 20 * DAY);
    const live = await create(liveTransit, [WORK + ':live'], liveDeadline);
    await live.ac.redeem(
      bob.address,
      await signRedeem(live.ac, liveTransit, bob.address, liveDeadline),
      await signRedeem(live.ac, bob, bob.address, liveDeadline),
      liveDeadline,
    );
    await factory.connect(bob).acceptWorkProject(live.ac.target);
    await paymentToken.connect(alice).mint(5n);
    await paymentToken.connect(alice).approve(live.ac.target, 5n);
    await live.ac.connect(alice).buyERC1155(alice.address, live.token, [1n], [1n], '0x');
    await ethers.provider.send('evm_increaseTime', [7 * DAY + 1]);
    await ethers.provider.send('evm_mine', []);
    await live.ac.connect(bob).refuse();
    await expect(live.ac.connect(await asSender(liveTransit)).claim()).to.be.revertedWithCustomError(live.ac, 'NotPayoutAddress');
    expect(await paymentToken.balanceOf(bob.address)).to.equal(0n);
    expect(await live.ac.accumulatedReimbursementPerClaimShare()).to.equal(0n);
  });

  it('rejects a signature from another chain, contract, or competing stolen-code destination', async function () {
    const { bob, other, transit, deadline, create } = await setup();
    const { ac } = await create();
    const domain = {
      name: 'ClaimTicket',
      version: '1',
      chainId: (await ethers.provider.getNetwork()).chainId + 1n,
      verifyingContract: ac.target,
    };
    const wrongChain = await transit.signTypedData(domain, redeemTypes(), {
      destination: bob.address, deadline, nonce: 0n,
    });
    const bobSig = await signRedeem(ac, bob, bob.address, deadline);
    await expect(ac.redeem(bob.address, wrongChain, bobSig, deadline))
      .to.be.revertedWithCustomError(ac, 'InvalidTransitSignature');

    const otherContract = { ...domain, chainId: (await ethers.provider.getNetwork()).chainId, verifyingContract: bob.address };
    const wrongContract = await transit.signTypedData(otherContract, redeemTypes(), {
      destination: bob.address, deadline, nonce: 0n,
    });
    await expect(ac.redeem(bob.address, wrongContract, bobSig, deadline))
      .to.be.revertedWithCustomError(ac, 'InvalidTransitSignature');

    const carol = other;
    const stolenTransit = await signRedeem(ac, transit, carol.address, deadline);
    const carolSig = await signRedeem(ac, carol, carol.address, deadline);
    await ac.redeem(bob.address, await signRedeem(ac, transit, bob.address, deadline), bobSig, deadline);
    await expect(ac.redeem(carol.address, stolenTransit, carolSig, deadline))
      .to.be.revertedWithCustomError(ac, 'TicketAlreadyRedeemed');
    expect(await ac.destination()).to.equal(bob.address);
  });

  it('keeps the seven-day veto, refunds a refusal before success, and reclaims only at the 90-day boundary', async function () {
    const { factory, paymentToken, alice, bob, transit, create } = await setup();
    const earlyDeadline = BigInt((await ethers.provider.getBlock('latest')).timestamp + 40 * DAY);
    const { ac, token } = await create(transit, [WORK + ':boundary'], earlyDeadline);
    await ac.redeem(
      bob.address,
      await signRedeem(ac, transit, bob.address, earlyDeadline),
      await signRedeem(ac, bob, bob.address, earlyDeadline),
      earlyDeadline,
    );
    await fund(paymentToken, alice, ac, token, 5n);
    await expect(ac.connect(bob).refuse()).to.emit(ac, 'ProceedsRefused');
    const receipt = await ethers.getContractAt('PremintingERC1155', token);
    await receipt.connect(alice).setApprovalForAll(ac.target, true);
    await ac.connect(alice).refundERC1155(alice.address, token, [1n], [1n], '0x');
    expect(await paymentToken.balanceOf(alice.address)).to.equal(5n);
    const laterTransit = ethers.Wallet.createRandom().connect(ethers.provider);
    const laterDeadline = BigInt((await ethers.provider.getBlock('latest')).timestamp + 40 * DAY);
    const later = await create(laterTransit, [WORK + ':later'], laterDeadline);
    await later.ac.redeem(
      bob.address,
      await signRedeem(later.ac, laterTransit, bob.address, laterDeadline),
      await signRedeem(later.ac, bob, bob.address, laterDeadline),
      laterDeadline,
    );
    await fund(paymentToken, alice, later.ac, later.token, 5n);
    await fund(paymentToken, alice, later.ac, later.token, 7n, 2n);
    const reservesBefore = await later.ac.accumulatedReimbursementPerClaimShare();
    await factory.connect(bob).acceptWorkProject(later.ac.target);
    expect(await later.condition.VETO_WINDOW()).to.equal(7n * BigInt(DAY));
    await ethers.provider.send('evm_increaseTime', [7 * DAY + 1]);
    await ethers.provider.send('evm_mine', []);
    const noted = await (await later.ac.noteSuccess()).wait();
    const succeededAt = BigInt((await ethers.provider.getBlock(noted.blockNumber)).timestamp);
    expect(await later.ac.accumulatedReimbursementPerClaimShare()).to.equal(reservesBefore);
    await expect(later.ac.reclaimUnclaimedShare()).to.be.revertedWithCustomError(later.ac, 'ClaimWindowStillOpen');
    const window = await later.ac.unclaimedProceedsWindow();
    await ethers.provider.send('evm_setNextBlockTimestamp', [Number(succeededAt + window - 1n)]);
    await expect(later.ac.connect(bob).claim()).to.emit(later.ac, 'ProceedsClaimed');
    expect(await paymentToken.balanceOf(bob.address)).to.equal(12n);
    expect(await paymentToken.balanceOf(laterTransit.address)).to.equal(0n);

    const closedTransit = ethers.Wallet.createRandom().connect(ethers.provider);
    const closedDeadline = BigInt((await ethers.provider.getBlock('latest')).timestamp + 40 * DAY);
    const closed = await create(closedTransit, [WORK + ':closed'], closedDeadline);
    await closed.ac.redeem(
      bob.address,
      await signRedeem(closed.ac, closedTransit, bob.address, closedDeadline),
      await signRedeem(closed.ac, bob, bob.address, closedDeadline),
      closedDeadline,
    );
    await fund(paymentToken, alice, closed.ac, closed.token, 5n);
    await factory.connect(bob).acceptWorkProject(closed.ac.target);
    await ethers.provider.send('evm_increaseTime', [7 * DAY + 1]);
    await ethers.provider.send('evm_mine', []);
    const closedNote = await (await closed.ac.noteSuccess()).wait();
    const closedAt = BigInt((await ethers.provider.getBlock(closedNote.blockNumber)).timestamp) + await closed.ac.unclaimedProceedsWindow();
    await ethers.provider.send('evm_setNextBlockTimestamp', [Number(closedAt)]);
    await expect(closed.ac.connect(bob).claim()).to.be.revertedWithCustomError(closed.ac, 'ClaimWindowElapsed');
    const beforeReclaim = await paymentToken.balanceOf(alice.address);
    await closed.ac.connect(alice).reclaimUnclaimedShare();
    expect(await paymentToken.balanceOf(alice.address)).to.equal(beforeReclaim + 5n);
    expect(await closed.condition.VETO_WINDOW()).to.equal(7n * BigInt(DAY));
  });
});

async function fund(paymentToken, alice, ac, token, amount, id = 1n) {
  await paymentToken.connect(alice).mint(amount);
  await paymentToken.connect(alice).approve(ac.target, amount);
  await ac.connect(alice).buyERC1155(alice.address, token, [id], [1n], '0x');
}
