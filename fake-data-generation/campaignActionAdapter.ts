import { getAddress, type Address, type Hex, type PublicClient } from 'viem';
import { parseUnits } from 'viem';
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
import { attestImplication, attestImplicationsBatch } from '@commonality/sdk/conceptspace';
import { depositETH, delegateNote, revokeNote } from '@commonality/sdk/delegation';
import { createDefaultDocumentStore, createDisplayableDocument, createStatement, publishDocumentsToPublishedData } from '@commonality/sdk/displayable-documents';
import { attestAlignment, attestAlignmentsBatch, PROJECT_ALIGNMENT_TOPIC, toSubjectId } from '@commonality/sdk/fundingportals';
import { buyProjectTokens, createProject, donateRetroactive, getProject } from '@commonality/sdk/lazy-giving';
import { createSDKMachinery } from '@commonality/sdk/machinery';
import { updateRef } from '@commonality/sdk/mutable-refs';
import { createIPFSConfigInNodeJSFromTheUsualEnvVars } from '@commonality/sdk/node';
import { cidToBytes32, type IpfsCidV1, type WriteClients } from '@commonality/sdk/utils';
import type { CampaignContracts, CampaignWalletBinding } from './campaignEnvironment.js';
import type { CampaignExecutionAdapter, CampaignReceipt } from './campaignExecutor.js';
import { estimateGroupGas } from './campaignBatching.js';
import { causeBoardSummary } from './campaignCopy.js';
import type { CampaignPlan, PlannedAction, PlannedProject } from './campaignPlanner.js';
import type { CampaignRuntimeBindings } from './campaignRuntimeBindings.js';
import { writeRuntimeBindings } from './campaignRuntimeBindings.js';
import { buildSeedClusterDocument, buildSeedRosterDocument } from './seedCauseRoster.js';
import { createSeedClients } from './seedRpc.js';
import { campaignActionFundingCost, campaignFundProjectCost, getPaymentTokenDecimals } from './paymentTokenUnits.js';
import { campaignNoteWei } from './campaignProvisioning.js';



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

export function campaignRunPublications(plan: CampaignPlan, bindings: CampaignRuntimeBindings): {
  causeBoards: Array<{ title: string; role: string; owner: Address; slug: string; path: string }>;
  bridges: Array<{ title: string; owner: Address; slug: string; path: string }>;
  projects: Array<{ title: string; assuranceContract: Address; path: string }>;
} {
  const causeBoards = [];
  const bridges = [];
  for (const action of plan.actions) {
    if (action.type === 'create-cause' || action.type === 'create-bridge-board') {
      const binding = bindings.causes[action.boardId ?? action.causeId ?? ''];
      if (!binding) continue;
      causeBoards.push({
        title: action.board?.title ?? action.causeId ?? binding.refName,
        role: action.board?.role ?? 'plain',
        owner: binding.owner,
        slug: binding.refName,
        path: `/cause/${binding.owner}/${binding.refName}`,
      });
    }
    if (action.type === 'create-bridge' && action.causeId && action.bridge) {
      const binding = bindings.bridges?.[action.causeId];
      if (!binding) continue;
      bridges.push({
        title: `${action.causeId} bridge`,
        owner: binding.owner,
        slug: binding.refName,
        path: `/bridge/${binding.owner}/${binding.refName}`,
      });
    }
  }
  const projects = plan.projects.flatMap((project) => {
    const assuranceContract = bindings.projects[project.id];
    return assuranceContract ? [{ title: project.title, assuranceContract, path: `/projects/${assuranceContract}` }] : [];
  });
  return { causeBoards, bridges, projects };
}

export function applySubmittedBindings(bindings: CampaignRuntimeBindings, action: PlannedAction, write: CampaignSubmittedWrite, actor: Address, now: Date): void {
  bindings.updatedAt = now.toISOString();
  if (action.actorUserId) bindings.users[action.actorUserId] = actor;
  if (action.statementId && write.statementCid) bindings.statements[action.statementId] = write.statementCid;
  if (action.type === 'create-bridge' && action.causeId && write.cause) {
    bindings.bridges ??= {};
    bindings.bridges[action.causeId] = write.cause;
  } else if ((action.type === 'create-cause' || action.type === 'create-bridge-board') && write.cause) {
    bindings.causes[action.boardId ?? action.causeId!] = write.cause;
  }
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
  approvalConfirmations?: number;
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
  const noteAmount = (action: PlannedAction) => campaignNoteWei(action);

  async function publishBoard(action: PlannedAction, clients: WriteClients): Promise<CampaignSubmittedWrite> {
    const board = action.board;
    const plankIds = board
      ? board.statementIds
      : input.plan.statements.filter((item) => item.causeId === action.causeId).map((item) => item.id);
    const title = board?.title ?? action.causeId ?? 'campaign-cause';
    const summary = board?.summary ?? causeBoardSummary(title);
    const refName = board?.slug ?? `campaign-${input.plan.campaignId}-${action.causeId}`;
    const parent = board?.parentBoardId
      ? {
        owner: requireBound(input.bindings.causes[board.parentBoardId], `parent board ${board.parentBoardId}`).owner,
        slug: requireBound(input.plan.actions.find((item) => item.boardId === board.parentBoardId)?.board, `parent board ${board.parentBoardId}`).slug,
      }
      : undefined;
    const narrowed = board?.role === 'modified-left' || board?.role === 'modified-right' || board?.role === 'commonality';
    const rosterCid = (await storeFor(clients).publish(buildSeedRosterDocument({
      title,
      summary,
      plankCids: plankIds.map((id) => statementCid(id)),
      mediatorBlurb: '',
      ...(narrowed && board?.clusterSlug ? {
        bridgeCluster: {
          clusterOwner: clients.account,
          clusterSlug: board.clusterSlug,
          role: board.role === 'commonality' ? 'bridge' as const : 'modified' as const,
          ...(parent ? { parentOwner: parent.owner, parentSlug: parent.slug } : {}),
        },
      } : {}),
    }))).cid;
    const hash = await updateRef(clients, { address: input.contracts.mutableRefUpdater, abi: MutableRefUpdaterAbi }, refName, rosterCid);
    return { hash, cause: { owner: clients.account, refName, rosterCid } };
  }

  const handlers: Record<PlannedAction['type'], (action: PlannedAction, clients: WriteClients) => Promise<CampaignSubmittedWrite>> = {
    async 'publish-statement'(action, clients) {
      const planned = requireBound(statements.get(action.statementId!), `statement ${action.statementId}`);
      const publication = await storeFor(clients).publish(createStatement({
        content: planned.text, topic: planned.causeId, extras: { campaign: input.plan.campaignId, synthetic: true },
      }));
      return { hash: publication.txHash, statementCid: publication.cid };
    },
    async 'create-cause'(action, clients) {
      return publishBoard(action, clients);
    },
    async 'create-bridge-board'(action, clients) {
      return publishBoard(action, clients);
    },
    async 'create-bridge'(action, clients) {
      const bridge = requireBound(action.bridge, `bridge ${action.causeId}`);
      const boardAction = (boardId: string) => requireBound(
        input.plan.actions.find((item) => item.boardId === boardId && item.board),
        `board ${boardId}`,
      );
      const bound = (boardId: string) => requireBound(input.bindings.causes[boardId], `board binding ${boardId}`);
      const ref = (boardId: string) => {
        const planned = boardAction(boardId);
        const published = bound(boardId);
        return { owner: getAddress(published.owner), slug: planned.board!.slug };
      };
      const naturalLeft = ref(bridge.boardIds.naturalLeft);
      const naturalRight = ref(bridge.boardIds.naturalRight);
      const modifiedLeft = ref(bridge.boardIds.modifiedLeft);
      const modifiedRight = ref(bridge.boardIds.modifiedRight);
      const commonality = ref(bridge.boardIds.commonality);
      const pair = (fromId: string, toId: string) => ({
        fromCid: statementCid(boardAction(fromId).board!.statementIds[0]),
        toCid: statementCid(boardAction(toId).board!.statementIds[0]),
        role: 'modified-to-bridge' as const,
      });
      const clusterCid = (await storeFor(clients).publish(buildSeedClusterDocument({
        mediatorName: bridge.mediatorName,
        mediatorNote: bridge.mediatorNote,
        mediatorAddress: getAddress(clients.account).toLowerCase() as `0x${string}`,
        parents: [naturalLeft, naturalRight],
        modified: [
          { ...modifiedLeft, parentOwner: naturalLeft.owner, parentSlug: naturalLeft.slug },
          { ...modifiedRight, parentOwner: naturalRight.owner, parentSlug: naturalRight.slug },
        ],
        bridge: commonality,
        pairs: [pair(bridge.boardIds.modifiedLeft, bridge.boardIds.commonality), pair(bridge.boardIds.modifiedRight, bridge.boardIds.commonality)],
      }))).cid;
      const hash = await updateRef(clients, { address: input.contracts.mutableRefUpdater, abi: MutableRefUpdaterAbi }, bridge.slug, clusterCid);
      return { hash, cause: { owner: clients.account, refName: bridge.slug, rosterCid: clusterCid } };
    },
    async 'set-belief'(action, clients) {
      const beliefs = { address: input.contracts.beliefs, abi: BeliefsAbi };
      const cid = statementCid(action.statementId);
      const hash = await clients.walletClient.writeContract({ address: beliefs.address, abi: beliefs.abi, functionName: 'setBelief',
        args: [cidToBytes32(cid), action.belief === 'disbelieve' ? 2 : 1], gas: 120_000n,
        chain: clients.walletClient.chain, account: clients.walletClient.account! });
      await clients.publicClient.waitForTransactionReceipt({ hash });
      return { hash };
    },
    async 'attest-implication'(action, clients) {
      return { hash: await attestImplication(clients, { address: input.contracts.implications, abi: ImplicationsAbi }, statementCid(action.implication!.fromStatementId), statementCid(action.implication!.toStatementId)) };
    },
    async 'create-project'(action, clients) {
      const planned = requireBound(projects.get(action.projectId!), `project ${action.projectId}`) as PlannedProject;
      const founder = input.plan.users.find((user) => user.id === planned.founderUserId);
      const description = founder?.displayName && founder.bio
        ? `${planned.outcome} Founder: ${founder.displayName}. ${founder.bio}`
        : planned.outcome;
      const publication = await storeFor(clients).publish(createDisplayableDocument({
        format: 'markdown-restricted', content: description,
        extras: { statementType: 'lazy-giving-project-metadata', name: planned.title, description, campaign: input.plan.campaignId, synthetic: true, alignedStatementRefs: planned.statementIds, ...(founder?.interests ? { founderInterests: founder.interests } : {}) },
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
      if (action.funding?.kind === 'retroactive') {
        return { hash: await donateRetroactive(clients, { address: assurance, abi: AssuranceContractAbi }, campaignActionFundingCost(action)) };
      }
      let token = projectTokens.get(action.projectId!);
      if (!token) {
        const folded = await getProject(machinery, assurance);
        if (!folded?.erc1155Address) throw new Error(`cannot fund unknown project ${action.projectId}`);
        token = folded.erc1155Address as Address;
        projectTokens.set(action.projectId!, token);
      }
      // A campaign wallet may fund the same project repeatedly. Cover the full
      // campaign in one approval so each purchase does not race an allowance read.
      const totalCost = action.funding
        ? input.plan.actions.filter((item) => item.type === 'fund-project' && item.actorUserId === action.actorUserId && item.projectId === action.projectId && item.funding?.kind === 'early').reduce((sum, item) => sum + campaignActionFundingCost(item), 0n)
        : campaignFundProjectCost() * 100n;
      return { hash: await buyProjectTokens(clients, { address: assurance, abi: AssuranceContractAbi }, { buyer: clients.account, tokenAddress: token,
        tokenIds: [BigInt(action.funding?.tokenId ?? 3)], tokenCounts: [BigInt(action.funding?.tokenCount ?? 1)], totalCost,
        approvalConfirmations: input.approvalConfirmations ?? 3 }) };
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
      const hash = await clients.walletClient.writeContract({ address: input.contracts.beliefs, abi: BeliefsAbi, functionName: 'setBeliefsInBatch',
        args: [actions.map((action) => cidToBytes32(statementCid(action.statementId))), actions.map((action) => action.belief === 'disbelieve' ? 2 : 1)],
        gas: 40_000n + 80_000n * BigInt(actions.length), chain: clients.walletClient.chain, account: clients.walletClient.account! });
      await clients.publicClient.waitForTransactionReceipt({ hash });
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
