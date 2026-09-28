import type { Project, ProjectToken, Contribution, Refund, ProjectReimbursementState, ContributorReimbursementState } from './types.js';
import { ETH_CURRENCY, type Currency } from '../../utils/currency.js';
import { normalizeIpfsMetadataReference } from '../../utils/cid-types.js';
import type {
  AssuranceContractCreatedEvent,
  AssuranceContractInitializedEvent,
  ContractMetadataUpdatedEvent,
  ERC1155OfferedEvent,
  ERC1155BoughtEvent,
  ERC1155SoldEvent,
  AssuranceContractWithdrawalEvent,
  RetroactiveDonationReceivedEvent,
  ReimbursementWithdrawnEvent,
  ReimbursementForgoneEvent,
} from './events.js';

// Discriminated union of all primary-market events for one project.
// Caller is responsible for filtering events to a single assuranceContract address.
export type ProjectEvent =
  | { type: 'created'; event: AssuranceContractCreatedEvent }
  | { type: 'initialized'; event: AssuranceContractInitializedEvent }
  | { type: 'metadataUpdated'; event: ContractMetadataUpdatedEvent }
  | { type: 'tokenOffered'; event: ERC1155OfferedEvent }
  | { type: 'bought'; event: ERC1155BoughtEvent }
  | { type: 'sold'; event: ERC1155SoldEvent }
  | { type: 'withdrawal'; event: AssuranceContractWithdrawalEvent };

export const PROJECT_FOLD_VERSION = 1;
export const CONTRIBUTIONS_FOLD_VERSION = 1;

export type ReimbursementEvent =
  | { type: 'bought'; event: ERC1155BoughtEvent }
  | { type: 'sold'; event: ERC1155SoldEvent }
  | { type: 'retroactiveDonation'; event: RetroactiveDonationReceivedEvent }
  | { type: 'reimbursementWithdrawn'; event: ReimbursementWithdrawnEvent }
  | { type: 'reimbursementForgone'; event: ReimbursementForgoneEvent };

function cidFromMetadataReference(reference: string | undefined): string | undefined {
  if (!reference) return undefined;
  try {
    return normalizeIpfsMetadataReference(reference);
  } catch {
    // On-chain garbage (filenames, docs titles) is not a CID. Leave metadata
    // unset so the UI does not fetch `https://ipfs.io/ipfs/<junk>`.
    return undefined;
  }
}

/**
 * Mutable accumulator for foldProject — holds the raw (pre-serialized) state
 * so it can be stored and passed back in for incremental/resumable folding.
 */
export interface ProjectAccumulator {
  foldVersion: typeof PROJECT_FOLD_VERSION;
  id: string;
  erc1155Address: string;
  recipient: string;
  conditionAddress: string | null;
  metadataCid: string | undefined;
  createdAt: string | undefined;
  blockNumber: string | undefined;
  lastEventBlockNumber?: string;
  lastEventLogIndex?: number;
  totalReceived: bigint;
}

export interface ContributionsAccumulator {
  foldVersion: typeof CONTRIBUTIONS_FOLD_VERSION;
  contributions: Contribution[];
  refunds: Refund[];
}


/**
 * Fold primary-market events for a single project → Project state.
 *
 * threshold and deadline are omitted because they require on-chain reads (Phase 2).
 * conditionAddress comes from the initialized event.
 * totalReceived is computed as sum(bought.totalCost) - sum(sold.totalRefund).
 * Note: withdrawals do NOT reduce totalReceived (they represent funds leaving after success).
 * metadataCid is last-write-wins (ContractMetadataUpdated events).
 *
 * Caller is responsible for filtering events to a single assuranceContract address
 * before calling this function. Events must arrive in block/logIndex order.
 *
 * Pass `initialAccumulator` (from a previous call's `accumulator` output) to resume
 * folding from a saved cursor rather than processing all events from scratch.
 */
export function foldProject(
  events: ProjectEvent[],
  initialAccumulator?: ProjectAccumulator,
  fundingCurrency: Currency = ETH_CURRENCY,
): { project: Omit<Project, 'threshold' | 'deadline'> | null; accumulator: ProjectAccumulator } {
  const acc: ProjectAccumulator = initialAccumulator?.foldVersion === PROJECT_FOLD_VERSION
    ? { ...initialAccumulator }
    : {
        foldVersion: PROJECT_FOLD_VERSION,
        id: '',
        erc1155Address: '',
        recipient: '',
        conditionAddress: null,
        metadataCid: undefined,
        createdAt: undefined,
        blockNumber: undefined,
        lastEventBlockNumber: undefined,
        lastEventLogIndex: undefined,
        totalReceived: 0n,
      };

  const hasCursor = initialAccumulator?.foldVersion === PROJECT_FOLD_VERSION && initialAccumulator.lastEventLogIndex !== undefined && initialAccumulator.lastEventBlockNumber !== undefined;
  const lastProcessedBlock = hasCursor ? BigInt(initialAccumulator.lastEventBlockNumber!) : null;
  const lastProcessedLogIndex = hasCursor ? initialAccumulator.lastEventLogIndex! : null;

  for (const { type, event } of events) {
    if (
      lastProcessedBlock !== null &&
      (event.blockNumber < lastProcessedBlock ||
        (event.blockNumber === lastProcessedBlock && lastProcessedLogIndex !== null && event.logIndex <= lastProcessedLogIndex))
    ) {
      continue;
    }

    acc.lastEventBlockNumber = event.blockNumber.toString();
    acc.lastEventLogIndex = event.logIndex;

    switch (type) {
      case 'created':
        acc.id = event.assuranceContract;
        acc.createdAt = event.blockTimestamp.toString();
        acc.blockNumber = event.blockNumber.toString();
        break;
      case 'initialized':
        if (!acc.id) acc.id = event.contractAddress;
        acc.recipient = event.recipient;
        acc.conditionAddress = event.condition;
        break;
      case 'metadataUpdated':
        acc.metadataCid = cidFromMetadataReference(event.uri || event.metadata);
        break;
      case 'tokenOffered':
        if (!acc.erc1155Address) acc.erc1155Address = event.erc1155Addr;
        break;
      case 'bought':
        acc.totalReceived += event.totalCost;
        break;
      case 'sold':
        acc.totalReceived -= event.totalCost;
        break;
      case 'withdrawal':
        // Withdrawals do not change totalReceived — they represent disbursement of funds
        // after the project succeeds, which is tracked separately.
        break;
    }
  }

  const project: Omit<Project, 'threshold' | 'deadline'> | null = acc.id
    ? {
        id: acc.id,
        erc1155Address: acc.erc1155Address,
        marketplaceAddress: null,
        recipient: acc.recipient,
        fundingCurrency,
        totalReceived: acc.totalReceived.toString(),
        conditionAddress: acc.conditionAddress,
        metadataCid: acc.metadataCid,
        createdAt: acc.createdAt,
        blockNumber: acc.blockNumber,
      }
    : null;

  return { project, accumulator: acc };
}

/**
 * Fold ERC1155Bought and ERC1155Sold events → contribution and refund records.
 *
 * Each bought event becomes one Contribution; each sold event becomes one Refund.
 * IDs are derived from transactionHash + logIndex (matching indexer convention).
 */
export function foldContributionsFromEvents(
  boughtEvents: ERC1155BoughtEvent[],
  soldEvents: ERC1155SoldEvent[],
  initialState?: ContributionsAccumulator,
  fundingCurrency: Currency = ETH_CURRENCY,
): {
  contributions: Contribution[];
  refunds: Refund[];
  accumulator: ContributionsAccumulator;
} {
  const accumulator: ContributionsAccumulator = initialState?.foldVersion === CONTRIBUTIONS_FOLD_VERSION
    ? {
        foldVersion: CONTRIBUTIONS_FOLD_VERSION,
        contributions: [...initialState.contributions],
        refunds: [...initialState.refunds],
      }
    : {
        foldVersion: CONTRIBUTIONS_FOLD_VERSION,
        contributions: [],
        refunds: [],
      };
  const { contributions, refunds } = accumulator;

  for (const event of boughtEvents) {
    const id = `${event.transactionHash}-${event.logIndex}`;
    contributions.push({
      id,
      contributor: event.participant,
      projectAddress: event.contractAddress,
      erc1155Address: event.erc1155Addr,
      tokenIds: JSON.stringify(event.ids.map((id) => id.toString())),
      tokenCounts: JSON.stringify(event.counts.map((c) => c.toString())),
      currency: fundingCurrency,
      totalCost: event.totalCost.toString(),
      createdAt: event.blockTimestamp.toString(),
      blockNumber: event.blockNumber.toString(),
      transactionHash: event.transactionHash,
    });
  }

  for (const event of soldEvents) {
    const id = `${event.transactionHash}-${event.logIndex}`;
    refunds.push({
      id,
      contributor: event.participant,
      projectAddress: event.contractAddress,
      erc1155Address: event.erc1155Addr,
      tokenIds: JSON.stringify(event.ids.map((id) => id.toString())),
      tokenCounts: JSON.stringify(event.counts.map((c) => c.toString())),
      currency: fundingCurrency,
      totalRefund: event.totalCost.toString(),
      createdAt: event.blockTimestamp.toString(),
      blockNumber: event.blockNumber.toString(),
      transactionHash: event.transactionHash,
    });
  }

  return { contributions, refunds, accumulator };
}

export function foldContributions(
  boughtEvents: ERC1155BoughtEvent[],
  soldEvents: ERC1155SoldEvent[],
  fundingCurrency: Currency = ETH_CURRENCY,
): {
  contributions: Contribution[];
  refunds: Refund[];
} {
  return foldContributionsFromEvents(boughtEvents, soldEvents, undefined, fundingCurrency);
}

/**
 * Matches `REIMBURSEMENT_PER_SHARE_SCALE` in AssuranceContracts.sol.
 * Donations accrue in this scale so leftover wei stays assigned to shares
 * until a later donation pushes a holder across a whole token unit.
 */
const REIMBURSEMENT_PER_SHARE_SCALE = 10n ** 36n;

function mulDivFloor(x: bigint, y: bigint, denominator: bigint): bigint {
  return (x * y) / denominator;
}

/** OpenZeppelin Math.mulDiv(..., Rounding.Ceil). */
function mulDivCeil(x: bigint, y: bigint, denominator: bigint): bigint {
  const product = x * y;
  const rounded = product / denominator;
  return product % denominator === 0n ? rounded : rounded + 1n;
}

/**
 * Fold contribution and waterfall events into project and per-contributor reimbursement state.
 *
 * Replays the contract's claim-share ledger: purchases mint shares with a
 * ceiling division, retroactive donations bump `accumulatedReimbursementPerClaimShare`,
 * and each holder's withdrawable and future claim are the contract's `mulDiv` views.
 * A same-transaction buy plus forgo that exceeds the claim (donate-normally, which
 * never mints) undoes the shares just minted. A sell applies the refund's basis
 * reduction; the matching `ReimbursementForgone` event, when present, is what
 * counts toward forgone totals.
 */
export function foldReimbursements(
  projectAddress: string,
  events: ReimbursementEvent[],
  fundingCurrency: Currency = ETH_CURRENCY,
): { project: ProjectReimbursementState; contributors: ContributorReimbursementState[] } {
  const early = new Map<string, bigint>();
  const shares = new Map<string, bigint>();
  const checkpoint = new Map<string, bigint>();
  const storedWithdrawable = new Map<string, bigint>();
  const withdrawn = new Map<string, bigint>();
  const forgone = new Map<string, bigint>();
  const seen = new Set<string>();
  const lastMint = new Map<string, { tx: string; value: bigint; shares: bigint }>();
  let totalEarly = 0n;
  let totalRetro = 0n;
  let totalShares = 0n;
  let accumulated = 0n;

  const keyOf = (address: string) => address.toLowerCase();
  const outstanding = () => totalEarly - totalRetro;
  const balanceOf = (key: string) => shares.get(key) ?? 0n;

  const futureClaim = (key: string): bigint => {
    if (totalShares === 0n) return 0n;
    return mulDivFloor(balanceOf(key), outstanding(), totalShares);
  };

  const checkpointAccount = (key: string) => {
    const marked = checkpoint.get(key) ?? 0n;
    if (accumulated !== marked) {
      const earned = mulDivFloor(balanceOf(key), accumulated - marked, REIMBURSEMENT_PER_SHARE_SCALE);
      storedWithdrawable.set(key, (storedWithdrawable.get(key) ?? 0n) + earned);
      checkpoint.set(key, accumulated);
    }
  };

  const withdrawableOf = (key: string): bigint => {
    const settled = storedWithdrawable.get(key) ?? 0n;
    const marked = checkpoint.get(key) ?? 0n;
    if (accumulated === marked) return settled;
    return settled + mulDivFloor(balanceOf(key), accumulated - marked, REIMBURSEMENT_PER_SHARE_SCALE);
  };

  const mintShares = (key: string, value: bigint, tx: string) => {
    checkpointAccount(key);
    const out = outstanding();
    const minted = totalShares === 0n || out === 0n
      ? value
      : mulDivCeil(value, totalShares, out);
    shares.set(key, balanceOf(key) + minted);
    totalShares += minted;
    early.set(key, (early.get(key) ?? 0n) + value);
    totalEarly += value;
    lastMint.set(key, { tx, value, shares: minted });
  };

  const undoMint = (key: string, value: bigint, minted: bigint) => {
    const held = balanceOf(key);
    const burned = minted < held ? minted : held;
    shares.set(key, held - burned);
    totalShares -= burned;
    const tracked = early.get(key) ?? 0n;
    const basis = value < tracked ? value : tracked;
    early.set(key, tracked - basis);
    totalEarly -= basis;
  };

  const reduceBasis = (key: string, amount: bigint, countForgone: boolean, tx?: string) => {
    if (amount === 0n) return;
    checkpointAccount(key);
    const claim = futureClaim(key);
    const tracked = early.get(key) ?? 0n;
    const phantom = tx === undefined ? undefined : lastMint.get(key);
    if (phantom && phantom.tx === tx && phantom.value === amount && amount > claim) {
      undoMint(key, amount, phantom.shares);
      if (countForgone) forgone.set(key, (forgone.get(key) ?? 0n) + amount);
      return;
    }
    const applied = amount < claim && amount < tracked ? amount : (claim < tracked ? claim : tracked);
    if (applied === 0n) return;
    const held = balanceOf(key);
    const out = outstanding();
    let burned = applied === claim
      ? held
      : (out === 0n ? 0n : mulDivCeil(applied, totalShares, out));
    if (burned > held) burned = held;
    shares.set(key, held - burned);
    totalShares -= burned;
    early.set(key, tracked - applied);
    totalEarly -= applied;
    if (countForgone) forgone.set(key, (forgone.get(key) ?? 0n) + applied);
  };

  for (const { type, event } of events) {
    switch (type) {
      case 'bought': {
        const key = keyOf(event.participant);
        seen.add(key);
        mintShares(key, event.totalCost, event.transactionHash);
        break;
      }
      // recordPrimaryRefund forgoes the tracked basis (clamped to what is left)
      // before ERC1155Sold. When that Forgone event is in the stream it has
      // already reduced the basis, and this is a no-op.
      case 'sold': {
        const key = keyOf(event.participant);
        seen.add(key);
        const tracked = early.get(key) ?? 0n;
        const reduction = event.totalCost < tracked ? event.totalCost : tracked;
        reduceBasis(key, reduction, false);
        break;
      }
      case 'retroactiveDonation': {
        if (totalShares > 0n && event.amount > 0n) {
          accumulated += mulDivFloor(event.amount, REIMBURSEMENT_PER_SHARE_SCALE, totalShares);
        }
        totalRetro += event.amount;
        break;
      }
      case 'reimbursementWithdrawn': {
        const key = keyOf(event.contributor);
        seen.add(key);
        checkpointAccount(key);
        const available = storedWithdrawable.get(key) ?? 0n;
        const paid = event.amount < available ? event.amount : available;
        storedWithdrawable.set(key, available - paid);
        withdrawn.set(key, (withdrawn.get(key) ?? 0n) + paid);
        break;
      }
      case 'reimbursementForgone': {
        const key = keyOf(event.contributor);
        seen.add(key);
        reduceBasis(key, event.amount, true, event.transactionHash);
        break;
      }
    }
  }

  const totalWithdrawn = [...withdrawn.values()].reduce((sum, value) => sum + value, 0n);
  const totalForgone = [...forgone.values()].reduce((sum, value) => sum + value, 0n);
  const contributors = [...seen].map((contributor) => ({
    projectAddress,
    contributor,
    currency: fundingCurrency,
    earlyContribution: (early.get(contributor) ?? 0n).toString(),
    futureReimbursementClaim: futureClaim(contributor).toString(),
    reimbursableAmount: withdrawableOf(contributor).toString(),
    withdrawnAmount: (withdrawn.get(contributor) ?? 0n).toString(),
    forgoneAmount: (forgone.get(contributor) ?? 0n).toString(),
  }));

  return {
    project: {
      projectAddress,
      currency: fundingCurrency,
      totalEarlyContributions: totalEarly.toString(),
      totalRetroactiveDonations: totalRetro.toString(),
      outstandingReimbursement: outstanding().toString(),
      totalReimbursementsWithdrawn: totalWithdrawn.toString(),
      totalReimbursementsForgone: totalForgone.toString(),
    },
    contributors,
  };
}

/**
 * Fold ERC1155Offered events → project token records.
 *
 * Each offered event becomes one ProjectToken. If the same (assuranceContract,
 * erc1155Addr, tokenId) is offered multiple times, last-write-wins for price.
 *
 * Caller is responsible for filtering events to a single project if desired.
 * Events must arrive in block/logIndex order.
 */
export function foldProjectTokens(
  events: ERC1155OfferedEvent[],
  fundingCurrency: Currency = ETH_CURRENCY,
): ProjectToken[] {
  const map = new Map<string, ProjectToken>();

  for (const event of events) {
    const key = `${event.contractAddress.toLowerCase()}:${event.erc1155Addr.toLowerCase()}:${event.id.toString()}`;
    map.set(key, {
      projectAddress: event.contractAddress,
      erc1155Address: event.erc1155Addr,
      tokenId: event.id.toString(),
      currency: fundingCurrency,
      price: event.price.toString(),
      createdAt: event.blockTimestamp.toString(),
    });
  }

  return [...map.values()];
}
