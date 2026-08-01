import { expect } from 'chai';
import hardhat from 'hardhat';

const { ethers } = hardhat;

async function deployProjectFactory() {
  const tokenFactory = await ethers.deployContract('PremintingERC1155Factory');
  const assuranceFactory = await ethers.deployContract('AssuranceContractFactory');
  const conditionFactory = await ethers.deployContract('ValueThresholdConditionFactory');
  const projectFactory = await ethers.deployContract('ProjectFactory', [
    tokenFactory.target,
    assuranceFactory.target,
    conditionFactory.target,
  ]);
  return { projectFactory, assuranceFactory, conditionFactory };
}

function defaultProjectParams(owner, recipient, paymentToken, deadline) {
  return [
    'ipfs://tokens/{id}.json',
    'ipfs://contract.json',
    owner,
    recipient,
    paymentToken,
    100n,
    deadline,
    'bafyproject',
    [1n, 2n],
    [10n, 20n],
    [5n, 7n],
  ];
}

describe('ProjectFactory', function () {
  it('creates and fully wires a threshold project', async function () {
    const [creator, owner, recipient] = await ethers.getSigners();
    const paymentToken = await ethers.deployContract('FreeERC20', ['USD Coin', 'USDC', 6]);
    const { projectFactory, assuranceFactory, conditionFactory } = await deployProjectFactory();
    const deadline = BigInt((await ethers.provider.getBlock('latest')).timestamp + 3600);

    const tx = await projectFactory
      .connect(creator)
      .createERC1155AndAssuranceContract(
        ...defaultProjectParams(owner.address, recipient.address, paymentToken.target, deadline),
      );
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log) => {
        try {
          return projectFactory.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((log) => log?.name === 'ProjectCreated');

    expect(event.args.creator).to.equal(creator.address);
    const token = await ethers.getContractAt('PremintingERC1155', event.args.token);
    const assurance = await ethers.getContractAt(
      'MultiERC1155AssuranceContract',
      event.args.assuranceContract,
    );
    const condition = await ethers.getContractAt('ValueThresholdCondition', event.args.condition);

    expect(await assurance.owner()).to.equal(owner.address);
    expect(await assurance.paymentToken()).to.equal(paymentToken.target);
    expect(await token.balanceOf(assurance.target, 1n)).to.equal(10n);
    expect(await token.balanceOf(assurance.target, 2n)).to.equal(20n);
    expect(await token.owner()).to.equal(ethers.ZeroAddress);
    expect(await token.isReceiptTransferBridge(assurance.target)).to.equal(true);
    expect(await assuranceFactory.isDeployedAssurance(assurance.target)).to.equal(true);
    expect(await conditionFactory.isDeployedCondition(condition.target)).to.equal(true);
  });

  it('rejects unsafe project parameters before deployment', async function () {
    const [, owner, recipient] = await ethers.getSigners();
    const paymentToken = await ethers.deployContract('FreeERC20', ['USD Coin', 'USDC', 6]);
    const { projectFactory } = await deployProjectFactory();
    const deadline = BigInt((await ethers.provider.getBlock('latest')).timestamp + 3600);
    const valid = defaultProjectParams(owner.address, recipient.address, paymentToken.target, deadline);

    await expect(
      projectFactory.createERC1155AndAssuranceContract(...valid.toSpliced(2, 1, ethers.ZeroAddress)),
    ).to.be.revertedWithCustomError(projectFactory, 'InvalidOwnerAddress');
    await expect(
      projectFactory.createERC1155AndAssuranceContract(...valid.toSpliced(5, 1, 0n)),
    ).to.be.revertedWithCustomError(projectFactory, 'InvalidThreshold');
    await expect(
      projectFactory.createERC1155AndAssuranceContract(...valid.toSpliced(8, 1, [])),
    ).to.be.revertedWithCustomError(projectFactory, 'EmptyTokenList');
    await expect(
      projectFactory.createERC1155AndAssuranceContract(...valid.toSpliced(10, 1, [5n, 0n])),
    ).to.be.revertedWithCustomError(projectFactory, 'ZeroPrice');
  });

  it('rejects zero factory dependencies', async function () {
    const factory = await ethers.getContractFactory('ProjectFactory');
    const dependency = await ethers.deployContract('PremintingERC1155Factory');

    await expect(
      factory.deploy(ethers.ZeroAddress, dependency.target, dependency.target),
    ).to.be.revertedWithCustomError(factory, 'InvalidFactoryAddress');
  });
});
