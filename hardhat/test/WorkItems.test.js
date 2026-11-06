import { expect } from 'chai';
import hardhat from 'hardhat';

const { ethers } = hardhat;

async function deployRegistry() {
  const registry = await ethers.deployContract('ContentRegistry');
  const condition = await ethers.deployContract('MockWorkCondition');
  await registry.setRegistrar(await registry.owner(), true);
  return { registry, condition };
}

describe('work items', function () {
  it('reserves a batch atomically and rejects a second active request for the same id', async function () {
    const { registry, condition } = await deployRegistry();
    const project = ethers.Wallet.createRandom().address;
    await registry.registerWorks(
      ['concert:cedarvale:2026-10-08', 'maintenance:repo:2026-10'],
      project,
      condition.target,
      await registry.owner(),
    );
    await expect(registry.registerWorks(
      ['concert:cedarvale:2026-10-08'],
      ethers.Wallet.createRandom().address,
      condition.target,
      await registry.owner(),
    )).to.be.revertedWithCustomError(registry, 'ContentAlreadyRegistered');
    await expect(registry.registerWorks(
      ['maintenance:repo:2026-10', 'maintenance:repo:2026-10'],
      ethers.Wallet.createRandom().address,
      condition.target,
      await registry.owner(),
    )).to.be.revertedWithCustomError(registry, 'DuplicateWorkId');
  });

  it('keeps a failed request in history, allows one successful retry, and ignores a stale release', async function () {
    const { registry, condition } = await deployRegistry();
    const [creator] = await ethers.getSigners();
    const first = ethers.Wallet.createRandom().address;
    const second = ethers.Wallet.createRandom().address;
    const workId = 'concert:cedarvale:2026-10-08';
    await registry.registerWorks([workId], first, condition.target, creator.address);
    await condition.setOutcome(false, true);
    await registry.releaseWorks([workId], first);
    await expect(registry.releaseWorks([workId], first)).to.be.revertedWithCustomError(registry, 'StaleWorkRelease');

    await condition.setOutcome(false, false);
    await registry.registerWorks([workId], second, condition.target, creator.address);
    await condition.setOutcome(true, false);
    await expect(registry.releaseWorks([workId], second)).to.be.revertedWithCustomError(registry, 'WorkPermanentlyFunded');
    await expect(registry.registerWorks(
      [workId],
      ethers.Wallet.createRandom().address,
      condition.target,
      creator.address,
    )).to.be.revertedWithCustomError(registry, 'WorkPermanentlyFunded');
    expect(await registry.projectFor(ethers.keccak256(ethers.toUtf8Bytes(workId)))).to.equal(second);
  });

  it('rejects an unauthenticated registrar', async function () {
    const { registry, condition } = await deployRegistry();
    const [, stranger] = await ethers.getSigners();
    await expect(registry.connect(stranger).registerWorks(
      ['open-role:tutor:1'],
      stranger.address,
      condition.target,
      stranger.address,
    )).to.be.revertedWithCustomError(registry, 'UnauthorizedContentRegistrar');
  });
});
