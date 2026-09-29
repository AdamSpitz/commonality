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
import { believeStatement, disbelieveStatement, attestImplication, attestImplicationsBatch, setBeliefsBatch } from '@commonality/sdk/conceptspace';
import { depositETH, delegateNote, revokeNote } from '@commonality/sdk/delegation';
import { createDefaultDocumentStore, createDisplayableDocument, createStatement, publishDocumentsToPublishedData } from '@commonality/sdk/displayable-documents';
import { attestAlignment, attestAlignmentsBatch, PROJECT_ALIGNMENT_TOPIC, toSubjectId } from '@commonality/sdk/fundingportals';
import { buyProjectTokens, createProject, getProject } from '@commonality/sdk/lazy-giving';
import { createSDKMachinery } from '@commonality/sdk/machinery';
import { updateRef } from '@commonality/sdk/mutable-refs';
import { createIPFSConfigInNodeJSFromTheUsualEnvVars } from '@commonality/sdk/node';
import type { IpfsCidV1, WriteClients } from '@commonality/sdk/utils';
import type { CampaignContracts, CampaignWalletBinding } from './campaignEnvironment.js';
import type { CampaignExecutionAdapter, CampaignReceipt } from './campaignExecutor.js';
import { estimateGroupGas } from './campaignBatching.js';
import type { CampaignPlan, PlannedAction, PlannedProject } from './campaignPlanner.js';
import type { CampaignRuntimeBindings } from './campaignRuntimeBindings.js';
import { writeRuntimeBindings } from './campaignRuntimeBindings.js';
import { buildSeedRosterDocument } from './seedCauseRoster.js';
import { createSeedClients } from './seedRpc.js';
import { campaignFundProjectCost, getPaymentTokenDecimals } from './paymentTokenUnits.js';



export interface CampaignSubmittedWrite {
  hash: Hex;
  statementCid?: IpfsCidV1;
  cause?: { owner: Address; refName: string; rosterCid: IpfsCidV1 };
  project?: { assurance: Address; token: Address };
  note?: { contractAddress: Address; noteId: string };
}

export interface CampaignActionWriter {
  submit(action: PlannedAction, actor: WriteClients): Promise<CampaignSubmittedWrite>;
  submitMany(actions: readonly PlannedAction[], actor: WriteClients): Promise<{ hash: Hex; writes: CampaignSubmittedWrite[] }>;
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
    estimateNativeCost: async (action) => estimateGroupGas([action]) * gasPrice,
    estimateGroupCost: async (actions) => estimateGroupGas(actions) * gasPrice,
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
    async submitGroup(actions) {
      const wallet = actorFor(actions[0]);
      if (actions.some((action) => actorFor(action).address !== wallet.address)) throw new Error('batched campaign writes must share one wallet');
      const clients = clientsFor(wallet);
      const submitted = await input.writer.submitMany(actions, clients);
      if (submitted.writes.length !== actions.length) throw new Error('batched campaign write did not return one result per action');
      actions.forEach((action, index) => {
        const write = submitted.writes[index];
        applySubmittedBindings(input.bindings, action, write, clients.account, now());
        if (write.project) projectTokens.set(action.projectId!, write.project.token);
      });
      await input.persistBindings?.(input.bindings);
      return submitted.hash;
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

  const submitMany: CampaignActionWriter['submitMany'] = async (actions, clients) => {
    const type = actions[0]?.type;
    if (!type || actions.some((action) => action.type !== type)) throw new Error('batched campaign writes must share one action type');
    if (type === 'set-belief') {
      const hash = await setBeliefsBatch(clients, { address: input.contracts.beliefs, abi: BeliefsAbi }, actions.map((action) => ({
        statementCid: statementCid(action.statementId),
        beliefState: action.belief === 'disbelieve' ? 2 : 1,
      })));
      return { hash, writes: actions.map(() => ({ hash })) };
    }
    if (type === 'attest-implication') {
      const hash = await attestImplicationsBatch(
        clients,
        { address: input.contracts.implications, abi: ImplicationsAbi },
        actions.map((action) => statementCid(action.implication!.fromStatementId)),
        actions.map((action) => statementCid(action.implication!.toStatementId)),
      );
      return { hash, writes: actions.map(() => ({ hash })) };
    }
    if (type === 'attest-alignment') {
      const hash = await attestAlignmentsBatch(
        clients,
        { address: input.contracts.alignmentAttestations, abi: AlignmentAttestationsAbi },
        actions.map((action) => toSubjectId(projectAddress(action.projectId))),
        actions.map((action) => statementCid(action.statementId)),
        actions.map(() => PROJECT_ALIGNMENT_TOPIC),
      );
      return { hash, writes: actions.map(() => ({ hash })) };
    }
    if (type === 'publish-statement') {
      const publications = await publishDocumentsToPublishedData(
        clients,
        { address: input.contracts.publishedData, abi: PublishedDataAbi },
        actions.map((action) => {
          const planned = requireBound(statements.get(action.statementId!), `statement ${action.statementId}`);
          return createStatement({
            content: planned.text, topic: planned.causeId, extras: { campaign: input.plan.campaignId, synthetic: true },
          });
        }),
      );
      return {
        hash: publications[0].txHash,
        writes: publications.map((publication) => ({ hash: publication.txHash, statementCid: publication.cid })),
      };
    }
    throw new Error(`campaign action ${type} cannot be batched`);
  };

  return {
    submit: (action, clients) => handlers[action.type](action, clients),
    submitMany,
  };
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

