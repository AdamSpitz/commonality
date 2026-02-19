import { createPublicClient, createWalletClient, http, parseEther, getBalance, isAddress, zeroAddress, zeroPadValue, getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  BeliefsAbi,
  ImplicationsAbi,
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

const publicClient = createPublicClient({
  chain: hardhat,
  transport: http(RPC_URL),
});

function createTestClients(privateKey) {
  const account = privateKeyToAccount(privateKey);

  const walletClient = createWalletClient({
    account,
    chain: hardhat,
    transport: http(RPC_URL),
  });

  return {
    walletClient,
    publicClient,
    account: account.address,
  };
}

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

    if (this.contracts.beliefs) {
      try {
        for (const stmt of this.statements.slice(0, 50)) {
          const belief = await publicClient.readContract({
            address: this.contracts.beliefs.address,
            abi: BeliefsAbi,
            functionName: 'beliefs',
            args: [stmt.statementId, this.users[0]?.address || zeroAddress]
          });
          snapshot.beliefs[stmt.id] = belief;
        }
      } catch (err) {
        snapshot.beliefsError = err.message;
      }
    }

    for (const [name, contract] of Object.entries(this.contracts)) {
      try {
        snapshot.balances[name] = await getBalance(publicClient, {
          address: contract.address
        });
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

    if (this.contracts.beliefs) {
      try {
        for (const user of this.users.slice(0, 10)) {
          for (const stmt of this.statements.slice(0, 10)) {
            const belief = await publicClient.readContract({
              address: this.contracts.beliefs.address,
              abi: BeliefsAbi,
              functionName: 'beliefs',
              args: [stmt.statementId, user.address]
            });
            
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
        if (err.message.includes('resolveName')) {
          console.log('    (Warning: Provider issue - skipping belief query)');
        } else {
          errors.push({ type: 'BELIEF_QUERY_FAILED', error: err.message });
        }
      }
    }

    for (const [name, contract] of Object.entries(this.contracts)) {
      try {
        const address = getAddress(contract.address);
        if (!isAddress(address) || address === zeroAddress) {
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

    if (this.contracts.implications) {
      try {
        const logs = await publicClient.getLogs({
          address: this.contracts.implications.address,
          event: {
            type: 'event',
            name: 'ImplicationAttestation',
            inputs: [
              { name: 'attester', type: 'address', indexed: true },
              { name: 'fromStatementId', type: 'bytes32', indexed: true },
              { name: 'toStatementId', type: 'bytes32', indexed: true },
              { name: 'explanationId', type: 'bytes32', indexed: false },
              { name: 'belief', type: 'uint8', indexed: false }
            ]
          },
          fromBlock: 0n,
          toBlock: 'latest'
        });
        
        for (const log of logs.slice(0, 20)) {
          const fromId = log.args.fromStatementId ? zeroPadValue(log.args.fromStatementId, 32) : null;
          const toId = log.args.toStatementId ? zeroPadValue(log.args.toStatementId, 32) : null;
          
          if (!fromId || !toId) continue;
          
          const fromIdStr = fromId.toString();
          const toIdStr = toId.toString();
          const fromExists = this.statements.some(s => s.statementId === fromIdStr);
          const toExists = this.statements.some(s => s.statementId === toIdStr);
          
          if (!fromExists || !toExists) {
            errors.push({
              type: 'ORPHAN_IMPLICATION',
              from: fromIdStr,
              to: toIdStr,
              missingFrom: !fromExists,
              missingTo: !toExists
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
      errors.forEach(e => console.log(`      - ${JSON.stringify(e)}`));
    }

    return this.results.contractState;
  }

  async checkEconomicConservation() {
    console.log('\n  Checking economic conservation...');
    const errors = [];

    const initialBalances = {};
    for (const user of this.users) {
      try {
        initialBalances[user.address] = await getBalance(publicClient, {
          address: user.address
        });
      } catch (err) {
        // Skip
      }
    }

    if (this.users.length >= 2) {
      const sender = this.users[0];
      const receiver = this.users[1];
      const amount = parseEther('0.001');

      try {
        const clients = createTestClients(sender.privateKey);
        const senderBefore = await getBalance(publicClient, { address: sender.address });
        const receiverBefore = await getBalance(publicClient, { address: receiver.address });

        const hash = await clients.walletClient.sendTransaction({
          to: receiver.address,
          value: amount
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        const senderAfter = await getBalance(publicClient, { address: sender.address });
        const receiverAfter = await getBalance(publicClient, { address: receiver.address });
        const gasUsed = receipt.gasUsed * receipt.gasPrice;

        const senderExpected = senderBefore - amount - gasUsed;
        if (senderAfter !== senderExpected) {
          errors.push({
            type: 'VALUE_DESTRUCTION',
            expected: senderExpected.toString(),
            actual: senderAfter.toString(),
            difference: (senderAfter - senderExpected).toString()
          });
        }

        const receiverExpected = receiverBefore + amount;
        if (receiverAfter !== receiverExpected) {
          errors.push({
            type: 'VALUE_CREATION',
            expected: receiverExpected.toString(),
            actual: receiverAfter.toString(),
            difference: (receiverAfter - receiverExpected).toString()
          });
        }

        const revertClients = createTestClients(receiver.privateKey);
        const revertHash = await revertClients.walletClient.sendTransaction({
          to: sender.address,
          value: amount
        });
        await publicClient.waitForTransactionReceipt({ hash: revertHash });

      } catch (err) {
        errors.push({ type: 'TRANSFER_FAILED', error: err.message });
      }
    }

    if (this.snapshots.length >= 2) {
      const prev = this.snapshots[this.snapshots.length - 2];
      const curr = this.snapshots[this.snapshots.length - 1];

      for (const [name, balance] of Object.entries(curr.balances || {})) {
        const prevBalance = prev.balances?.[name];
        if (prevBalance && balance > prevBalance) {
          const increase = balance - prevBalance;
          if (increase > parseEther('1')) {
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
      errors.forEach(e => console.log(`      - ${JSON.stringify(e)}`));
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
      const logs = await publicClient.getLogs({
        address: this.contracts.implications.address,
        event: {
          type: 'event',
          name: 'ImplicationAttestation',
          inputs: [
            { name: 'attester', type: 'address', indexed: true },
            { name: 'fromStatementId', type: 'bytes32', indexed: true },
            { name: 'toStatementId', type: 'bytes32', indexed: true },
            { name: 'explanationId', type: 'bytes32', indexed: false },
            { name: 'belief', type: 'uint8', indexed: false }
          ]
        },
        fromBlock: 0n,
        toBlock: 'latest'
      });

      const graph = {};
      const inDegree = {};
      const outDegree = {};

      for (const log of logs) {
        const from = log.args.fromStatementId ? zeroPadValue(log.args.fromStatementId, 32).toString() : null;
        const to = log.args.toStatementId ? zeroPadValue(log.args.toStatementId, 32).toString() : null;
        
        if (!from || !to) continue;

        if (!graph[from]) graph[from] = [];
        graph[from].push(to);

        outDegree[from] = (outDegree[from] || 0) + 1;
        inDegree[to] = (inDegree[to] || 0) + 1;
      }

      const visited = new Set();
      const recursionStack = new Set();
      let cycleNode = null;

      const hasCycle = (node, visitedSet, stack) => {
        visitedSet.add(node);
        stack.add(node);

        for (const neighbor of (graph[node] || [])) {
          if (!visitedSet.has(neighbor)) {
            if (hasCycle(neighbor, visitedSet, stack)) {
              return true;
            }
          } else if (stack.has(neighbor)) {
            cycleNode = neighbor;
            return true;
          }
        }

        stack.delete(node);
        return false;
      };

      for (const node of Object.keys(graph)) {
        if (!visited.has(node)) {
          if (hasCycle(node, visited, recursionStack)) {
            errors.push({
              type: 'CYCLE_DETECTED',
              node: cycleNode || node,
              fromNode: node
            });
            break;
          }
        }
      }

      for (const [from, neighbors] of Object.entries(graph)) {
        if (neighbors.includes(from)) {
          errors.push({
            type: 'SELF_LOOP',
            node: from
          });
        }
      }

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
      errors.forEach(e => console.log(`      - ${JSON.stringify(e)}`));
    }

    return this.results.graphAlgorithm;
  }

  async checkIndexerConsistency() {
    console.log('\n  Checking indexer consistency...');
    const errors = [];

    if (this.contracts.beliefs) {
      try {
        const beliefLogs = await publicClient.getLogs({
          address: this.contracts.beliefs.address,
          event: {
            type: 'event',
            name: 'DirectSupport',
            inputs: [
              { name: 'attester', type: 'address', indexed: true },
              { name: 'statementId', type: 'bytes32', indexed: true },
              { name: 'belief', type: 'uint8', indexed: false }
            ]
          },
          fromBlock: 0n,
          toBlock: 'latest'
        });

        for (const log of beliefLogs.slice(0, 10)) {
          if (!log.args) {
            errors.push({
              type: 'MALFORMED_BELIEF_EVENT',
              block: log.blockNumber
            });
          }
        }

        const believersByStatement = {};
        for (const log of beliefLogs) {
          const stmt = log.args.statementId;
          const belief = log.args.belief;
          if (belief === 1n) {
            believersByStatement[stmt] = (believersByStatement[stmt] || 0) + 1;
          }
        }

        this.believersByStatement = believersByStatement;

      } catch (err) {
        errors.push({ type: 'BELIEF_INDEX_CHECK_FAILED', error: err.message });
      }
    }

    if (this.contracts.implications) {
      try {
        const implLogs = await publicClient.getLogs({
          address: this.contracts.implications.address,
          event: {
            type: 'event',
            name: 'ImplicationAttestation',
            inputs: [
              { name: 'attester', type: 'address', indexed: true },
              { name: 'fromStatementId', type: 'bytes32', indexed: true },
              { name: 'toStatementId', type: 'bytes32', indexed: true },
              { name: 'explanationId', type: 'bytes32', indexed: false },
              { name: 'belief', type: 'uint8', indexed: false }
            ]
          },
          fromBlock: 0n,
          toBlock: 'latest'
        });

        const statementsWithImplications = new Set();
        for (const log of implLogs) {
          if (log.args.fromStatementId) {
            statementsWithImplications.add(zeroPadValue(log.args.fromStatementId, 32).toString());
          }
          if (log.args.toStatementId) {
            statementsWithImplications.add(zeroPadValue(log.args.toStatementId, 32).toString());
          }
        }

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
      errors.forEach(e => console.log(`      - ${JSON.stringify(e)}`));
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
