import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const compose = fs.readFileSync(new URL('../docker-compose.yml', import.meta.url), 'utf8');
const services = fs.readFileSync(new URL('./services.sh', import.meta.url), 'utf8');

test('compose passes capability env and the gateway does not wait on funding publishers', () => {
  assert.match(compose, /INDEXER_CONTRACTS=\$\{INDEXER_CONTRACTS:-all\}/);
  assert.match(compose, /SERVICE_HOST_CAPABILITY=\$\{SERVICE_HOST_CAPABILITY:-all\}/);
  assert.equal(compose.includes('ui-ipfs-publisher-content-funding:\n        condition:'), false);
});

test('services.sh conceptspace start skips the funding platform and alignment seed', () => {
  assert.match(services, /setup-env\.sh" localhost "\$capability"/);
  assert.match(services, /COMPOSE_CAPABILITY=conceptspace has no funding operator bootstrap/);
  assert.match(services, /core_services\+=\(platform-api-service\)/);
});
