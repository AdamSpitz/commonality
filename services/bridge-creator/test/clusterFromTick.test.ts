import assert from 'node:assert';
import {
  BRIDGE_CLUSTER_KIND,
  ROSTER_KIND,
  clusterDocumentFromPlan,
  planClusterFromTick,
  rosterDocumentFromPlan,
} from '../src/clusterFromTick.js';

const parentA = {
  owner: '0x1111111111111111111111111111111111111111' as const,
  slug: 'natural-left',
  side: 'side_a' as const,
};
const parentB = {
  owner: '0x2222222222222222222222222222222222222222' as const,
  slug: 'natural-right',
  side: 'side_b' as const,
};

describe('planClusterFromTick', () => {
  it('returns null without parent causes (CSM stays statement-level)', () => {
    assert.strictEqual(planClusterFromTick({
      mediatorName: 'Ada',
      mediatorNote: '',
      mediatorAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      parentCauses: [],
      triples: [{ sideACid: 'a', sideBCid: 'b', commonGroundCid: 'c' }],
    }), null);
  });

  it('lifts this tick into n+1 rosters plus a cluster document CauseStarter can parse', () => {
    const plan = planClusterFromTick({
      mediatorName: 'Ada Mediator',
      mediatorNote: 'Tick cluster',
      mediatorAddress: '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa',
      clusterSlug: 'housing-bridge',
      parentCauses: [parentA, parentB],
      triples: [{ sideACid: 'bafymoda', sideBCid: 'bafymodb', commonGroundCid: 'bafycommon' }],
    });
    assert.ok(plan);
    assert.strictEqual(plan.clusterSlug, 'housing-bridge');
    assert.strictEqual(plan.rosters.length, 3);
    assert.strictEqual(plan.cluster.mediatorAddress, '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    assert.deepStrictEqual(plan.cluster.pairs, [
      { fromCid: 'bafymoda', toCid: 'bafycommon', role: 'modified-to-bridge' },
      { fromCid: 'bafymodb', toCid: 'bafycommon', role: 'modified-to-bridge' },
    ]);
    const clusterDoc = clusterDocumentFromPlan(plan.cluster);
    assert.strictEqual((clusterDoc.extras as { kind: string }).kind, BRIDGE_CLUSTER_KIND);
    const rosterDoc = rosterDocumentFromPlan(plan.rosters[0]!);
    assert.strictEqual((rosterDoc.extras as { kind: string }).kind, ROSTER_KIND);
    assert.deepStrictEqual((rosterDoc.extras as { plankCids: string[] }).plankCids, ['bafymoda']);
    assert.deepStrictEqual((rosterDoc.extras as { bridgeCluster: Record<string, string> }).bridgeCluster, {
      clusterOwner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      clusterSlug: 'housing-bridge',
      role: 'modified',
      parentOwner: parentA.owner,
      parentSlug: parentA.slug,
    });
  });
});
