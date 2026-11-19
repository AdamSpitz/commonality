import hardhat from 'hardhat';
const { ethers } = hardhat;

export async function deployProjectFactory() {
  const tokenFactory = await ethers.deployContract('PremintingERC1155Factory');
  const paymentToken = await ethers.deployContract('FreeERC20', ['USD Coin', 'USDC', 6]);
  const [deployer] = await ethers.getSigners();
  const paymentTokenRegistry = await ethers.deployContract('PaymentTokenRegistry', [deployer.address]);
  await paymentTokenRegistry.allow(paymentToken.target);
  const assuranceFactory = await ethers.deployContract('AssuranceContractFactory');
  const conditionFactory = await ethers.deployContract('ValueThresholdConditionFactory');
  const verifier = await ethers.deployContract('MockBeneficiaryVerifier');
  const beneficiaryIdentity = await ethers.deployContract('BeneficiaryIdentity', [verifier.target]);
  const beneficiaryRegistry = await ethers.deployContract('BeneficiaryRegistry', [beneficiaryIdentity.target]);
  const fixedControllerFactory = await ethers.deployContract('FixedControllerFactory', [beneficiaryRegistry.target, paymentTokenRegistry.target]);
  const beneficiaryEscrow = await ethers.deployContract('BeneficiaryEscrow', [beneficiaryRegistry.target]);
  const workRegistry = await ethers.deployContract('ContentRegistry');
  const claimTicketFactory = await ethers.deployContract('ClaimTicketFactory', [paymentTokenRegistry.target]);
  const projectFactory = await ethers.deployContract('ProjectFactory', [
    tokenFactory.target,
    assuranceFactory.target,
    conditionFactory.target,
    beneficiaryRegistry.target,
    beneficiaryEscrow.target,
    fixedControllerFactory.target,
    workRegistry.target,
    claimTicketFactory.target,
  ]);
  await workRegistry.setRegistrar(projectFactory.target, true);
  return { projectFactory, workRegistry, assuranceFactory, conditionFactory, beneficiaryRegistry, beneficiaryEscrow, verifier, beneficiaryPaymentToken: paymentToken, paymentTokenRegistry };
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

