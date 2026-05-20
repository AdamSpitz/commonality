// Generate a new IPNS keypair (w3name) and print:
//   - the IPNS name (k51...), which becomes the ENS contenthash and DNSLink target
//   - the private key (base64), which the user must store in .env.secrets
//
// Environment variables: none.
//
// The private key never leaves this machine — w3name does signing locally
// and the service only sees signed records.

import * as Name from 'w3name';

const name = await Name.create();
const ipnsName = name.toString();
const privateKeyBase64 = Buffer.from(name.key.raw).toString('base64');

console.log('');
console.log('IPNS keypair generated.');
console.log('');
console.log(`  IPNS name:   ${ipnsName}`);
console.log(`  Private key: ${privateKeyBase64}`);
console.log('');
console.log('Next steps:');
console.log('  1. Store the private key in .env.secrets — DO NOT commit it.');
console.log('  2. Set the ENS contenthash to this IPNS name (one-time):');
console.log(`       ./scripts/update-ens.sh <ens-name> ${ipnsName} --network mainnet`);
console.log('  3. Set the DNSLink TXT record on the matching DNS subdomain to:');
console.log(`       dnslink=/ipns/${ipnsName}`);
console.log('  4. Publish your first CID under this name with:');
console.log('       ./scripts/publish-ipns.sh <env-var-name> <cid>');
