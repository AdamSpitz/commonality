import assert from 'node:assert/strict';
import { createDecipheriv } from 'node:crypto';
import test from 'node:test';
import { encryptTestData } from '../testDataArtifacts.js';

test('encryptTestData emits a browser-compatible AES-GCM envelope', () => {
  const key = Buffer.alloc(32, 7);
  const encrypted = encryptTestData({ hello: 'world' }, key, Buffer.alloc(12, 3));
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(encrypted.iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64url'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, 'base64url')),
    decipher.final(),
  ]);
  assert.deepEqual(JSON.parse(plaintext.toString()), { hello: 'world' });
});
