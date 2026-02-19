import { createPublicClient, createWalletClient, http, parseEther, keccak256, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  BeliefsAbi,
  ImplicationsAbi,
  PubstarterAbi,
  AssuranceContractAbi,
  cidToBytes32,
} from '@commonality/sdk';
import { loadEnv, CONTRACT_ADDRESSES, RPC_URL } from './loadEnv.js';

loadEnv();

const hardhat = {
  id: 31337,
  name: 'Hardhat',
  network: 'hardhat',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['http://localhost:8545'] },
    public: { http: ['http://localhost:8545'] },
  },
};

const BELIEVES = 1;

function createTestClients(privateKey, rpcUrl = RPC_URL) {
  const account = privateKeyToAccount(privateKey);

  const walletClient = createWalletClient({
    account,
    chain: hardhat,
    transport: http(rpcUrl),
  });

  const publicClient = createPublicClient({
    chain: hardhat,
    transport: http(rpcUrl),
  });

  return {
    walletClient,
    publicClient,
    account: account.address,
  };
}

async function believeStatement(clients, contract, statementId) {
  const hash = await clients.walletClient.writeContract({
    address: contract.address,
    abi: contract.abi,
    functionName: 'setBelief',
    args: [statementId, BELIEVES],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account,
  });
  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

async function attestImplication(clients, contract, fromStatementId, toStatementId, explanationId = '0x0000000000000000000000000000000000000000000000000000000000000000') {
  const hash = await clients.walletClient.writeContract({
    address: contract.address,
    abi: contract.abi,
    functionName: 'attestImplication',
    args: [fromStatementId, toStatementId, explanationId],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account,
  });
  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

class AttackScenarios {
  constructor(contracts, users, statements) {
    this.contracts = contracts;
    this.users = users;
    this.statements = statements;
    this.sybilWallets = [];
    this.spamStatements = [];
    this.maliciousAttestations = [];
    this.results = {
      sybil: { detected: false, impact: null, actions: [] },
      spam: { detected: false, impact: null, actions: [] },
      maliciousAttester: { detected: false, impact: null, actions: [] },
      commissionExploitation: { detected: false, impact: null, actions: [] }
    };
  }

  getClientsForUser(user) {
    return createTestClients(user.privateKey, RPC_URL);
  }

  getRandomUser() {
    return this.users[Math.floor(Math.random() * this.users.length)];
  }

  getRandomStatement() {
    return this.statements[Math.floor(Math.random() * this.statements.length)];
  }

  async createSybilWallets(count = 100) {
    console.log(`\n  Creating ${count} Sybil identities...`);
    const clients = this.getClientsForUser(this.users[0]);
    const funderAddress = clients.account;
    
    if (!clients) {
      console.log('  No user wallet available for funding Sybil accounts');
      return [];
    }

    const publicClient = createPublicClient({
      chain: hardhat,
      transport: http(RPC_URL)
    });

    const sybilWallets = [];
    const fundAmount = parseEther('0.01');

    for (let i = 0; i < count; i++) {
      const sybil = privateKeyToAccount('0x' + Math.random().toString(16).slice(2).padStart(64, '0'));
      sybilWallets.push({
        address: sybil.address,
        privateKey: sybil.privateKey,
        id: `sybil_${i}`
      });

      try {
        const hash = await clients.walletClient.sendTransaction({
          to: sybil.address,
          value: fundAmount
        });
        await publicClient.waitForTransactionReceipt({ hash });
      } catch (err) {
        console.log(`  Failed to fund Sybil wallet ${i}: ${err.message}`);
      }

      if ((i + 1) % 20 === 0) {
        console.log(`    Created ${i + 1}/${count} Sybil identities`);
      }
    }

    this.sybilWallets = sybilWallets;
    console.log(`  Created ${sybilWallets.length} Sybil identities`);
    return sybilWallets;
  }

  async sybilAttack(targetUser, numAttacks = 50) {
    console.log(`\n  Executing Sybil attack with ${numAttacks} fake identities...`);
    
    if (this.sybilWallets.length === 0) {
      await this.createSybilWallets(numAttacks);
    }

    const targetStatement = this.getRandomStatement();
    const attackWallets = this.sybilWallets.slice(0, numAttacks);
    let successfulAttacks = 0;

    for (const sybil of attackWallets) {
      try {
        const clients = createTestClients(sybil.privateKey, RPC_URL);
        const targetStatementId = cidToBytes32(targetStatement.statementId);

        await believeStatement(clients, this.contracts.beliefs, targetStatementId);
        
        successfulAttacks++;
        this.results.sybil.actions.push({
          type: 'belief_inflation',
          sybil: sybil.address,
          target: targetStatement.id
        });
      } catch (err) {
        // Attack may fail due to various reasons
      }
    }

    this.results.sybil.detected = true;
    this.results.sybil.impact = {
      successfulAttacks,
      totalAttempts: numAttacks,
      attackRate: successfulAttacks / numAttacks
    };

    console.log(`  Sybil attack complete: ${successfulAttacks}/${numAttacks} successful`);
    return this.results.sybil;
  }

  async spamAttack(numStatements = 100) {
    console.log(`\n  Executing spam attack with ${numStatements} low-quality statements...`);
    
    const spammer = this.users[0];
    if (!spammer) {
      console.log('  No spammer wallet available');
      return this.results.spam;
    }

    const clients = this.getClientsForUser(spammer);
    let successfulSpam = 0;

    for (let i = 0; i < numStatements; i++) {
      try {
        const statementContent = {
          text: `Spam statement ${i}: ${Math.random().toString(36).substring(7)}`,
          domain: 'spam',
          position: 'junk',
          quality: 'low'
        };

        // Generate a random statement ID for spam
        const spamId = keccak256(toBytes(`spam_${i}_${Date.now()}`));

        await believeStatement(clients, this.contracts.beliefs, spamId);

        successfulSpam++;
        this.spamStatements.push({
          id: spamId,
          content: statementContent,
          creator: spammer.address
        });

        this.results.spam.actions.push({
          type: 'statement_spam',
          statementId: spamId,
          index: i
        });
      } catch (err) {
        // Spam may fail
      }

      if ((i + 1) % 20 === 0) {
        console.log(`    Created ${i + 1}/${numStatements} spam statements`);
      }
    }

    this.results.spam.detected = true;
    this.results.spam.impact = {
      successfulSpam,
      totalAttempts: numStatements,
      spamRate: successfulSpam / numStatements
    };

    console.log(`  Spam attack complete: ${successfulSpam}/${numStatements} successful`);
    return this.results.spam;
  }

  async maliciousAttesterAttack(numAttestations = 50) {
    console.log(`\n  Executing malicious attester attack with ${numAttestations} false attestations...`);
    
    const attacker = this.users[0];
    if (!attacker) {
      console.log('  No attacker wallet available');
      return this.results.maliciousAttester;
    }

    const clients = this.getClientsForUser(attacker);
    
    let successfulAttestations = 0;

    for (let i = 0; i < numAttestations; i++) {
      try {
        const stmt1 = this.getRandomStatement();
        const stmt2 = this.getRandomStatement();

        if (stmt1.id === stmt2.id) continue;

        const stmt1Id = cidToBytes32(stmt1.statementId);
        const stmt2Id = cidToBytes32(stmt2.statementId);

        await attestImplication(clients, this.contracts.implications, stmt1Id, stmt2Id);

        successfulAttestations++;
        this.maliciousAttestations.push({
          from: stmt1.id,
          to: stmt2.id,
          attacker: attacker.address
        });

        this.results.maliciousAttester.actions.push({
          type: 'false_implication',
          from: stmt1.id,
          to: stmt2.id
        });
      } catch (err) {
        // Attestation may fail
      }

      if ((i + 1) % 10 === 0) {
        console.log(`    Created ${i + 1}/${numAttestations} false attestations`);
      }
    }

    this.results.maliciousAttester.detected = true;
    this.results.maliciousAttester.impact = {
      successfulAttestations,
      totalAttempts: numAttestations,
      successRate: successfulAttestations / numAttestations
    };

    console.log(`  Malicious attester attack complete: ${successfulAttestations}/${numAttestations} successful`);
    return this.results.maliciousAttester;
  }

  async commissionExploitationAttack() {
    console.log('\n  Executing commission exploitation attack...');
    
    const attacker = this.users[0];
    if (!attacker || !this.contracts.pubstarter) {
      console.log('  No attacker wallet or Pubstarter contract available');
      return this.results.commissionExploitation;
    }

    const clients = this.getClientsForUser(attacker);
    
    let exploitationAttempts = 0;

    // Attack 1: Create project with unrealistic threshold to exploit commission
    try {
      const threshold = parseEther('0.001'); // Very low threshold
      const deadline = Math.floor(Date.now() / 1000) + (1 * 24 * 60 * 60);
      
      await clients.walletClient.writeContract({
        address: this.contracts.pubstarter.address,
        abi: PubstarterAbi,
        functionName: 'pubstart',
        args: [
          attacker.address,
          threshold,
          deadline,
          'ipfs://QmExploit1',
          'https://example.com/',
          'https://example.com/',
          [1, 2],
          [100, 100],
          [
            parseEther('0.001'),
            parseEther('0.0005')
          ]
        ],
        chain: hardhat,
        account: clients.account,
      });
      
      exploitationAttempts++;
      this.results.commissionExploitation.actions.push({
        type: 'low_threshold_exploit',
        threshold: threshold.toString()
      });
    } catch (err) {
      // May fail
    }

    // Attack 2: Attempt to withdraw before deadline
    // Note: This would require querying for created projects, skipping for now
    // as it requires additional contract query logic

    this.results.commissionExploitation.detected = exploitationAttempts > 0;
    this.results.commissionExploitation.impact = {
      attempts: exploitationAttempts
    };

    console.log(`  Commission exploitation: ${exploitationAttempts} attempts`);
    return this.results.commissionExploitation;
  }

  getResults() {
    return this.results;
  }

  async detectAttacks() {
    console.log('\n=== Running Attack Detection ===');
    
    const detectionResults = {
      sybilDetection: false,
      spamDetection: false,
      maliciousAttestationDetection: false,
      recommendations: []
    };

    // Check for Sybil patterns
    const beliefCounts = {};
    for (const action of this.results.sybil.actions || []) {
      const key = action.target;
      beliefCounts[key] = (beliefCounts[key] || 0) + 1;
    }
    
    for (const count of Object.values(beliefCounts)) {
      if (count > 20) {
        detectionResults.sybilDetection = true;
        detectionResults.recommendations.push(
          'Sybil attack detected: Implement rate limiting per wallet or reputation system'
        );
        break;
      }
    }

    // Check for spam patterns
    if (this.spamStatements.length > 50) {
      detectionResults.spamDetection = true;
      detectionResults.recommendations.push(
        'Spam attack detected: Implement statement quality requirements or stake-based creation'
      );
    }

    // Check for malicious attestation patterns
    if (this.maliciousAttestations.length > 30) {
      detectionResults.maliciousAttestationDetection = true;
      detectionResults.recommendations.push(
        'Malicious attestations detected: Implement attester reputation and slashing'
      );
    }

    console.log('\nDetection Results:');
    console.log(`  Sybil Attack: ${detectionResults.sybilDetection ? 'DETECTED' : 'Not detected'}`);
    console.log(`  Spam Attack: ${detectionResults.spamDetection ? 'DETECTED' : 'Not detected'}`);
    console.log(`  Malicious Attestation: ${detectionResults.maliciousAttestationDetection ? 'DETECTED' : 'Not detected'}`);

    if (detectionResults.recommendations.length > 0) {
      console.log('\nRecommendations:');
      for (const rec of detectionResults.recommendations) {
        console.log(`  - ${rec}`);
      }
    }

    return detectionResults;
  }
}

export { AttackScenarios };
