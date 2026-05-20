// Publish a new IPNS revision pointing at the given IPFS CID.
//
// Environment variables (all required):
//   IPNS_PRIVATE_KEY  - base64-encoded w3name private key bytes
//   IPFS_CID          - IPFS CID to point the name at (e.g. "bafybeib...")
//
// On first publish, creates a v0 revision. On subsequent publishes, resolves
// the current revision and increments it so the sequence number monotonically
// advances (required for the w3name service to accept the update).

import * as Name from 'w3name';

const privateKeyBase64 = process.env.IPNS_PRIVATE_KEY;
const cid = process.env.IPFS_CID;

if (!privateKeyBase64 || !cid) {
  console.error('Missing required environment variables.');
  console.error('Required: IPNS_PRIVATE_KEY, IPFS_CID');
  process.exit(1);
}

const keyBytes = Buffer.from(privateKeyBase64, 'base64');
const name = await Name.from(keyBytes);
const value = `/ipfs/${cid}`;

console.log(`IPNS name: ${name.toString()}`);
console.log(`New value: ${value}`);

let revision;
try {
  const current = await Name.resolve(name);
  console.log(`Current value: ${current.value}`);
  console.log(`Current sequence: ${current.sequence}`);
  revision = await Name.increment(current, value);
} catch (err) {
  // First publish, or record expired and was garbage-collected.
  console.log(`No current revision found (${err.message}); creating v0.`);
  revision = await Name.v0(name, value);
}

console.log(`Publishing revision (sequence ${revision.sequence})...`);
await Name.publish(revision, name.key);

console.log('');
console.log('IPNS revision published.');
console.log(`  Name:     ${name.toString()}`);
console.log(`  Value:    ${value}`);
console.log(`  Sequence: ${revision.sequence}`);
console.log('');
console.log('Verify with:');
console.log(`  npx w3name get ${name.toString()}`);
console.log('  or visit any subdomain whose contenthash / DNSLink references this name.');
