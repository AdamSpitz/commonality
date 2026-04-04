import { type SDKMachinery } from '@commonality/sdk';
import { loadConfig } from './config.js';
import { loadState, saveState, pairKey } from './state.js';
import { fetchDirectSupportEvents, fetchExistingImplications } from './poller.js';
import { getTopStatements, allStatementCids } from './popularity.js';
import { selectCandidatePairs } from './candidates.js';
import { evaluatePairs } from './attesterClient.js';

const config = loadConfig();

const machinery: SDKMachinery = {
  indexerUrl: '',
  ipfsConfig: { gatewayUrl: '', apiUrl: '' },
  testConfig: {},
  eventCacheUrl: config.eventCacheUrl,
  contractAddresses: {
    beliefs: config.beliefsContractAddress,
    implications: config.implicationsContractAddress,
    // The finder only reads beliefs + implications events, so the rest are unused.
    assuranceContractFactory: '0x0',
    erc1155Factory: '0x0',
    marketplaceFactory: '0x0',
    delegatableNotes: '0x0',
    noteIntent: '0x0',
    alignmentAttestations: '0x0',
    mutableRefUpdater: '0x0',
    trustRegistry: '0x0',
  },
};

async function runOnce(stateFilePath: string): Promise<void> {
  const state = await loadState(stateFilePath);
  const evaluatedSet = new Set(state.evaluatedPairs);

  // 1. Fetch all DirectSupport events (we rebuild the full popularity map each cycle).
  //    We use sinceBlock='0' for the popularity map, but track lastBlockSeen
  //    to know which statements are "new" (appeared after our last run).
  const allEvents = await fetchDirectSupportEvents(machinery, '0');

  if (allEvents.length === 0) {
    console.log('No DirectSupport events found. Nothing to do.');
    return;
  }

  // 2. Determine which statements are new since our last run.
  const newEvents = allEvents.filter(
    e => BigInt(e.blockNumber) > BigInt(state.lastBlockSeen),
  );
  const newCids = allStatementCids(newEvents);

  if (newCids.size === 0) {
    console.log('No new statements since last run.');
    return;
  }

  console.log(`Found ${newCids.size} statement(s) with activity since block ${state.lastBlockSeen}.`);

  // 3. Also seed evaluatedSet with pairs the attester has already attested on-chain,
  //    so we don't re-request those.
  const existingImplications = await fetchExistingImplications(machinery);
  for (const impl of existingImplications) {
    evaluatedSet.add(pairKey(impl.fromStatementCid, impl.toStatementCid));
  }

  // 4. Build popularity map from all events, cast to the fold function's expected type.
  const foldEvents = allEvents.map(e => ({
    user: e.user,
    statementId: e.statementId,
    beliefState: e.beliefState,
    contractAddress: e.contractAddress,
    blockNumber: e.blockNumber,
    blockTimestamp: e.blockTimestamp,
    transactionHash: e.transactionHash,
    logIndex: e.logIndex,
  }));
  const popular = getTopStatements(foldEvents, config.topNStatements, config.minBelieverThreshold);

  if (popular.length === 0) {
    console.log('No statements meet the minimum believer threshold yet.');
    // Still update lastBlockSeen so we don't re-process these events.
    const maxBlock = allEvents.reduce(
      (max, e) => (BigInt(e.blockNumber) > BigInt(max) ? e.blockNumber.toString() : max),
      state.lastBlockSeen,
    );
    await saveState(stateFilePath, { ...state, lastBlockSeen: maxBlock });
    return;
  }

  console.log(`Top ${popular.length} popular statement(s): ${popular.map(s => `${s.cid.slice(0, 12)}…(${s.believerCount})`).join(', ')}`);

  // 5. Select candidate pairs.
  const candidates = selectCandidatePairs(newCids, popular, evaluatedSet);

  if (candidates.length === 0) {
    console.log('All candidate pairs already evaluated.');
  } else {
    console.log(`Evaluating ${candidates.length} candidate pair(s)...`);

    // 6. Send to attester.
    const results = await evaluatePairs(candidates, config.attesterUrl, config.attesterFinderKey);

    let attested = 0;
    let noImplication = 0;
    let failed = 0;
    for (const r of results) {
      if (!r.success) {
        failed++;
        console.error(`  FAIL ${r.fromStatementCid.slice(0, 12)}→${r.toStatementCid.slice(0, 12)}: ${r.error}`);
      } else if (r.transactionHash) {
        attested++;
        console.log(`  ATTESTED ${r.fromStatementCid.slice(0, 12)}→${r.toStatementCid.slice(0, 12)} (${r.confidence}) tx=${r.transactionHash}`);
      } else {
        noImplication++;
      }
    }

    console.log(`Results: ${attested} attested, ${noImplication} no implication, ${failed} failed.`);

    // 7. Record evaluated pairs (even failed ones, to avoid retrying immediately).
    for (const c of candidates) {
      evaluatedSet.add(pairKey(c.fromCid, c.toCid));
    }
  }

  // 8. Update lastBlockSeen.
  const maxBlock = allEvents.reduce(
    (max, e) => (BigInt(e.blockNumber) > BigInt(max) ? e.blockNumber.toString() : max),
    state.lastBlockSeen,
  );

  await saveState(stateFilePath, {
    lastBlockSeen: maxBlock,
    evaluatedPairs: [...evaluatedSet],
  });

  console.log(`State saved. lastBlockSeen=${maxBlock}, evaluatedPairs=${evaluatedSet.size}`);
}

async function main() {
  console.log('Implication Finder starting.');
  console.log(`  Event cache: ${config.eventCacheUrl}`);
  console.log(`  Attester: ${config.attesterUrl}`);
  console.log(`  Poll interval: ${config.pollIntervalMs}ms`);
  console.log(`  Top N statements: ${config.topNStatements}`);
  console.log(`  Min believer threshold: ${config.minBelieverThreshold}`);

  // Run immediately, then on interval.
  while (true) {
    try {
      await runOnce(config.stateFilePath);
    } catch (error) {
      console.error('Error in poll cycle:', error);
    }

    await new Promise(resolve => setTimeout(resolve, config.pollIntervalMs));
  }
}

main();
