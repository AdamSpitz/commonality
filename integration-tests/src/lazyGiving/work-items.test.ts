import assert from 'node:assert/strict';
import { type Address, decodeEventLog, type Hex } from 'viem';
import { ContentRegistryAbi, ProjectFactoryAbi } from '@commonality/sdk/abis';
import { acceptWorkProject, createProject, getProjectWorkState, vetoWorkProject, walletWorkBeneficiaryId, workIdHash } from '@commonality/sdk/lazy-giving';
import { fetchEvents, uploadToIPFS } from '@commonality/sdk/utils';
import { waitForIndexerToSyncToTxHash } from '@commonality/sdk/indexer-sync';
import { createIsolatedWriteClients } from '../utils/setup.js';
import { createActionTestingMachinery } from '../actions/action-machinery.js';

describe('Beneficiary-scoped work integration', () => {
  it('creates, indexes, accepts, vetoes, and retries work through the SDK without cross-beneficiary collisions', async function () {
    this.timeout(60000);
    const machinery = createActionTestingMachinery();
    const initiator = createIsolatedWriteClients('beneficiary-work', 0);
    const bob = createIsolatedWriteClients('beneficiary-work', 1);
    const carol = createIsolatedWriteClients('beneficiary-work', 2);
    const factory = process.env.PROJECT_FACTORY_ADDRESS as Address;
    const registry = process.env.CONTENT_REGISTRY_ADDRESS as Address;
    const paymentToken = process.env.PAYMENT_TOKEN_ADDRESS as Address;
    assert.ok(factory && registry && paymentToken);
    const workId = `concert:integration:${crypto.randomUUID()}`;
    const metadataCid = await uploadToIPFS(machinery.ipfsConfig, { title: 'Work proposal integration' });
    const block = await initiator.publicClient.getBlock();
    const params = {
      metadataURI: 'ipfs://tokens/{id}', contractURI: 'ipfs://contract',
      owner: initiator.account, paymentToken, threshold: 5n,
      deadline: block.timestamp + 30n * 86400n, projectMetadataCid: metadataCid,
      tokenIds: [1n], tokenCounts: [10n], tokenPrices: [1n], workIds: [workId],
    };
    const create = (clients: typeof initiator, recipient: Address) => createProject(clients, { address: factory, abi: ProjectFactoryAbi }, { ...params, recipient });
    const first = await create(initiator, bob.account);
    const second = await create(initiator, carol.account);
    const project = first.projectDetails.assuranceContractAddress;
    const bobState = await getProjectWorkState(machinery, factory, project);
    const carolState = await getProjectWorkState(machinery, factory, second.projectDetails.assuranceContractAddress);
    assert.ok(bobState && carolState);
    assert.equal(bobState.beneficiaryId, walletWorkBeneficiaryId(bob.account));
    assert.equal(bobState.items[0].hash, workIdHash(workId, bobState.beneficiaryId));
    assert.notEqual(bobState.items[0].hash, carolState.items[0].hash);
    assert.equal(bobState.thirdParty, true);
    assert.equal(bobState.acceptedAt, 0n);
    await assert.rejects(create(carol, bob.account), /ContentAlreadyRegistered/);
    await assert.rejects(acceptWorkProject(carol, factory, project));
    await acceptWorkProject(bob, factory, project);
    const accepted = await getProjectWorkState(machinery, factory, project);
    assert.ok(accepted && accepted.acceptedAt > 0n);
    assert.equal(accepted.succeeded, false);
    await vetoWorkProject(bob, factory, project);
    const vetoed = await getProjectWorkState(machinery, factory, project);
    assert.ok(vetoed?.cancelled && vetoed.failed);
    const retry = await create(bob, bob.account);
    const retried = await getProjectWorkState(machinery, factory, retry.projectDetails.assuranceContractAddress);
    assert.equal(retried?.thirdParty, false);
    await waitForIndexerToSyncToTxHash(machinery, bob.publicClient, retry.hash);
    const events = await fetchEvents(machinery, { contractAddress: registry, eventName: 'WorkItemRegistered', topic1: bobState.items[0].hash });
    const registrations = events.map(event => decodeEventLog({
      abi: ContentRegistryAbi, eventName: 'WorkItemRegistered', data: event.data as Hex,
      topics: [event.topic0!, event.topic1!, event.topic2!, event.topic3!] as [Hex, Hex, Hex, Hex],
    }).args);
    assert.equal(registrations.length, 2);
    assert.ok(registrations.every(event => event.beneficiaryId === bobState.beneficiaryId && event.workId === workId));
    assert.deepEqual(registrations.map(event => event.creator.toLowerCase()).sort(), [initiator.account.toLowerCase(), bob.account.toLowerCase()].sort());
  });
});
