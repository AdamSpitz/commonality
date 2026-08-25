import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CSM_MISSION_STATEMENT_CID,
  CSM_MISSION_STATEMENT_DOCUMENT,
  CSM_MISSION_STATEMENT_TEXT,
} from '../../sdk/src/subsystems/conceptspace/constants.js';
import { publishedDataCidForDocument } from '../../sdk/src/subsystems/displayable-documents/displayable-document.js';
import { getSeedProjectAlignmentRef, getSeedProjectMetadata } from '../fundingAndDelegationActions.js';
import {
  buildContractMetadata,
  buildProspectiveRoundMetadata,
  SEED_CONTENT_ALIGNMENT_REF,
  seedMaterializedContentCanonicalId,
  seedMixedContentAlignmentCanonicalIds,
} from '../contentFundingActions.js';
import {
  BRIDGE_CLUSTER_KIND,
  BRIDGE_CLUSTER_SCHEMA_VERSION,
  buildSeedClusterDocument,
  buildSeedRosterDocument,
  CAUSE_BOOKMARKS_SCHEMA_VERSION,
  ROSTER_KIND,
  ROSTER_SCHEMA_VERSION,
  SEED_CAUSE_OWNER_ADDRESS,
  SEED_CAUSE_SLUG,
  seedCauseRosterFields,
  serializeSeedCauseBookmarkList,
} from '../seedCauseRoster.js';
import {
  CHRISTIANITY_CAUSE_SLUG,
  CHRISTIANITY_PLANKS,
  CHRISTIANITY_PROJECTS,
  SECULAR_CONSERVATIVE_CAUSE_SLUG,
  SECULAR_CONSERVATIVE_PLANKS,
  secularConservativeRosterFields,
  CHRISTIAN_MEDIATOR_ADDRESS,
  CHRISTIAN_MEDIATOR_NAME,
  christianityRosterFields,
  CHRISTIAN_SECULAR_CLUSTER_SLUG,
  CHRISTIAN_MODIFIED_CAUSE_SLUG,
  SECULAR_MODIFIED_CAUSE_SLUG,
  CHRISTIAN_SECULAR_BRIDGE_CAUSE_SLUG,
  christianModifiedRosterFields,
  secularModifiedRosterFields,
  christianSecularBridgeRosterFields,
  christianSecularClusterFields,
} from '../seedChristianityCause.js';
import {
  BLESSED_MODIFIED_TO_COMMONALITY,
  NATURAL_TO_MODIFIED_NUDGES,
} from '../christianSecularBridge.js';
import { seedChristianContentAlignmentCanonicalIds } from '../contentFundingActions.js';
import { createStatementDocumentFromSeed, flattenSeedStatements, loadSeedCollections } from '../seed-content-format.js';

test('seed LazyGiving projects have human-readable metadata', () => {
  const metadata = getSeedProjectMetadata(1);

  assert.equal(metadata.name, 'Bridge-Building Workshop Series');
  assert.match(metadata.description, /coordinate on shared goals/i);
  assert.equal(metadata.seedProjectKind, 'finding-common-ground');
  assert.deepEqual(getSeedProjectAlignmentRef(1), {
    collectionId: 'fundable-projects',
    groupId: 'finding-common-ground',
    statementId: 'common-ground-across-divides',
  });
  assert.doesNotMatch(metadata.name, /^Project 0x/i);
});

test('the first seed LazyGiving project is a local public-goods storyline', async () => {
  // Project 0 is the one the deterministic funding/success seeding covers, so the local
  // storyline has to sit there for use cases A1/A5/E2 to be demonstrable in the UI.
  const metadata = getSeedProjectMetadata(0);
  const alignmentRef = getSeedProjectAlignmentRef(0);

  assert.equal(metadata.name, 'Riverside Community Garden');
  assert.equal(metadata.seedProjectKind, 'local-community');
  assert.equal(alignmentRef.groupId, 'local-community');

  // The cause statement it aligns to must actually exist in the seed content.
  const records = flattenSeedStatements(await loadSeedCollections());
  const aligned = records.find((record) =>
    record.collection.id === alignmentRef.collectionId &&
    record.group.id === alignmentRef.groupId &&
    record.statement.id === alignmentRef.statementId);
  assert.ok(aligned, `seed content has no statement for ${JSON.stringify(alignmentRef)}`);
});

test('every seed project alignment ref resolves to a seed statement', async () => {
  const records = flattenSeedStatements(await loadSeedCollections());

  for (let index = 0; index < 6; index++) {
    const ref = getSeedProjectAlignmentRef(index);
    const match = records.find((record) =>
      record.collection.id === ref.collectionId &&
      record.group.id === ref.groupId &&
      record.statement.id === ref.statementId);
    assert.ok(match, `seed project ${index} aligns to a missing statement ${JSON.stringify(ref)}`);
  }
});

test('CSM mission statement seed content matches the well-known SDK constant and CID', async () => {
  const csmRecords = flattenSeedStatements(await loadSeedCollections()).filter((record) => record.collection.id === 'csm');

  assert.equal(csmRecords.length, 1);
  assert.equal(csmRecords[0]!.statement.text, CSM_MISSION_STATEMENT_TEXT);
  assert.deepEqual(createStatementDocumentFromSeed(csmRecords[0]!), CSM_MISSION_STATEMENT_DOCUMENT);
  // The well-known constant is the PublishedData CID (raw multicodec) the document gets
  // when published through a DocumentStore, not the legacy dag-pb `ipfs add` CID.
  assert.equal(
    publishedDataCidForDocument(createStatementDocumentFromSeed(csmRecords[0]!)),
    CSM_MISSION_STATEMENT_CID,
  );
});

test('content-funding seed contracts use uploadable metadata instead of fake IPFS IDs', () => {
  const metadata = buildContractMetadata(
    'substack:smartwriter',
    ['my-first-big-piece'],
    false,
  );

  assert.equal(metadata.name, 'Smart Writer creator content fund');
  assert.equal(metadata.creatorDisplayName, 'Smart Writer');
  assert.equal(metadata.contractType, 'creator');
  assert.deepEqual(metadata.contentSuffixes, ['my-first-big-piece']);
  assert.doesNotMatch(JSON.stringify(metadata), /fake-metadata/);
});

test('content-funding seed includes prospective and materialized round metadata', () => {
  const open = buildProspectiveRoundMetadata('youtube:channel:UCaaaaaaaaaaaaaaaaaaaaaaaa', 'open');
  const done = buildProspectiveRoundMetadata('substack:smartwriter', 'materialized');

  assert.match(open.name, /upcoming series/i);
  assert.equal(open.roundStatus, 'open');
  assert.equal(done.roundStatus, 'materialized');
  assert.equal(seedMaterializedContentCanonicalId(), 'substack:smartwriter/civic-garden-explainer');
});

test('seed content contracts leave a mixed attested/unattested batch for the cause board', async () => {
  const records = flattenSeedStatements(await loadSeedCollections());
  const plank = records.find((record) =>
    record.collection.id === SEED_CONTENT_ALIGNMENT_REF.collectionId &&
    record.group.id === SEED_CONTENT_ALIGNMENT_REF.groupId &&
    record.statement.id === SEED_CONTENT_ALIGNMENT_REF.statementId);
  assert.ok(plank, 'content-alignment plank must exist in seed statements');

  const attested = seedMixedContentAlignmentCanonicalIds();
  assert.equal(attested.length, 1);
  assert.equal(attested[0], 'twitter:uid:111111111:1000000000000000001');
  assert.notEqual(attested[0], 'twitter:uid:111111111:1000000000000000002');
});

test('local-food-systems seed ref matches the mapping keys used by tiny seed injection', async () => {
  const records = flattenSeedStatements(await loadSeedCollections());
  const plank = records.find((record) =>
    record.collection.id === SEED_CONTENT_ALIGNMENT_REF.collectionId &&
    record.group.id === SEED_CONTENT_ALIGNMENT_REF.groupId &&
    record.statement.id === SEED_CONTENT_ALIGNMENT_REF.statementId);
  assert.ok(plank);
  assert.equal(plank.collection.id, 'fundable-projects');
  assert.equal(plank.group.id, 'local-community');
  assert.match(plank.statement.text, /local food systems/);
});

test('seed cause roster is a CauseStarter document owned by Hardhat #0', () => {
  const fields = seedCauseRosterFields('bafkreiplankcid');
  const doc = buildSeedRosterDocument(fields);
  assert.equal(doc.extras?.kind, ROSTER_KIND);
  assert.equal(doc.extras?.version, ROSTER_SCHEMA_VERSION);
  assert.deepEqual(doc.extras?.plankCids, ['bafkreiplankcid']);
  assert.match(doc.content, /# Local food systems/);
  assert.equal(SEED_CAUSE_SLUG, 'local-food-systems');
  assert.equal(
    SEED_CAUSE_OWNER_ADDRESS.toLowerCase(),
    '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
  );

  const bookmarks = JSON.parse(serializeSeedCauseBookmarkList([
    { owner: SEED_CAUSE_OWNER_ADDRESS, slug: SEED_CAUSE_SLUG },
  ]));
  assert.equal(bookmarks.version, CAUSE_BOOKMARKS_SCHEMA_VERSION);
  assert.deepEqual(bookmarks.causes, [{
    owner: SEED_CAUSE_OWNER_ADDRESS.toLowerCase(),
    slug: SEED_CAUSE_SLUG,
  }]);
});

test('christianity seed roster includes the example mediator and distinct planks', () => {
  const plankCids = ['bafkreiplank1', 'bafkreiplank2', 'bafkreiplank3', 'bafkreiplank4'];
  const fields = christianityRosterFields(plankCids);
  const doc = buildSeedRosterDocument(fields);
  assert.equal(CHRISTIANITY_CAUSE_SLUG, 'christianity');
  assert.equal(fields.title, 'Christianity');
  assert.equal(CHRISTIANITY_PLANKS.length, 4);
  assert.equal(CHRISTIANITY_PROJECTS.length, 10);
  assert.ok(CHRISTIANITY_PROJECTS.some((project) => project.kind === 'campus-ministry'));
  assert.ok(CHRISTIANITY_PROJECTS.some((project) => project.alignments.includes('abortion/modified-christian')));
  assert.ok(CHRISTIANITY_PROJECTS.some((project) => project.alignments.includes('scripture/natural-christian')));
  assert.ok(CHRISTIANITY_PROJECTS.some((project) => project.alignments.includes('colorblind-merit/natural-secular')));
  assert.match(fields.mediatorBlurb, /secular-conservative/i);
  assert.equal(fields.mediator?.name, CHRISTIAN_MEDIATOR_NAME);
  assert.equal(fields.mediator?.address.toLowerCase(), CHRISTIAN_MEDIATOR_ADDRESS.toLowerCase());
  assert.match(fields.mediator?.serviceUrl ?? '', /^https?:\/\//);
  assert.deepEqual(doc.extras?.mediator, fields.mediator);
  assert.match(doc.content, /# Christianity/);
  assert.equal(seedChristianContentAlignmentCanonicalIds().length, 1);
});

test('secular-conservative seed roster is a distinct founder cause', () => {
  const plankCids = ['bafkreiplankA', 'bafkreiplankB', 'bafkreiplankC', 'bafkreiplankD'];
  const fields = secularConservativeRosterFields(plankCids);
  assert.equal(SECULAR_CONSERVATIVE_CAUSE_SLUG, 'secular-conservatism');
  assert.equal(fields.title, 'Secular conservatism');
  assert.equal(SECULAR_CONSERVATIVE_PLANKS.length, 4);
  assert.equal(fields.mediatorBlurb, '');
});

test('christian-secular seed cluster documents match CauseStarter extras', () => {
  const modifiedCids = ['bafymc1', 'bafymc2', 'bafymc3'];
  const modified = christianModifiedRosterFields(modifiedCids);
  const modifiedDoc = buildSeedRosterDocument(modified);
  assert.equal(modified.bridgeCluster?.role, 'modified');
  assert.equal(modified.bridgeCluster?.clusterSlug, CHRISTIAN_SECULAR_CLUSTER_SLUG);
  assert.equal(modified.bridgeCluster?.parentSlug, CHRISTIANITY_CAUSE_SLUG);
  assert.equal(modifiedDoc.extras?.kind, ROSTER_KIND);
  assert.deepEqual(modifiedDoc.extras?.bridgeCluster, {
    clusterOwner: CHRISTIAN_MEDIATOR_ADDRESS.toLowerCase(),
    clusterSlug: CHRISTIAN_SECULAR_CLUSTER_SLUG,
    role: 'modified',
    parentOwner: SEED_CAUSE_OWNER_ADDRESS.toLowerCase(),
    parentSlug: CHRISTIANITY_CAUSE_SLUG,
  });

  const secularModified = secularModifiedRosterFields(['bafyms1']);
  assert.equal(secularModified.bridgeCluster?.parentSlug, SECULAR_CONSERVATIVE_CAUSE_SLUG);
  assert.equal(SECULAR_MODIFIED_CAUSE_SLUG, 'christian-secular-secular-conservatism-modified');

  const bridge = christianSecularBridgeRosterFields(['bafycg1']);
  const bridgeDoc = buildSeedRosterDocument(bridge);
  assert.equal(bridge.bridgeCluster?.role, 'bridge');
  assert.equal(bridge.bridgeCluster?.parentSlug, undefined);
  assert.deepEqual(bridgeDoc.extras?.bridgeCluster, {
    clusterOwner: CHRISTIAN_MEDIATOR_ADDRESS.toLowerCase(),
    clusterSlug: CHRISTIAN_SECULAR_CLUSTER_SLUG,
    role: 'bridge',
  });
  assert.equal(CHRISTIAN_MODIFIED_CAUSE_SLUG.length <= 64, true);
  assert.equal(CHRISTIAN_SECULAR_BRIDGE_CAUSE_SLUG, 'christian-secular-bridge');

  const cids = new Map<string, `b${string}`>([
    ['abortion/modified-christian', 'bafymcab'],
    ['abortion/commonality', 'bafycgab'],
    ['abortion/modified-secular', 'bafymsab'],
    ['markets/modified-christian', 'bafymcmc'],
    ['markets/commonality', 'bafycgmc'],
    ['markets/modified-secular', 'bafymsmc'],
    ['lgbt/modified-christian', 'bafymclg'],
    ['lgbt/commonality', 'bafycglg'],
    ['lgbt/modified-secular', 'bafymslg'],
  ]);
  const cluster = christianSecularClusterFields(cids);
  assert.equal(cluster.pairs.length, 6);
  assert.ok(cluster.pairs.every((pair) => pair.role === 'modified-to-bridge'));
  const clusterDoc = buildSeedClusterDocument(cluster);
  assert.equal(clusterDoc.extras?.kind, BRIDGE_CLUSTER_KIND);
  assert.equal(clusterDoc.extras?.version, BRIDGE_CLUSTER_SCHEMA_VERSION);
  assert.equal(clusterDoc.extras?.mediatorAddress, CHRISTIAN_MEDIATOR_ADDRESS.toLowerCase());
  assert.match(clusterDoc.content, /Natural parents/);
});

test('christian-secular bridge has parent→modified nudges and blessed modified→CG arrows', () => {
  assert.equal(NATURAL_TO_MODIFIED_NUDGES.length, 6);
  assert.equal(BLESSED_MODIFIED_TO_COMMONALITY.length, 6);
  for (const pair of NATURAL_TO_MODIFIED_NUDGES) {
    assert.match(pair.target, /\/natural-/);
    assert.match(pair.suggested, /\/modified-/);
  }
  for (const pair of BLESSED_MODIFIED_TO_COMMONALITY) {
    assert.match(pair.from, /\/modified-/);
    assert.match(pair.to, /\/commonality$/);
  }
});
