import hre from 'hardhat';
import { ethers } from hre;

const { ethers: ethersObj } = hre;

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

  getWalletForUser(user) {
    return new ethersObj.Wallet(user.privateKey, ethersObj.provider);
  }

  getRandomUser() {
    return this.users[Math.floor(Math.random() * this.users.length)];
  }

  getRandomStatement() {
    return this.statements[Math.floor(Math.random() * this.statements.length)];
  }

  async createSybilWallets(count = 100) {
    console.log(`\n  Creating ${count} Sybil identities...`);
    const wallet = this.users[0] ? this.getWalletForUser(this.users[0]) : null;
    
    if (!wallet) {
      console.log('  No user wallet available for funding Sybil accounts');
      return [];
    }

    const sybilWallets = [];
    const fundAmount = ethersObj.parseEther('0.01');

    for (let i = 0; i < count; i++) {
      const sybil = ethersObj.Wallet.createRandom();
      sybilWallets.push({
        address: sybil.address,
        privateKey: sybil.privateKey,
        id: `sybil_${i}`
      });

      try {
        const tx = await wallet.sendTransaction({
          to: sybil.address,
          value: fundAmount
        });
        await tx.wait();
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
        const wallet = new ethersObj.Wallet(sybil.privateKey, ethersObj.provider);
        const beliefs = this.contracts.beliefs.connect(wallet);

        const tx = await beliefs.setBelief(targetStatement.statementId, 1);
        await tx.wait();
        
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

    const wallet = this.getWalletForUser(spammer);
    let successfulSpam = 0;

    for (let i = 0; i < numStatements; i++) {
      try {
        const statementContent = {
          text: `Spam statement ${i}: ${Math.random().toString(36).substring(7)}`,
          domain: 'spam',
          position: 'junk',
          quality: 'low'
        };

        // Create statement on chain
        const beliefs = this.contracts.beliefs.connect(wallet);
        
        // Generate a random statement ID for spam
        const spamId = ethersObj.keccak256(
          ethersObj.toUtf8Bytes(`spam_${i}_${Date.now()}`)
        );

        const tx = await beliefs.setBelief(spamId, 1);
        await tx.wait();

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

    const wallet = this.getWalletForUser(attacker);
    const implications = this.contracts.implications.connect(wallet);
    
    let successfulAttestations = 0;

    for (let i = 0; i < numAttestations; i++) {
      try {
        const stmt1 = this.getRandomStatement();
        const stmt2 = this.getRandomStatement();

        if (stmt1.id === stmt2.id) continue;

        // Malicious attester creates false implications
        const tx = await implications.attestImplication(
          stmt1.statementId,
          stmt2.statementId
        );
        await tx.wait();

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

    const wallet = this.getWalletForUser(attacker);
    const pubstarter = this.contracts.pubstarter.connect(wallet);
    
    let exploitationAttempts = 0;

    // Attack 1: Create project with unrealistic threshold to exploit commission
    try {
      const threshold = ethersObj.parseEther('0.001'); // Very low threshold
      const deadline = Math.floor(Date.now() / 1000) + (1 * 24 * 60 * 60);
      
      const tx = await pubstarter.pubstart(
        attacker.address,
        threshold,
        deadline,
        'ipfs://QmExploit1',
        'https://example.com/',
        'https://example.com/',
        [1, 2],
        [100, 100],
        [
          ethersObj.parseEther('0.001'),
          ethersObj.parseEther('0.0005')
        ]
      );
      await tx.wait();
      
      exploitationAttempts++;
      this.results.commissionExploitation.actions.push({
        type: 'low_threshold_exploit',
        threshold: threshold.toString()
      });
    } catch (err) {
      // May fail
    }

    // Attack 2: Attempt to withdraw before deadline
    const projects = await this.getCreatedProjects(pubstarter);
    for (const project of projects.slice(0, 3)) {
      try {
        const assurance = await ethersObj.getContractAt(
          'MultiERC1155_AssuranceContract',
          project.assuranceContract,
          wallet
        );
        
        // Try to withdraw immediately (should fail in properly secured contract)
        const tx = await assurance.withdraw();
        await tx.wait();
        
        exploitationAttempts++;
        this.results.commissionExploitation.actions.push({
          type: 'early_withdraw_exploit',
          project: project.erc1155
        });
      } catch (err) {
        // Expected to fail in properly secured contract
      }
    }

    this.results.commissionExploitation.detected = exploitationAttempts > 0;
    this.results.commissionExploitation.impact = {
      attempts: exploitationAttempts
    };

    console.log(`  Commission exploitation: ${exploitationAttempts} attempts`);
    return this.results.commissionExploitation;
  }

  async getCreatedProjects(pubstarter) {
    const filter = pubstarter.filters.ProjectCreated;
    const logs = await pubstarter.queryFilter(filter);
    return logs.map(log => ({
      erc1155: log.args.erc1155,
      marketplace: log.args.marketplace,
      assuranceContract: log.args.assuranceContract
    }));
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
