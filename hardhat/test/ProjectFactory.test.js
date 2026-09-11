import { expect } from 'chai';
import hardhat from 'hardhat';

const { ethers } = hardhat;

async function deployProjectFactory() {
  const tokenFactory = await ethers.deployContract('PremintingERC1155Factory');
  const assuranceFactory = await ethers.deployContract('AssuranceContractFactory');
  const conditionFactory = await ethers.deployContract('ValueThresholdConditionFactory');
  const verifier = await ethers.deployContract('MockBeneficiaryVerifier');
  const beneficiaryRegistry = await ethers.deployContract('BeneficiaryRegistry', [verifier.target]);
  const paymentToken = await ethers.deployContract('FreeERC20', ['USD Coin', 'USDC', 6]);
  const beneficiaryEscrow = await ethers.deployContract('BeneficiaryEscrow', [beneficiaryRegistry.target, paymentToken.target]);
  const projectFactory = await ethers.deployContract('ProjectFactory', [
    tokenFactory.target,
    assuranceFactory.target,
    conditionFactory.target,
    beneficiaryRegistry.target,
    beneficiaryEscrow.target,
  ]);
  return { projectFactory, assuranceFactory, conditionFactory, beneficiaryRegistry, beneficiaryEscrow, verifier, beneficiaryPaymentToken: paymentToken };
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
      factory.deploy(ethers.ZeroAddress, dependency.target, dependency.target, dependency.target, dependency.target),
    ).to.be.revertedWithCustomError(factory, 'InvalidFactoryAddress');
  });

  it('routes an unclaimed beneficiary project through shared escrow', async function () {
    const [creator, owner] = await ethers.getSigners();
    const { projectFactory, beneficiaryRegistry, beneficiaryEscrow, verifier, beneficiaryPaymentToken: paymentToken } = await deployProjectFactory();
    const deadline = BigInt((await ethers.provider.getBlock('latest')).timestamp + 3600);
    const beneficiaryId = ethers.keccak256(ethers.toUtf8Bytes('dns:example.org'));

    const args = defaultProjectParams(owner.address, ethers.ZeroAddress, paymentToken.target, deadline);
    const tx = await projectFactory.connect(creator).createERC1155AndAssuranceContractForBeneficiary(
      args[0], args[1], args[2], beneficiaryId, ...args.slice(4),
    );
    const receipt = await tx.wait();
    const event = receipt.logs.map(log => { try { return projectFactory.interface.parseLog(log); } catch { return null; } })
      .find(log => log?.name === 'ProjectCreated');
    const assurance = await ethers.getContractAt('BeneficiaryAssuranceContract', event.args.assuranceContract);

    expect(await assurance.beneficiaryId()).to.equal(beneficiaryId);
    expect(await assurance.recipient()).to.equal(beneficiaryEscrow.target);
    expect(await assurance.recipientIsEscrow()).to.equal(true);

    const token = await ethers.getContractAt('PremintingERC1155', event.args.token);
    await paymentToken.connect(creator).mint(105n);
    await paymentToken.connect(creator).approve(assurance.target, 105n);
    await assurance.connect(creator).buyERC1155(creator.address, token.target, [2n], [15n], '0x');
    await assurance.withdrawToBeneficiaryEscrow();
    expect(await beneficiaryEscrow.balance(beneficiaryId)).to.equal(105n);

    await verifier.setValid(true);
    const nonce = ethers.keccak256(ethers.toUtf8Bytes('project-factory-beneficiary-claim'));
    const proofHash = ethers.keccak256(ethers.toUtf8Bytes('https://example.org/.well-known/commonality-claim.json'));
    await beneficiaryRegistry.verifyBeneficiary(beneficiaryId, owner.address, nonce, deadline, proofHash, '0x');
    await beneficiaryEscrow.connect(owner).withdraw(beneficiaryId);
    expect(await paymentToken.balanceOf(owner.address)).to.equal(105n);
  });

  it('rejects a beneficiary project using a token unsupported by the escrow', async function () {
    const [, owner] = await ethers.getSigners();
    const unsupportedToken = await ethers.deployContract('FreeERC20', ['Other', 'OTHER', 6]);
    const { projectFactory } = await deployProjectFactory();
    const deadline = BigInt((await ethers.provider.getBlock('latest')).timestamp + 3600);
    const args = defaultProjectParams(owner.address, ethers.ZeroAddress, unsupportedToken.target, deadline);

    await expect(projectFactory.createERC1155AndAssuranceContractForBeneficiary(
      args[0], args[1], args[2], ethers.keccak256(ethers.toUtf8Bytes('dns:example.org')), ...args.slice(4),
    )).to.be.revertedWithCustomError(projectFactory, 'BeneficiaryPaymentTokenMismatch');
  });

  it('lets anyone create for a verified but not-controlled beneficiary', async function () {
    const [creator, owner] = await ethers.getSigners();
    const { projectFactory, beneficiaryRegistry, verifier, beneficiaryPaymentToken: paymentToken } = await deployProjectFactory();
    const deadline = BigInt((await ethers.provider.getBlock('latest')).timestamp + 3600);
    const beneficiaryId = ethers.keccak256(ethers.toUtf8Bytes('dns:example.org'));
    await verifier.setValid(true);
    await beneficiaryRegistry.verifyBeneficiary(
      beneficiaryId,
      owner.address,
      ethers.keccak256(ethers.toUtf8Bytes('verified-not-controlled')),
      deadline,
      ethers.keccak256(ethers.toUtf8Bytes('https://example.org/.well-known/commonality-claim.json')),
      '0x',
    );

    const args = defaultProjectParams(owner.address, ethers.ZeroAddress, paymentToken.target, deadline);
    await expect(projectFactory.connect(creator).createERC1155AndAssuranceContractForBeneficiary(
      args[0], args[1], args[2], beneficiaryId, ...args.slice(4),
    )).to.emit(projectFactory, 'ProjectCreated');
  });

  it('blocks third-party creation once the beneficiary has taken control', async function () {
    const [creator, owner] = await ethers.getSigners();
    const { projectFactory, beneficiaryRegistry, verifier, beneficiaryPaymentToken: paymentToken } = await deployProjectFactory();
    const deadline = BigInt((await ethers.provider.getBlock('latest')).timestamp + 3600);
    const beneficiaryId = ethers.keccak256(ethers.toUtf8Bytes('dns:example.org'));
    await verifier.setValid(true);
    await beneficiaryRegistry.verifyBeneficiary(
      beneficiaryId,
      owner.address,
      ethers.keccak256(ethers.toUtf8Bytes('controlled-claim')),
      deadline,
      ethers.keccak256(ethers.toUtf8Bytes('https://example.org/.well-known/commonality-claim.json')),
      '0x',
    );
    await beneficiaryRegistry.connect(owner).takeBeneficiaryControl(beneficiaryId);

    const args = defaultProjectParams(owner.address, ethers.ZeroAddress, paymentToken.target, deadline);
    await expect(projectFactory.connect(creator).createERC1155AndAssuranceContractForBeneficiary(
      args[0], args[1], args[2], beneficiaryId, ...args.slice(4),
    )).to.be.revertedWithCustomError(projectFactory, 'OnlyPayoutAddressCanCreateForControlledBeneficiary');

    await expect(projectFactory.connect(owner).createERC1155AndAssuranceContractForBeneficiary(
      args[0], args[1], args[2], beneficiaryId, ...args.slice(4),
    )).to.emit(projectFactory, 'ProjectCreated');
  });

  it('lets the payout wallet disavow and later withdraw disavowal of a beneficiary project', async function () {
    const [creator, owner, other] = await ethers.getSigners();
    const { projectFactory, beneficiaryRegistry, verifier, beneficiaryPaymentToken: paymentToken } = await deployProjectFactory();
    const deadline = BigInt((await ethers.provider.getBlock('latest')).timestamp + 3600);
    const beneficiaryId = ethers.keccak256(ethers.toUtf8Bytes('dns:example.org'));
    await verifier.setValid(true);
    await beneficiaryRegistry.verifyBeneficiary(
      beneficiaryId,
      owner.address,
      ethers.keccak256(ethers.toUtf8Bytes('disavow-claim')),
      deadline,
      ethers.keccak256(ethers.toUtf8Bytes('https://example.org/.well-known/commonality-claim.json')),
      '0x',
    );

    const args = defaultProjectParams(owner.address, ethers.ZeroAddress, paymentToken.target, deadline);
    const tx = await projectFactory.connect(creator).createERC1155AndAssuranceContractForBeneficiary(
      args[0], args[1], args[2], beneficiaryId, ...args.slice(4),
    );
    const receipt = await tx.wait();
    const event = receipt.logs.map(log => { try { return projectFactory.interface.parseLog(log); } catch { return null; } })
      .find(log => log?.name === 'ProjectCreated');
    const project = event.args.assuranceContract;

    await expect(beneficiaryRegistry.connect(other).disavowProject(beneficiaryId, project))
      .to.be.revertedWithCustomError(beneficiaryRegistry, 'OnlyPayoutAddressCanDisavowProject');
    await expect(beneficiaryRegistry.connect(owner).disavowProject(beneficiaryId, ethers.ZeroAddress))
      .to.be.revertedWithCustomError(beneficiaryRegistry, 'InvalidProjectAddress');
    await expect(beneficiaryRegistry.connect(owner).disavowProject(beneficiaryId, paymentToken.target))
      .to.be.revertedWithCustomError(beneficiaryRegistry, 'ProjectNotForBeneficiary')
      .withArgs(beneficiaryId, paymentToken.target);

    await expect(beneficiaryRegistry.connect(owner).disavowProject(beneficiaryId, project))
      .to.emit(beneficiaryRegistry, 'ProjectDisavowed')
      .withArgs(beneficiaryId, project, owner.address);
    expect(await beneficiaryRegistry.isProjectDisavowed(beneficiaryId, project)).to.equal(true);

    await expect(beneficiaryRegistry.connect(owner).disavowProject(beneficiaryId, project))
      .to.be.revertedWithCustomError(beneficiaryRegistry, 'ProjectAlreadyDisavowed')
      .withArgs(beneficiaryId, project);

    await expect(beneficiaryRegistry.connect(owner).withdrawProjectDisavowal(beneficiaryId, project))
      .to.emit(beneficiaryRegistry, 'ProjectDisavowalWithdrawn')
      .withArgs(beneficiaryId, project, owner.address);
    expect(await beneficiaryRegistry.isProjectDisavowed(beneficiaryId, project)).to.equal(false);
  });
});
