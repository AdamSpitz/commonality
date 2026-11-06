import hardhat from 'hardhat';
const { ethers } = hardhat;

export async function deployProjectFactory() {
  const tokenFactory = await ethers.deployContract('PremintingERC1155Factory');
  const assuranceFactory = await ethers.deployContract('AssuranceContractFactory');
  const conditionFactory = await ethers.deployContract('ValueThresholdConditionFactory');
  const verifier = await ethers.deployContract('MockBeneficiaryVerifier');
  const beneficiaryIdentity = await ethers.deployContract('BeneficiaryIdentity', [verifier.target]);
  const beneficiaryRegistry = await ethers.deployContract('BeneficiaryRegistry', [beneficiaryIdentity.target]);
  const fixedControllerFactory = await ethers.deployContract('FixedControllerFactory', [beneficiaryRegistry.target]);
  const paymentToken = await ethers.deployContract('FreeERC20', ['USD Coin', 'USDC', 6]);
  const beneficiaryEscrow = await ethers.deployContract('BeneficiaryEscrow', [beneficiaryRegistry.target, paymentToken.target]);
  const workRegistry = await ethers.deployContract('ContentRegistry');
  const projectFactory = await ethers.deployContract('ProjectFactory', [
    tokenFactory.target,
    assuranceFactory.target,
    conditionFactory.target,
    beneficiaryRegistry.target,
    beneficiaryEscrow.target,
    fixedControllerFactory.target,
    workRegistry.target,
  ]);
  await workRegistry.setRegistrar(projectFactory.target, true);
  return { projectFactory, workRegistry, assuranceFactory, conditionFactory, beneficiaryRegistry, beneficiaryEscrow, verifier, beneficiaryPaymentToken: paymentToken };
}

export function defaultProjectParams(owner, recipient, paymentToken, deadline) {
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

