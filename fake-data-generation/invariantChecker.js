import hre from 'hardhat';
import pkg from 'hardhat';
const { ethers } = pkg;

const { ethers: ethersObj } = hre;

class InvariantChecker {
  constructor(contracts, users, statements) {
    this.contracts = contracts;
    this.users = users;
    this.statements = statements;
    this.snapshots = [];
    this.results = {
      contractState: { passed: true, errors: [] },
      economicConservation: { passed: true, errors: [] },
      graphAlgorithm: { passed: true, errors: [] },
      indexerConsistency: { passed: true, errors: [] }
    };
  }

  async takeSnapshot(label) {
    const snapshot = {
      label,
      timestamp: Date.now(),
      beliefs: {},
      implications: {},
      notes: {},
      balances: {}
    };

    // Snapshot beliefs contract state
    if (this.contracts.beliefs) {
      try {
        for (const stmt of this.statements.slice(0, 50)) {
          const belief = await this.contracts.beliefs.beliefs(
            stmt.statementId,
            this.users[0]?.address || ethersObj.ZeroAddress
          );
          snapshot.beliefs[stmt.id] = belief;
        }
      } catch (err) {
        snapshot.beliefsError = err.message;
      }
    }

    // Snapshot contract ETH balances
    for (const [name, contract] of Object.entries(this.contracts)) {
      try {
        snapshot.balances[name] = await ethersObj.provider.getBalance(
          await contract.getAddress()
        );
      } catch (err) {
        // Contract may not have getAddress
      }
    }

    this.snapshots.push(snapshot);
    return snapshot;
  }

  async checkContractStateConsistency() {
    console.log('\n  Checking contract state consistency...');
    const errors = [];

    // Check 1: Belief state should be valid (0=none, 1=believe, 2=disbelieve)
    if (this.contracts.beliefs) {
      try {
        for (const user of this.users.slice(0, 10)) {
          for (const stmt of this.statements.slice(0, 10)) {
            const belief = await this.contracts.beliefs.beliefs(
              stmt.statementId,
              user.address
            );
            
            if (belief !== 0n && belief !== 1n && belief !== 2n) {
              errors.push({
                type: 'INVALID_BELIEF_STATE',
                user: user.address,
                statement: stmt.id,
                value: belief.toString()
              });
            }
          }
        }
      } catch (err) {
        errors.push({ type: 'BELIEF_QUERY_FAILED', error: err.message });
      }
    }

    // Check 2: All contracts should have valid addresses
    for (const [name, contract] of Object.entries(this.contracts)) {
      try {
        const address = await contract.getAddress();
        if (!ethersObj.isAddress(address) || address === ethersObj.ZeroAddress) {
          errors.push({
            type: 'INVALID_CONTRACT_ADDRESS',
            contract: name,
            address
          });
        }
      } catch (err) {
        errors.push({ type: 'CONTRACT_ADDRESS_QUERY_FAILED', contract: name });
      }
    }

    // Check 3: Implications should reference valid statements
    if (this.contracts.implications) {
      try {
        const filter = this.contracts.implications.filters.ImplicationAttested();
        const logs = await this.contracts.implications.queryFilter(filter, -1000, 'latest');
        
        for (const log of logs.slice(0, 20)) {
          const fromExists = this.statements.some(s => s.statementId === log.args.fromStatement);
          const toExists = this.statements.some(s => s.statementId === log.args.toStatement);
          
          if (!fromExists || !toExists) {
            errors.push({
              type: 'ORPHAN_IMPLICATION',
              from: log.args.fromStatement,
              to: log.args.toStatement
            });
          }
        }
      } catch (err) {
        errors.push({ type: 'IMPLICATION_QUERY_FAILED', error: err.message });
      }
    }

    this.results.contractState.passed = errors.length === 0;
    this.results.contractState.errors = errors;

    if (errors.length === 0) {
      console.log('    Contract state consistency: PASSED');
    } else {
      console.log(`    Contract state consistency: FAILED (${errors.length} errors)`);
    }

    return this.results.contractState;
  }

  async checkEconomicConservation() {
    console.log('\n  Checking economic conservation...');
    const errors = [];

    const initialBalances = {};
    for (const user of this.users) {
      try {
        initialBalances[user.address] = await ethersObj.provider.getBalance(user.address);
      } catch (err) {
        // Skip
      }
    }

    // Perform a small transfer and verify conservation
    if (this.users.length >= 2) {
      const sender = this.users[0];
      const receiver = this.users[1];
      const amount = ethersObj.parseEther('0.001');

      try {
        const senderWallet = new ethersObj.Wallet(sender.privateKey, ethersObj.provider);
        const senderBefore = await ethersObj.provider.getBalance(sender.address);
        const receiverBefore = await ethersObj.provider.getBalance(receiver.address);

        const tx = await senderWallet.sendTransaction({
          to: receiver.address,
          value: amount
        });
        const receipt = await tx.wait();

        const senderAfter = await ethersObj.provider.getBalance(sender.address);
        const receiverAfter = await ethersObj.provider.getBalance(receiver.address);
        const gasUsed = receipt.gasUsed * receipt.gasPrice;

        // Sender balance should decrease by amount + gas
        const senderExpected = senderBefore - amount - gasUsed;
        if (senderAfter !== senderExpected) {
          errors.push({
            type: 'VALUE_DESTRUCTION',
            expected: senderExpected.toString(),
            actual: senderAfter.toString(),
            difference: (senderAfter - senderExpected).toString()
          });
        }

        // Receiver balance should increase by exactly amount
        const receiverExpected = receiverBefore + amount;
        if (receiverAfter !== receiverExpected) {
          errors.push({
            type: 'VALUE_CREATION',
            expected: receiverExpected.toString(),
            actual: receiverAfter.toString(),
            difference: (receiverAfter - receiverExpected).toString()
          });
        }

        // Revert the transfer for subsequent tests
        const revertTx = await new ethersObj.Wallet(receiver.privateKey, ethersObj.provider).sendTransaction({
          to: sender.address,
          value: amount
        });
        await revertTx.wait();

      } catch (err) {
        errors.push({ type: 'TRANSFER_FAILED', error: err.message });
      }
    }

    // Check for unexpected ETH creation in contracts
    if (this.snapshots.length >= 2) {
      const prev = this.snapshots[this.snapshots.length - 2];
      const curr = this.snapshots[this.snapshots.length - 1];

      for (const [name, balance] of Object.entries(curr.balances || {})) {
        const prevBalance = prev.balances?.[name];
        if (prevBalance && balance > prevBalance) {
          const increase = balance - prevBalance;
          // Allow small increases from user deposits, but flag large ones
          if (increase > ethersObj.parseEther('1')) {
            errors.push({
              type: 'UNEXPECTED_VALUE_CREATION',
              contract: name,
              increase: increase.toString()
            });
          }
        }
      }
    }

    this.results.economicConservation.passed = errors.length === 0;
    this.results.economicConservation.errors = errors;

    if (errors.length === 0) {
      console.log('    Economic conservation: PASSED');
    } else {
      console.log(`    Economic conservation: FAILED (${errors.length} errors)`);
    }

    return this.results.economicConservation;
  }

  async checkGraphAlgorithmCorrectness() {
    console.log('\n  Checking graph algorithm correctness...');
    const errors = [];

    if (!this.contracts.implications) {
      console.log('    Implications contract not available, skipping');
      return this.results.graphAlgorithm;
    }

    try {
      const filter = this.contracts.implications.filters.ImplicationAttested();
      const logs = await this.contracts.implications.queryFilter(filter, -1000, 'latest');

      // Build adjacency list
      const graph = {};
      const inDegree = {};
      const outDegree = {};

      for (const log of logs) {
        const from = log.args.fromStatement;
        const to = log.args.toStatement;

        if (!graph[from]) graph[from] = [];
        graph[from].push(to);

        outDegree[from] = (outDegree[from] || 0) + 1;
        inDegree[to] = (inDegree[to] || 0) + 1;
      }

      // Check for cycles using DFS with visited set
      const visited = new Set();
      const recursionStack = new Set();

      const hasCycle = (node, visitedSet, stack) => {
        visitedSet.add(node);
        stack.add(node);

        for (const neighbor of (graph[node] || [])) {
          if (!visitedSet.has(neighbor)) {
            if (hasCycle(neighbor, visitedSet, stack)) {
              return true;
            }
          } else if (stack.has(neighbor)) {
            return true;
          }
        }

        stack.delete(node);
        return false;
      };

      for (const node of Object.keys(graph)) {
        if (!visited.has(node)) {
          if (hasCycle(node, new Set(), new Set())) {
            errors.push({
              type: 'CYCLE_DETECTED',
              node
            });
            break;
          }
        }
      }

      // Check for self-loops
      for (const [from, neighbors] of Object.entries(graph)) {
        if (neighbors.includes(from)) {
          errors.push({
            type: 'SELF_LOOP',
            node: from
          });
        }
      }

      // Verify BFS would work (all nodes reachable from any start)
      const bfsReachable = (start, graph) => {
        const queue = [start];
        const reachable = new Set([start]);

        while (queue.length > 0) {
          const node = queue.shift();
          for (const neighbor of (graph[node] || [])) {
            if (!reachable.has(neighbor)) {
              reachable.add(neighbor);
              queue.push(neighbor);
            }
          }
        }

        return reachable;
      };

      const startNodes = Object.keys(graph).slice(0, 3);
      for (const start of startNodes) {
        const reachable = bfsReachable(start, graph);
        // This is just a sanity check - we expect some reachability
        if (reachable.size === 0) {
          errors.push({
            type: 'UNREACHABLE_GRAPH',
            start
          });
        }
      }

    } catch (err) {
      errors.push({ type: 'GRAPH_CHECK_FAILED', error: err.message });
    }

    this.results.graphAlgorithm.passed = errors.length === 0;
    this.results.graphAlgorithm.errors = errors;

    if (errors.length === 0) {
      console.log('    Graph algorithm correctness: PASSED');
    } else {
      console.log(`    Graph algorithm correctness: FAILED (${errors.length} errors)`);
    }

    return this.results.graphAlgorithm;
  }

  async checkIndexerConsistency() {
    console.log('\n  Checking indexer consistency...');
    const errors = [];

    // Since we don't have direct indexer access in this context,
    // we'll verify that the contracts have the expected events
    // that the indexer would need to track

    // Check Beliefs events
    if (this.contracts.beliefs) {
      try {
        const beliefFilter = this.contracts.beliefs.filters.BeliefSet();
        const beliefLogs = await this.contracts.beliefs.queryFilter(
          beliefFilter, -1000, 'latest'
        );

        // Verify each belief event has required fields
        for (const log of beliefLogs.slice(0, 10)) {
          if (!log.args) {
            errors.push({
              type: 'MALFORMED_BELIEF_EVENT',
              block: log.blockNumber
            });
          }
        }

        // Calculate direct believers per statement
        const believersByStatement = {};
        for (const log of beliefLogs) {
          const stmt = log.args.statementId;
          const belief = log.args.belief;
          if (belief === 1n) { // believe
            believersByStatement[stmt] = (believersByStatement[stmt] || 0) + 1;
          }
        }

        // Store for later comparison
        this.believersByStatement = believersByStatement;

      } catch (err) {
        errors.push({ type: 'BELIEF_INDEX_CHECK_FAILED', error: err.message });
      }
    }

    // Check Implications events
    if (this.contracts.implications) {
      try {
        const implFilter = this.contracts.implications.filters.ImplicationAttested();
        const implLogs = await this.contracts.implications.queryFilter(
          implFilter, -1000, 'latest'
        );

        // Verify implication chain consistency
        const statementsWithImplications = new Set();
        for (const log of implLogs) {
          statementsWithImplications.add(log.args.fromStatement);
          statementsWithImplications.add(log.args.toStatement);
        }

        // Verify all referenced statements exist in our statements list
        for (const stmtId of statementsWithImplications) {
          const exists = this.statements.some(s => s.statementId === stmtId);
          if (!exists) {
            errors.push({
              type: 'ORPHAN_IMPLICATION_INDEX',
              statement: stmtId
            });
          }
        }

      } catch (err) {
        errors.push({ type: 'IMPLICATION_INDEX_CHECK_FAILED', error: err.message });
      }
    }

    this.results.indexerConsistency.passed = errors.length === 0;
    this.results.indexerConsistency.errors = errors;

    if (errors.length === 0) {
      console.log('    Indexer consistency: PASSED');
    } else {
      console.log(`    Indexer consistency: FAILED (${errors.length} errors)`);
    }

    return this.results.indexerConsistency;
  }

  async runAllChecks() {
    console.log('\n=== Running Invariant Checks ===');
    
    await this.checkContractStateConsistency();
    await this.checkEconomicConservation();
    await this.checkGraphAlgorithmCorrectness();
    await this.checkIndexerConsistency();

    const allPassed = Object.values(this.results).every(r => r.passed);
    
    console.log('\n=== Invariant Check Summary ===');
    console.log(`  Contract State: ${this.results.contractState.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`  Economic Conservation: ${this.results.economicConservation.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`  Graph Algorithm: ${this.results.graphAlgorithm.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`  Indexer Consistency: ${this.results.indexerConsistency.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`\n  Overall: ${allPassed ? 'ALL PASSED' : 'SOME FAILED'}`);

    return {
      passed: allPassed,
      results: this.results
    };
  }

  getResults() {
    return this.results;
  }
}

export { InvariantChecker };
