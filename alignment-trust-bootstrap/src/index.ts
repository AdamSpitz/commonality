import { access } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { AlignmentAttestationsAbi, TrustRegistryAbi } from '@commonality/sdk/abis';
import { loadBootstrapConfig, type BootstrapConfig } from './config.js';
import { loadDenylist } from './policy.js';
import { readCursor, writeCursor } from './state.js';
import { admitAttesters, reconcileDenylist, type TrustWriter } from './worker.js';

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export async function runBootstrap(config: BootstrapConfig, signal?: AbortSignal): Promise<void> {
  const account = privateKeyToAccount(config.privateKey);
  const publicClient = createPublicClient({ transport: http(config.rpcUrl) });
  const walletClient = createWalletClient({ account, transport: http(config.rpcUrl) });
  const rpcChainId = await publicClient.getChainId();
  if (rpcChainId !== config.chainId) throw new Error(`RPC chain ID ${rpcChainId} does not match CHAIN_ID ${config.chainId}`);
  const identity = { chainId: config.chainId, alignmentAttestationsAddress: config.alignmentAttestationsAddress };
  let cursor = await readCursor(config.stateFile, config.startBlock, identity);
  const writer: TrustWriter = {
    getTrust: async address => Number(await publicClient.readContract({
      address: config.trustRegistryAddress, abi: TrustRegistryAbi, functionName: 'getTrust', args: [account.address, address],
    })),
    setTrustBatch: async (addresses, scores) => {
      const hash = await walletClient.writeContract({
        address: config.trustRegistryAddress, abi: TrustRegistryAbi, functionName: 'setTrustBatch',
        args: [addresses, scores], account, chain: null,
      });
      await publicClient.waitForTransactionReceipt({ hash });
    },
  };

  while (!signal?.aborted) {
    if (config.pauseFile) {
      try { await access(config.pauseFile); await sleep(config.pollIntervalMs); continue; } catch { /* absent means running */ }
    }
    const denied = await loadDenylist(config.denylistFile);
    const revoked = await reconcileDenylist(writer, denied);
    if (revoked.length > 0) console.log(`Revoked ${revoked.length} denied attester(s)`);
    const head = await publicClient.getBlockNumber();
    if (head < config.confirmations || cursor.blockNumber > head - config.confirmations) {
      await sleep(config.pollIntervalMs); continue;
    }
    const safeHead = head - config.confirmations;
    const rangeEnd = cursor.blockNumber + config.blockRange - 1n;
    const toBlock = rangeEnd < safeHead ? rangeEnd : safeHead;
    const logs = await publicClient.getContractEvents({
      address: config.alignmentAttestationsAddress, abi: AlignmentAttestationsAbi,
      eventName: 'AlignmentAttestation', fromBlock: cursor.blockNumber, toBlock, strict: true,
    });
    const unseen = logs.filter(log => log.blockNumber !== null && log.logIndex !== null
      && (log.blockNumber > cursor.blockNumber || log.logIndex > cursor.logIndex));
    const selected = unseen.slice(0, config.maxAdmissionsPerPoll);
    const candidates = selected.map(log => log.args.attester as Address);
    const admitted = await admitAttesters(writer, candidates, denied, account.address, config.batchSize);
    if (admitted.length > 0) console.log(`Trusted ${admitted.length} new alignment attester(s)`);
    if (selected.length > 0) {
      const last = selected[selected.length - 1]!;
      cursor = { blockNumber: last.blockNumber!, logIndex: last.logIndex! };
    } else {
      cursor = { blockNumber: toBlock + 1n, logIndex: -1 };
    }
    await writeCursor(config.stateFile, cursor, identity);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const controller = new AbortController();
  process.once('SIGINT', () => controller.abort());
  process.once('SIGTERM', () => controller.abort());
  runBootstrap(loadBootstrapConfig(), controller.signal).catch(error => { console.error(error); process.exitCode = 1; });
}
