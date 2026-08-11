import assert from 'node:assert';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadMediatorConfigArtifact, scaffoldMediatorConfig } from '../src/mediatorConfig.js';

const validArtifact = {
  schema_version: 'provisional-v1', provisional: true, name: 'Housing mediator',
  description: 'Bridges homeowners and renters.', founding_statement: 'Make housing abundant and stable.',
  labels: { side_a: 'homeowners', side_b: 'renters' }, strategy_prompt: 'Find concrete wording both groups can sign.',
  anchors: [], context_sources: [{ service_url: 'https://beat.example' }], signer_private_key_env: 'HOUSING_MEDIATOR_KEY',
};

describe('mediator config artifact', () => {
  it('loads the provisional all-in-one founder config and resolves only the signer env name', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'mediator-')), 'config.json');
    writeFileSync(path, JSON.stringify(validArtifact));
    const loaded = loadMediatorConfigArtifact(path, { HOUSING_MEDIATOR_KEY: '0xsecret' });
    assert.deepStrictEqual(loaded.labels, { side_a: 'homeowners', side_b: 'renters' });
    assert.strictEqual(loaded.context_sources[0]?.serviceUrl, 'https://beat.example');
  });

  it('scaffolds blanks rather than shipping a strategy opinion', () => {
    const scaffold = scaffoldMediatorConfig('Make the neighborhood safer.', 'Safety mediator');
    assert.strictEqual(scaffold.provisional, true);
    assert.match(scaffold.strategy_prompt, /FOUNDER-WRITTEN/);
    assert.deepStrictEqual(scaffold.anchors, []);
  });

  it('rejects an unfilled strategy prompt and a checked-in signer value cannot substitute for env', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'mediator-')), 'config.json');
    writeFileSync(path, JSON.stringify({ ...validArtifact, strategy_prompt: 'REPLACE WITH A PROMPT' }));
    assert.throws(() => loadMediatorConfigArtifact(path, { HOUSING_MEDIATOR_KEY: 'x' }), /founder-written/);
    writeFileSync(path, JSON.stringify(validArtifact));
    assert.throws(() => loadMediatorConfigArtifact(path, {}), /signer secret environment variable/);
  });
});
