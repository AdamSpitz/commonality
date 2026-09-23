import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectPonderScript } from './selectPonderScript.mjs';

test('shared indexer keeps the caller script', () => {
  assert.equal(selectPonderScript('dev:no-ui', 'all'), 'dev:no-ui');
  assert.equal(selectPonderScript('start', ''), 'start');
  assert.equal(selectPonderScript('dev'), 'dev');
});

test('conceptspace indexer uses the config that omits funding contracts', () => {
  assert.equal(selectPonderScript('dev:no-ui', 'conceptspace'), 'dev:conceptspace:no-ui');
  assert.equal(selectPonderScript('dev', 'conceptspace'), 'dev:conceptspace');
  assert.equal(selectPonderScript('start', 'conceptspace'), 'start:conceptspace');
});
