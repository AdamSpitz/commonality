import { expect } from 'chai';
import hardhat from 'hardhat';
const { ethers } = hardhat;

describe('PaymentTokenRegistry', function () {
  it('keeps enumeration unique when a token is disallowed and allowed again', async function () {
    const [owner, token, otherToken] = await ethers.getSigners();
    const registry = await ethers.deployContract('PaymentTokenRegistry', [owner.address]);
    await registry.allow(token.address);
    await registry.disallow(token.address);
    await registry.allow(otherToken.address);
    await expect(registry.allow(token.address)).to.emit(registry, 'TokenAllowed').withArgs(token.address);
    expect(await registry.isAllowed(token.address)).to.equal(true);
    expect(await registry.tokenCount()).to.equal(2n);
    expect(await registry.tokenAt(0n)).to.equal(token.address);
    expect(await registry.tokenAt(1n)).to.equal(otherToken.address);
  });

  it('rejects a claim-ticket factory without an allowlist', async function () {
    const factory = await ethers.getContractFactory('ClaimTicketFactory');
    await expect(factory.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(factory, 'InvalidRegistry');
  });

  it('rejects disallowed tokens at the claim-ticket factory', async function () {
    const [owner, transit, token, erc1155] = await ethers.getSigners();
    const registry = await ethers.deployContract('PaymentTokenRegistry', [owner.address]);
    const factory = await ethers.deployContract('ClaimTicketFactory', [registry.target]);
    await expect(factory.create(owner.address, transit.address, token.address, erc1155.address, 'cid'))
      .to.be.revertedWithCustomError(factory, 'PaymentTokenNotAllowed').withArgs(token.address);
  });
});
