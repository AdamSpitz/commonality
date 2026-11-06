import { expect } from 'chai';
import hardhat from 'hardhat';
import { deployProjectFactory, defaultProjectParams } from './helpers/projectFactory.js';

const { ethers } = hardhat;
const DAY = 24 * 60 * 60;
const WORK = 'concert:cedarvale:2026-10-08';
const hashWork = (scope, id = WORK) => ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
  ['bytes32', 'bytes32'], [scope, ethers.keccak256(ethers.toUtf8Bytes(id))],
));

async function setup() {
  const fixture = await deployProjectFactory();
  const [initiator, bob, carol, other] = await ethers.getSigners();
  const deadline = BigInt((await ethers.provider.getBlock('latest')).timestamp + 30 * DAY);
  const { projectFactory: factory, beneficiaryPaymentToken: paymentToken } = fixture;
  const create = async (caller, recipient, beneficiaryId, workIds = [WORK]) => {
    const args = defaultProjectParams(caller.address, recipient.address, paymentToken.target, deadline);
    args[5] = 5n;
    if (beneficiaryId) args[3] = beneficiaryId;
    const tx = await factory.connect(caller)[beneficiaryId
      ? 'createERC1155AndAssuranceContractForBeneficiaryWithWorkItems'
      : 'createERC1155AndAssuranceContractWithWorkItems'](...args, workIds);
    const receipt = await tx.wait();
    const event = receipt.logs.map(log => { try { return factory.interface.parseLog(log); } catch { return null; } })
      .find(log => log?.name === 'ProjectCreated');
    const ac = await ethers.getContractAt(beneficiaryId ? 'BeneficiaryAssuranceContract' : 'FixedControllerAssuranceContract', event.args.assuranceContract);
    const condition = await ethers.getContractAt('WorkFundingCondition', event.args.condition);
    return { ac, condition, token: event.args.token };
  };
  const fund = async ({ ac, token }) => {
    await paymentToken.connect(initiator).mint(5n);
    await paymentToken.connect(initiator).approve(ac.target, 5n);
    await ac.connect(initiator).buyERC1155(initiator.address, token, [1n], [1n], '0x');
  };
  const verify = async (id, claimant) => {
    await fixture.verifier.setValid(true);
    await fixture.beneficiaryRegistry.verifyBeneficiary(id, claimant.address, ethers.randomBytes(32), deadline, ethers.randomBytes(32), '0x');
  };
  return { ...fixture, factory, paymentToken, initiator, bob, carol, other, deadline, create, fund, verify };
}

describe('beneficiary-scoped work funding', function () {
  it('lets different wallet beneficiaries fund the same local id, while preventing a second success for either beneficiary', async function () {
    const { factory, workRegistry, bob, carol, other, create, fund } = await setup();
    const first = await create(bob, bob);
    const second = await create(carol, carol);
    const bobScope = await factory.walletWorkBeneficiary(bob.address);
    const carolScope = await factory.walletWorkBeneficiary(carol.address);
    expect(await workRegistry.projectFor(hashWork(bobScope))).to.equal(first.ac.target);
    expect(await workRegistry.projectFor(hashWork(carolScope))).to.equal(second.ac.target);
    await expect(create(other, bob)).to.be.revertedWithCustomError(workRegistry, 'ContentAlreadyRegistered');
    await fund(first);
    await fund(second);
    expect(await first.condition.hasSucceeded()).to.equal(true);
    expect(await second.condition.hasSucceeded()).to.equal(true);
    await first.ac.connect(bob).claim();
    await second.ac.connect(carol).claim();
    await expect(create(other, bob)).to.be.revertedWithCustomError(workRegistry, 'WorkPermanentlyFunded');
    await expect(factory.releaseWorkOnFailure(first.ac.target)).to.be.revertedWithCustomError(workRegistry, 'WorkPermanentlyFunded');
  });

  it('shares a named beneficiary slot across initiators and payout rotation, but separates different named beneficiaries', async function () {
    const { factory, workRegistry, beneficiaryRegistry, initiator, bob, carol, other, create, fund, verify } = await setup();
    const bobId = ethers.keccak256(ethers.toUtf8Bytes('dns:bob.example'));
    const carolId = ethers.keccak256(ethers.toUtf8Bytes('dns:carol.example'));
    const first = await create(initiator, bob, bobId);
    const second = await create(initiator, carol, carolId);
    await expect(create(other, bob, bobId)).to.be.revertedWithCustomError(workRegistry, 'ContentAlreadyRegistered');
    await fund(first);
    expect(await first.condition.hasSucceeded()).to.equal(false);
    await expect(factory.connect(other).acceptWorkProject(first.ac.target)).to.be.revertedWithCustomError(first.condition, 'OnlyBeneficiary');
    await verify(bobId, bob);
    await verify(carolId, carol);
    await beneficiaryRegistry.connect(bob).rotatePayoutAddress(bobId, other.address);
    await expect(factory.connect(bob).acceptWorkProject(first.ac.target)).to.be.revertedWithCustomError(first.condition, 'OnlyBeneficiary');
    await factory.connect(other).acceptWorkProject(first.ac.target);
    await factory.connect(carol).acceptWorkProject(second.ac.target);
    await fund(second);
    await ethers.provider.send('evm_increaseTime', [7 * DAY + 1]);
    await ethers.provider.send('evm_mine', []);
    expect(await first.condition.hasSucceeded()).to.equal(true);
    expect(await second.condition.hasSucceeded()).to.equal(true);
    await first.ac.connect(other).claim();
    await second.ac.connect(carol).claim();
    await expect(create(bob, bob, bobId)).to.be.revertedWithCustomError(workRegistry, 'WorkPermanentlyFunded');
  });

  it('lets a wallet recipient accept or veto even a fully funded proposal, releasing the entire batch for a retry', async function () {
    const { factory, workRegistry, initiator, bob, other, create, fund } = await setup();
    const first = await create(initiator, bob, undefined, [WORK, 'maintenance:october']);
    await fund(first);
    await expect(first.ac.connect(bob).claim()).to.be.revertedWithCustomError(first.ac, 'ConditionNotMet');
    await expect(first.condition.accept(bob.address)).to.be.revertedWithCustomError(first.condition, 'OnlyFactory');
    await expect(factory.connect(other).vetoWorkProject(first.ac.target)).to.be.revertedWithCustomError(first.condition, 'OnlyBeneficiary');
    await factory.connect(bob).acceptWorkProject(first.ac.target);
    await expect(factory.connect(bob).acceptWorkProject(first.ac.target)).to.be.revertedWithCustomError(first.condition, 'AlreadyAccepted');
    await factory.connect(bob).vetoWorkProject(first.ac.target);
    expect(await first.condition.hasFailed()).to.equal(true);
    const scope = await factory.workBeneficiaryOf(first.ac.target);
    expect(await workRegistry.projectFor(hashWork(scope))).to.equal(ethers.ZeroAddress);
    expect(await workRegistry.projectFor(hashWork(scope, 'maintenance:october'))).to.equal(ethers.ZeroAddress);
    const token = await ethers.getContractAt('PremintingERC1155', first.token);
    await token.connect(initiator).setApprovalForAll(first.ac.target, true);
    await first.ac.connect(initiator).refundERC1155(initiator.address, first.token, [1n], [1n], '0x');
    const retry = await create(bob, bob);
    await expect(factory.releaseWorkOnFailure(first.ac.target)).to.be.revertedWithCustomError(workRegistry, 'StaleWorkRelease');
    expect(await workRegistry.projectFor(hashWork(scope))).to.equal(retry.ac.target);
  });

  it('expires fully funded but unaccepted proposals and prevents acceptance or success after expiry', async function () {
    const { factory, initiator, bob, deadline, create, fund } = await setup();
    const first = await create(initiator, bob);
    await fund(first);
    await ethers.provider.send('evm_setNextBlockTimestamp', [Number(deadline)]);
    await ethers.provider.send('evm_mine', []);
    expect(await first.condition.hasFailed()).to.equal(true);
    expect(await first.condition.hasSucceeded()).to.equal(false);
    await expect(factory.connect(bob).acceptWorkProject(first.ac.target)).to.be.revertedWithCustomError(first.condition, 'ProposalClosed');
    await factory.releaseWorkOnFailure(first.ac.target);
    const token = await ethers.getContractAt('PremintingERC1155', first.token);
    await token.connect(initiator).setApprovalForAll(first.ac.target, true);
    await first.ac.connect(initiator).refundERC1155(initiator.address, first.token, [1n], [1n], '0x');
  });

  it('keeps a fully funded wallet proposal pending through the veto boundary and permanent afterward', async function () {
    const { factory, workRegistry, initiator, bob, other, create, fund } = await setup();
    const first = await create(initiator, bob);
    await fund(first);
    await first.ac.connect(initiator).transferOwnership(other.address);
    await expect(factory.connect(other).acceptWorkProject(first.ac.target)).to.be.revertedWithCustomError(first.condition, 'OnlyBeneficiary');
    await factory.connect(bob).acceptWorkProject(first.ac.target);
    const end = Number(await first.condition.acceptedAt()) + 7 * DAY;
    await ethers.provider.send('evm_setNextBlockTimestamp', [end]);
    await ethers.provider.send('evm_mine', []);
    expect(await first.condition.hasSucceeded()).to.equal(false);
    await ethers.provider.send('evm_setNextBlockTimestamp', [end + 1]);
    await ethers.provider.send('evm_mine', []);
    expect(await first.condition.hasSucceeded()).to.equal(true);
    await expect(factory.connect(bob).vetoWorkProject(first.ac.target)).to.be.revertedWithCustomError(first.condition, 'VetoWindowExpired');
    await expect(create(other, bob)).to.be.revertedWithCustomError(workRegistry, 'WorkPermanentlyFunded');
    await first.ac.connect(bob).claim();
  });

  it('honors the full veto window and permanently fails acceptance that was too late', async function () {
    const { factory, initiator, bob, deadline, create, fund } = await setup();
    const first = await create(initiator, bob);
    await fund(first);
    await ethers.provider.send('evm_setNextBlockTimestamp', [Number(deadline) - DAY]);
    await factory.connect(bob).acceptWorkProject(first.ac.target);
    await ethers.provider.send('evm_setNextBlockTimestamp', [Number(deadline) + 8 * DAY]);
    await ethers.provider.send('evm_mine', []);
    expect(await first.condition.hasSucceeded()).to.equal(false);
    expect(await first.condition.hasFailed()).to.equal(true);
  });
});
