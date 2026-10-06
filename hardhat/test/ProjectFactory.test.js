import { expect } from 'chai';
import hardhat from 'hardhat';

const { ethers } = hardhat;

async function deployProjectFactory() {
  const tokenFactory = await ethers.deployContract('PremintingERC1155Factory');
  const assuranceFactory = await ethers.deployContract('AssuranceContractFactory');
  const conditionFactory = await ethers.deployContract('ValueThresholdConditionFactory');
  const verifier = await ethers.deployContract('MockBeneficiaryVerifier');
  const beneficiaryIdentity = await ethers.deployContract('BeneficiaryIdentity', [verifier.target]);
  const beneficiaryRegistry = await ethers.deployContract('BeneficiaryRegistry', [beneficiaryIdentity.target]);
  const fixedControllerFactory = await ethers.deployContract('FixedControllerFactory', [beneficiaryRegistry.target]);
  const paymentToken = await ethers.deployContract('FreeERC20', ['USD Coin', 'USDC', 6]);
  const beneficiaryEscrow = await ethers.deployContract('BeneficiaryEscrow', [beneficiaryRegistry.target, paymentToken.target]);
  const projectFactory = await ethers.deployContract('ProjectFactory', [
    tokenFactory.target,
    assuranceFactory.target,
    conditionFactory.target,
    beneficiaryRegistry.target,
    beneficiaryEscrow.target,
    fixedControllerFactory.target,
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
  it('creates isolated receipt-token clones and initializes each exactly once', async function () {
    const [owner, other] = await ethers.getSigners();
    const factory = await ethers.deployContract('PremintingERC1155Factory');
    const implementation = await factory.implementation();
    const firstTx = await factory.createPremintingERC1155(owner.address, 'ipfs://first/{id}', 'ipfs://first-contract');
    const secondTx = await factory.createPremintingERC1155(other.address, 'ipfs://second/{id}', 'ipfs://second-contract');
    const created = async (tx) => {
      const receipt = await tx.wait();
      const event = receipt.logs.map(log => { try { return factory.interface.parseLog(log); } catch { return null; } })
        .find(log => log?.name === 'LazyGivingERC1155ContractCreated');
      return ethers.getContractAt('PremintingERC1155Clone', event.args.erc1155);
    };
    const first = await created(firstTx);
    const second = await created(secondTx);

    expect(first.target).to.not.equal(second.target);
    expect(await ethers.provider.getCode(first.target)).to.contain(implementation.slice(2).toLowerCase());
    expect(await first.owner()).to.equal(owner.address);
    expect(await first.uri(1n)).to.equal('ipfs://first/{id}');
    expect(await first.contractURI()).to.equal('ipfs://first-contract');
    expect(await second.owner()).to.equal(other.address);
    expect(await second.uri(1n)).to.equal('ipfs://second/{id}');
    await first.connect(owner).mintBatch(owner.address, [1n], [2n]);
    expect(await second.balanceOf(owner.address, 1n)).to.equal(0n);
    await expect(first.initialize(other.address, 'evil', 'evil')).to.be.revertedWithCustomError(first, 'AlreadyInitialized');
    await expect(second.initialize(owner.address, 'evil', 'evil')).to.be.revertedWithCustomError(second, 'AlreadyInitialized');
    await first.connect(owner).renounceOwnership();
    await expect(first.initialize(other.address, 'evil', 'evil')).to.be.revertedWithCustomError(first, 'AlreadyInitialized');
    const implementationToken = await ethers.getContractAt('PremintingERC1155Clone', implementation);
    await expect(implementationToken.initialize(owner.address, 'evil', 'evil'))
      .to.be.revertedWithCustomError(implementationToken, 'AlreadyInitialized');
    await expect(factory.createPremintingERC1155(ethers.ZeroAddress, '', '')).to.be.reverted;

    const direct = await created(await factory.createPremintingERC1155Direct(
      owner.address, 'ipfs://direct/{id}', 'ipfs://direct-contract',
    ));
    expect(await direct.owner()).to.equal(owner.address);
    expect(await direct.uri(1n)).to.equal('ipfs://direct/{id}');
    expect(await direct.contractURI()).to.equal('ipfs://direct-contract');
    expect(await ethers.provider.getCode(direct.target)).to.not.contain(implementation.slice(2).toLowerCase());
  });

  it('creates and fully wires a threshold project', async function () {
    const [creator, owner, recipient] = await ethers.getSigners();
    const paymentToken = await ethers.deployContract('FreeERC20', ['USD Coin', 'USDC', 6]);
    const { projectFactory, conditionFactory } = await deployProjectFactory();
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
      'FixedControllerAssuranceContract',
      event.args.assuranceContract,
    );
    const condition = await ethers.getContractAt('ValueThresholdCondition', event.args.condition);

    expect(await assurance.owner()).to.equal(owner.address);
    expect(await assurance.paymentToken()).to.equal(paymentToken.target);
    expect(await token.balanceOf(assurance.target, 1n)).to.equal(10n);
    expect(await token.balanceOf(assurance.target, 2n)).to.equal(20n);
    expect(await token.owner()).to.equal(ethers.ZeroAddress);
    expect(await token.isReceiptTransferBridge(assurance.target)).to.equal(true);
    expect(await assurance.fixedPayout()).to.equal(recipient.address);
    expect(await assurance.unclaimedProceedsWindow()).to.equal(90n * 24n * 60n * 60n);
    expect(await conditionFactory.isDeployedCondition(condition.target)).to.equal(true);
  });

  it('lets a fixed recipient refuse and contributors reclaim immediately after success', async function () {
    const [contributor, owner, recipient, other] = await ethers.getSigners();
    const paymentToken = await ethers.deployContract('FreeERC20', ['USD Coin', 'USDC', 6]);
    const { projectFactory } = await deployProjectFactory();
    const deadline = BigInt((await ethers.provider.getBlock('latest')).timestamp + 3600);
    const args = defaultProjectParams(owner.address, recipient.address, paymentToken.target, deadline);
    args[5] = 5n;
    const tx = await projectFactory.createERC1155AndAssuranceContract(...args);
    const receipt = await tx.wait();
    const event = receipt.logs.map(log => { try { return projectFactory.interface.parseLog(log); } catch { return null; } })
      .find(log => log?.name === 'ProjectCreated');
    const assurance = await ethers.getContractAt('FixedControllerAssuranceContract', event.args.assuranceContract);
    const token = await ethers.getContractAt('PremintingERC1155', event.args.token);
    await paymentToken.mint(5n);
    await paymentToken.approve(assurance.target, 5n);
    await assurance.buyERC1155(contributor.address, token.target, [1n], [1n], '0x');
    await expect(assurance.connect(other).refuse()).to.be.revertedWithCustomError(assurance, 'NotPayoutAddress');
    await expect(assurance.connect(recipient).withdraw()).to.be.revertedWithCustomError(assurance, 'UseClaim');
    await assurance.connect(recipient).refuse();
    await assurance.connect(contributor).reclaimUnclaimedShare();
    expect(await paymentToken.balanceOf(contributor.address)).to.equal(5n);
  });

  it('opens unclaimed fixed-recipient funds 90 days after success is noted', async function () {
    const [contributor, owner, recipient] = await ethers.getSigners();
    const paymentToken = await ethers.deployContract('FreeERC20', ['USD Coin', 'USDC', 6]);
    const { projectFactory } = await deployProjectFactory();
    const deadline = BigInt((await ethers.provider.getBlock('latest')).timestamp + 3600);
    const args = defaultProjectParams(owner.address, recipient.address, paymentToken.target, deadline);
    args[5] = 5n;
    const receipt = await (await projectFactory.createERC1155AndAssuranceContract(...args)).wait();
    const event = receipt.logs.map(log => { try { return projectFactory.interface.parseLog(log); } catch { return null; } })
      .find(log => log?.name === 'ProjectCreated');
    const assurance = await ethers.getContractAt('FixedControllerAssuranceContract', event.args.assuranceContract);
    const token = await ethers.getContractAt('PremintingERC1155', event.args.token);
    await paymentToken.mint(5n);
    await paymentToken.approve(assurance.target, 5n);
    await assurance.buyERC1155(contributor.address, token.target, [1n], [1n], '0x');
    await assurance.noteSuccess();
    await expect(assurance.reclaimUnclaimedShare()).to.be.revertedWithCustomError(assurance, 'ClaimWindowStillOpen');
    await ethers.provider.send('evm_increaseTime', [90 * 24 * 60 * 60]);
    await ethers.provider.send('evm_mine', []);
    await expect(assurance.connect(recipient).claim()).to.be.revertedWithCustomError(assurance, 'ClaimWindowElapsed');
    await assurance.reclaimUnclaimedShare();
    expect(await paymentToken.balanceOf(contributor.address)).to.equal(5n);
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
      factory.deploy(ethers.ZeroAddress, dependency.target, dependency.target, dependency.target, dependency.target, dependency.target),
    ).to.be.revertedWithCustomError(factory, 'InvalidFactoryAddress');
  });

  it('keeps beneficiary proceeds in the project until that payout address claims', async function () {
    const [creator, owner, other] = await ethers.getSigners();
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
    expect(await assurance.recipient()).to.equal(assurance.target);
    expect(await beneficiaryEscrow.balance(beneficiaryId)).to.equal(0n);

    const token = await ethers.getContractAt('PremintingERC1155', event.args.token);
    await paymentToken.connect(creator).mint(105n);
    await paymentToken.connect(creator).approve(assurance.target, 105n);
    await assurance.connect(creator).buyERC1155(creator.address, token.target, [2n], [15n], '0x');
    await expect(assurance.withdraw()).to.be.revertedWithCustomError(assurance, 'UseClaim');
    await expect(assurance.connect(other).claim()).to.be.revertedWithCustomError(assurance, 'NotPayoutAddress');

    await verifier.setValid(true);
    const nonce = ethers.keccak256(ethers.toUtf8Bytes('project-factory-beneficiary-claim'));
    const proofHash = ethers.keccak256(ethers.toUtf8Bytes('https://example.org/.well-known/commonality-claim.json'));
    await beneficiaryRegistry.verifyBeneficiary(beneficiaryId, owner.address, nonce, deadline, proofHash, '0x');
    await assurance.connect(owner).claim();
    expect(await paymentToken.balanceOf(owner.address)).to.equal(105n);
    expect(await beneficiaryEscrow.balance(beneficiaryId)).to.equal(0n);
  });

  it('accepts a beneficiary project in a token other than the legacy escrow token', async function () {
    const [, owner] = await ethers.getSigners();
    const otherToken = await ethers.deployContract('FreeERC20', ['Other', 'OTHER', 6]);
    const { projectFactory } = await deployProjectFactory();
    const deadline = BigInt((await ethers.provider.getBlock('latest')).timestamp + 3600);
    const args = defaultProjectParams(owner.address, ethers.ZeroAddress, otherToken.target, deadline);

    await expect(projectFactory.createERC1155AndAssuranceContractForBeneficiary(
      args[0], args[1], args[2], ethers.keccak256(ethers.toUtf8Bytes('dns:example.org')), ...args.slice(4),
    )).to.emit(projectFactory, 'ProjectCreated');
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
    const tx = await projectFactory.connect(creator).createERC1155AndAssuranceContractForBeneficiary(
      args[0], args[1], args[2], beneficiaryId, ...args.slice(4),
    );
    await expect(tx).to.emit(projectFactory, 'ProjectCreated');
    const receipt = await tx.wait();
    const event = receipt.logs.map(log => { try { return projectFactory.interface.parseLog(log); } catch { return null; } })
      .find(log => log?.name === 'ProjectCreated');
    const fixed = await ethers.getContractAt('FixedControllerAssuranceContract', event.args.assuranceContract);
    expect(await fixed.beneficiaryId()).to.equal(beneficiaryId);
    expect(await fixed.recipient()).to.equal(owner.address);
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
