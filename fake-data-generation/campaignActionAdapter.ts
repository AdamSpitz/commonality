import type { Address, Hex, PublicClient } from 'viem';
import { parseEther, parseUnits } from 'viem';
import {
  AlignmentAttestationsAbi,
  BeliefsAbi,
  DelegatableNotesAbi,
  ImplicationsAbi,
  MutableRefUpdaterAbi,
  ProjectFactoryAbi,
  PublishedDataAbi,
  AssuranceContractAbi,
} from '@commonality/sdk/abis';
import { believeStatement, disbelieveStatement, attestImplication } from '@commonality/sdk/conceptspace';
import { depositETH, delegateNote, revokeNote } from '@commonality/sdk/delegation';
import { createDefaultDocumentStore, createDisplayableDocument, createStatement } from '@commonality/sdk/displayable-documents';
import { attestAlignment, PROJECT_ALIGNMENT_TOPIC, toSubjectId } from '@commonality/sdk/fundingportals';
import { buyProjectTokens, createProject, getProject } from '@commonality/sdk/lazy-giving';
import { createSDKMachinery } from '@commonality/sdk/machinery';
import { updateRef } from '@commonality/sdk/mutable-refs';
import { createIPFSConfigInNodeJSFromTheUsualEnvVars } from '@commonality/sdk/node';
import type { IpfsCidV1, WriteClients } from '@commonality/sdk/utils';
import type { CampaignContracts, CampaignWalletBinding } from './campaignEnvironment.js';
import type { CampaignExecutionAdapter, CampaignReceipt } from './campaignExecutor.js';
import type { CampaignPlan, PlannedAction, PlannedProject } from './campaignPlanner.js';
import type { CampaignRuntimeBindings } from './campaignRuntimeBindings.js';
import { writeRuntimeBindings } from './campaignRuntimeBindings.js';
import { buildSeedRosterDocument } from './seedCauseRoster.js';
import { createSeedClients } from './seedRpc.js';
import { campaignFundProjectCost, getPaymentTokenDecimals } from './paymentTokenUnits.js';

const GAS_UNITS: Record<PlannedAction['type'], bigint> = {
  'publish-statement': 180_000n, 'create-cause': 120_000n, 'set-belief': 90_000n,
  'attest-implication': 130_000n, 'create-project': 1_100_000n, 'attest-alignment': 130_000n,
  'fund-project': 180_000n, 'deposit-note': 150_000n, 'delegate-note': 100_000n, 'revoke-delegation': 90_000n,
};

export interface CampaignSubmittedWrite {
  hash: Hex;
  statementCid?: IpfsCidV1;
  cause?: { owner: Address; refName: string; rosterCid: IpfsCidV1 };
  project?: { assurance: Address; token: Address };
  note?: { contractAddress: Address; noteId: string };
}

export interface CampaignActionWriter {
  submit(action: PlannedAction, actor: WriteClients): Promise<CampaignSubmittedWrite>;
}

export function classifyCampaignError(error: unknown): { retryable: boolean; category: string; message: string } {
  const message = error instanceof Error ? error.message : String(error);
  const retryable = /rate limit|429|timeout|ECONNRESET|nonce too low|replacement/i.test(message);
  const category = /revert|execution reverted/i.test(message) ? 'contract-revert' : retryable ? 'rpc' : 'adapter';
  return { retryable, category, message };
}

function requireBound<T>(value: T | undefined, label: string): T {
  if (value === undefined || value === null || value === '') throw new Error(`campaign action is missing runtime binding for ${label}`);
  return value;
}

export function applySubmittedBindings(bindings: CampaignRuntimeBindings, action: PlannedAction, write: CampaignSubmittedWrite, actor: Address, now: Date): void {
  bindings.updatedAt = now.toISOString();
  if (action.actorUserId) bindings.users[action.actorUserId] = actor;
  if (action.statementId && write.statementCid) bindings.statements[action.statementId] = write.statementCid;
  if (action.causeId && write.cause) bindings.causes[action.causeId] = write.cause;
  if (action.projectId && write.project) bindings.projects[action.projectId] = write.project.assurance;
  if (action.noteId && write.note) bindings.notes[action.noteId] = write.note;
}

export function createCampaignContractAdapter(input: {
  plan: CampaignPlan;
  contracts: CampaignContracts;
  wallets: readonly CampaignWalletBinding[];
  publisher: CampaignWalletBinding;
  bindings: CampaignRuntimeBindings;
  writer: CampaignActionWriter;
  getReceipt: (hash: Hex) => Promise<CampaignReceipt | null>;
  persistBindings?: (bindings: CampaignRuntimeBindings) => Promise<void>;
  clientsFor?: (wallet: CampaignWalletBinding) => WriteClients;
  gasPrice?: bigint;
  now?: () => Date;
}): CampaignExecutionAdapter {
  const wallets = new Map(input.wallets.map((wallet) => [wallet.walletSlot, wallet]));
  const users = new Map(input.plan.users.map((user) => [user.id, user]));
  const projectTokens = new Map<string, Address>();
  const gasPrice = input.gasPrice ?? 1_000_000_000n;
  const now = input.now ?? (() => new Date());
  const clientsFor = input.clientsFor ?? ((wallet: CampaignWalletBinding) => createSeedClients(wallet.privateKey) as WriteClients);

  const actorFor = (action: PlannedAction): CampaignWalletBinding => {
    if (!action.actorUserId) return input.publisher;
    const user = requireBound(users.get(action.actorUserId), `user ${action.actorUserId}`);
    return requireBound(wallets.get(user.walletSlot), `wallet ${user.walletSlot}`);
  };

  return {
    estimateNativeCost: async (action) => GAS_UNITS[action.type] * gasPrice,
    classifyError: classifyCampaignError,
    getReceipt: input.getReceipt,
    async submit(action) {
      const wallet = actorFor(action);
      const clients = clientsFor(wallet);
      const write = await input.writer.submit(action, clients);
      applySubmittedBindings(input.bindings, action, write, clients.account, now());
      if (write.project) projectTokens.set(action.projectId!, write.project.token);
      await input.persistBindings?.(input.bindings);
      return write.hash;
    },
  };
}

export function createLiveCampaignActionWriter(input: {
  plan: CampaignPlan;
  contracts: CampaignContracts;
  bindings: CampaignRuntimeBindings;
  projectTokens?: Map<string, Address>;
}): CampaignActionWriter {
  const machinery = createSDKMachinery({
    ipfsConfig: createIPFSConfigInNodeJSFromTheUsualEnvVars(),
    eventCacheUrl: process.env.EVENT_CACHE_URL ?? 'http://localhost:42069',
  });
  const statements = new Map(input.plan.statements.map((item) => [item.id, item]));
  const projects = new Map(input.plan.projects.map((item) => [item.id, item]));
  const projectTokens = input.projectTokens ?? new Map<string, Address>();
  const notesContract = { address: input.contracts.delegatableNotes, abi: DelegatableNotesAbi };
  const decimals = getPaymentTokenDecimals();

  const statementCid = (id: string | undefined): IpfsCidV1 => requireBound(input.bindings.statements[requireBound(id, 'statement id')], `statement CID ${id}`);
  const projectAddress = (id: string | undefined): Address => requireBound(input.bindings.projects[requireBound(id, 'project id')], `project ${id}`);
  const storeFor = (clients: WriteClients) => createDefaultDocumentStore(machinery, {
    clients,
    publishedDataContract: { address: input.contracts.publishedData, abi: PublishedDataAbi },
  });
  const noteAmount = (action: PlannedAction) => parseEther((Math.max(1, action.amount ?? 1) / 100_000).toString());

  const handlers: Record<PlannedAction['type'], (action: PlannedAction, clients: WriteClients) => Promise<CampaignSubmittedWrite>> = {
    async 'publish-statement'(action, clients) {
      const planned = requireBound(statements.get(action.statementId!), `statement ${action.statementId}`);
      const publication = await storeFor(clients).publish(createStatement({
        content: planned.text, topic: planned.causeId, extras: { campaign: input.plan.campaignId, synthetic: true },
      }));
      return { hash: publication.txHash, statementCid: publication.cid };
    },
    async 'create-cause'(action, clients) {
      const plankCids = input.plan.statements.filter((item) => item.causeId === action.causeId).map((item) => statementCid(item.id));
      const title = action.causeId ?? 'campaign-cause';
      const rosterCid = (await storeFor(clients).publish(buildSeedRosterDocument({
        title, summary: `SYNTHETIC TESTNET CAMPAIGN cause ${title}`, plankCids, mediatorBlurb: '',
      }))).cid;
      const refName = `campaign-${input.plan.campaignId}-${action.causeId}`;
      const hash = await updateRef(clients, { address: input.contracts.mutableRefUpdater, abi: MutableRefUpdaterAbi }, refName, rosterCid);
      return { hash, cause: { owner: clients.account, refName, rosterCid } };
    },
    async 'set-belief'(action, clients) {
      const beliefs = { address: input.contracts.beliefs, abi: BeliefsAbi };
      const cid = statementCid(action.statementId);
      const hash = action.belief === 'disbelieve' ? await disbelieveStatement(clients, beliefs, cid) : await believeStatement(clients, beliefs, cid);
      return { hash };
    },
    async 'attest-implication'(action, clients) {
      return { hash: await attestImplication(clients, { address: input.contracts.implications, abi: ImplicationsAbi }, statementCid(action.implication!.fromStatementId), statementCid(action.implication!.toStatementId)) };
    },
    async 'create-project'(action, clients) {
      const planned = requireBound(projects.get(action.projectId!), `project ${action.projectId}`) as PlannedProject;
      const publication = await storeFor(clients).publish(createDisplayableDocument({
        format: 'markdown-restricted', content: planned.outcome,
        extras: { statementType: 'lazy-giving-project-metadata', name: planned.title, description: planned.outcome, campaign: input.plan.campaignId, synthetic: true, alignedStatementRefs: planned.statementIds },
      }));
      const latest = await clients.publicClient.getBlock();
      const { hash, projectDetails } = await createProject(clients, { address: input.contracts.projectFactory, abi: ProjectFactoryAbi }, {
        metadataURI: `ipfs://${publication.cid}/`, contractURI: `ipfs://${publication.cid}`, owner: clients.account, recipient: clients.account,
        paymentToken: input.contracts.paymentToken, threshold: parseUnits('2', decimals), deadline: latest.timestamp + 30n * 24n * 60n * 60n,
        projectMetadataCid: publication.cid, tokenIds: [1n, 2n, 3n], tokenCounts: [100n, 500n, 1000n],
        tokenPrices: [parseUnits('0.1', decimals), parseUnits('0.05', decimals), parseUnits('0.01', decimals)],
      });
      projectTokens.set(planned.id, projectDetails.tokenAddress);
      return { hash, project: { assurance: projectDetails.assuranceContractAddress, token: projectDetails.tokenAddress } };
    },
    async 'attest-alignment'(action, clients) {
      return { hash: await attestAlignment(clients, { address: input.contracts.alignmentAttestations, abi: AlignmentAttestationsAbi }, toSubjectId(projectAddress(action.projectId)), statementCid(action.statementId), PROJECT_ALIGNMENT_TOPIC) };
    },
    async 'fund-project'(action, clients) {
      const assurance = projectAddress(action.projectId);
      let token = projectTokens.get(action.projectId!);
      if (!token) {
        const folded = await getProject(machinery, assurance);
        if (!folded?.erc1155Address) throw new Error(`cannot fund unknown project ${action.projectId}`);
        token = folded.erc1155Address as Address;
        projectTokens.set(action.projectId!, token);
      }
      return { hash: await buyProjectTokens(clients, { address: assurance, abi: AssuranceContractAbi }, { buyer: clients.account, tokenAddress: token, tokenIds: [3n], tokenCounts: [1n], totalCost: campaignFundProjectCost() }) };
    },
    async 'deposit-note'(action, clients) {
      const { hash, noteId } = await depositETH(clients, notesContract, { amount: noteAmount(action) });
      return { hash, note: { contractAddress: input.contracts.delegatableNotes, noteId: noteId.toString() } };
    },
    async 'delegate-note'(action, clients) {
      const binding = requireBound(input.bindings.notes[action.noteId!], `note ${action.noteId}`);
      const { hash, delegatedNoteId } = await delegateNote(clients, notesContract, {
        noteId: BigInt(binding.noteId), owners: [clients.account],
        delegateTo: requireBound(input.bindings.users[action.delegateUserId!], `delegate ${action.delegateUserId}`),
        amount: noteAmount(action),
      });
      return { hash, note: { ...binding, noteId: delegatedNoteId.toString() } };
    },
    async 'revoke-delegation'(action, clients) {
      const binding = requireBound(input.bindings.notes[action.noteId!], `note ${action.noteId}`);
      const delegated = input.plan.actions.find((item) => item.type === 'delegate-note' && item.noteId === action.noteId);
      const hash = await revokeNote(clients, notesContract, {
        noteId: BigInt(binding.noteId),
        owners: [requireBound(input.bindings.users[delegated?.delegateUserId ?? ''], `delegate for ${action.noteId}`), clients.account],
      });
      return { hash, note: binding };
    },
  };

  return { submit: (action, clients) => handlers[action.type](action, clients) };
}

export async function persistCampaignBindings(plan: CampaignPlan, bindings: CampaignRuntimeBindings, outputPath: string): Promise<void> {
  await writeRuntimeBindings(plan, bindings, outputPath);
}

export function createReceiptLookup(publicClient: Pick<PublicClient, 'getTransactionReceipt'>): (hash: Hex) => Promise<CampaignReceipt | null> {
  return async (hash) => {
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash });
      if (!receipt) return null;
      return {
        status: receipt.status === 'success' ? 'success' : 'reverted',
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice ?? 0n,
        blockNumber: receipt.blockNumber,
      };
    } catch {
      return null;
    }
  };
}

