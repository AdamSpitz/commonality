import { ethers } from 'ethers';
import hre from 'hardhat';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate random users with Ethereum addresses and behavioral profiles
 * Each user has interests, positions on various domains, engagement level, and wealth
 */

// Engagement levels affect action probabilities
const ENGAGEMENT_LEVELS = {
  LURKER: { weight: 0.4, actions: 1 },      // 40% of users
  CASUAL: { weight: 0.35, actions: 3 },     // 35% of users
  ACTIVE: { weight: 0.20, actions: 8 },     // 20% of users
  POWER_USER: { weight: 0.05, actions: 20 } // 5% of users
};

// Wealth follows power law distribution
function generateWealth() {
  // Power law: few whales, many small holders
  const rand = Math.random();
  if (rand < 0.01) return 100; // 1% are whales
  if (rand < 0.1) return 10;   // 9% are large holders
  return 1 + Math.random() * 2; // 90% are small holders
}

function selectEngagementLevel() {
  const rand = Math.random();
  let cumulative = 0;

  for (const [level, config] of Object.entries(ENGAGEMENT_LEVELS)) {
    cumulative += config.weight;
    if (rand < cumulative) {
      return { level, actionsPerRound: config.actions };
    }
  }

  return { level: 'CASUAL', actionsPerRound: 3 };
}

function pickRandomPosition(domain, domainConfig) {
  if (domainConfig.type === 'categorical') {
    // Pick one category randomly
    const positions = domainConfig.positions;
    return positions[Math.floor(Math.random() * positions.length)];
  } else if (domainConfig.type === 'spectrum') {
    // Pick position on each axis
    const positions = {};
    for (const axis of domainConfig.axes) {
      positions[axis.name] = axis.labels[Math.floor(Math.random() * axis.labels.length)];
    }
    return positions;
  }
}

// Generate realistic correlations (simplified for now)
function addCorrelations(interests) {
  // If strongly left economically, more likely to be progressive socially
  if (interests.politics?.economic === 'left') {
    if (Math.random() > 0.3) {
      interests.politics.social = 'progressive';
    }
  }

  // If strongly right economically, more likely to be conservative socially
  if (interests.politics?.economic === 'right') {
    if (Math.random() > 0.3) {
      interests.politics.social = 'conservative';
    }
  }

  // Crypto enthusiasts more likely to favor decentralization
  if (interests.crypto && interests.crypto !== 'skeptic') {
    if (Math.random() > 0.4 && interests.technology) {
      interests.technology.centralization = 'decentralized';
    }
  }

  return interests;
}

const DEFAULT_ACCOUNT_COUNT = 20;

async function getHardhatAccounts(count) {
  const signers = await hre.ethers.getSigners();
  const accounts = [];
  for (let i = 0; i < Math.min(count, signers.length); i++) {
    const signer = signers[i];
    const address = await signer.getAddress();
    const privateKey = signer.privateKey;
    accounts.push({ address, privateKey });
  }
  return accounts;
}

function generateUser(id, universe, hardhatAccount = null) {
  let wallet;
  if (hardhatAccount) {
    wallet = new ethers.Wallet(hardhatAccount.privateKey);
  } else {
    wallet = ethers.Wallet.createRandom();
  }
  const engagement = selectEngagementLevel();

  // Each user cares about 1-4 domains
  const numInterests = 1 + Math.floor(Math.random() * 4);
  const domainNames = Object.keys(universe.domains);
  const selectedDomains = domainNames
    .sort(() => Math.random() - 0.5)
    .slice(0, numInterests);

  const interests = {};
  for (const domain of selectedDomains) {
    interests[domain] = pickRandomPosition(domain, universe.domains[domain]);
  }

  // Add correlations between positions
  addCorrelations(interests);

  // Trust network: users trust 0-5 other users for delegation
  const trustNetworkSize = Math.floor(Math.random() * 6);

  return {
    id,
    address: wallet.address,
    privateKey: wallet.privateKey,
    engagement: engagement.level,
    actionsPerRound: engagement.actionsPerRound,
    wealth: generateWealth(),
    interests,
    trustNetworkSize, // Will be filled with actual addresses later
    trustNetwork: []
  };
}

async function generateUsers(count, options = {}) {
  const { useHardhatAccounts = false, hardhatAccountCount = DEFAULT_ACCOUNT_COUNT } = options;
  
  const universePath = join(__dirname, 'universe.json');
  const universe = JSON.parse(await fs.readFile(universePath, 'utf-8'));

  let hardhatAccounts = [];
  if (useHardhatAccounts) {
    hardhatAccounts = await getHardhatAccounts(hardhatAccountCount);
    console.log(`Using ${hardhatAccounts.length} hardhat accounts`);
  }

  const users = [];

  // Generate users
  for (let i = 0; i < count; i++) {
    const hardhatAccount = useHardhatAccounts && i < hardhatAccounts.length ? hardhatAccounts[i] : null;
    users.push(generateUser(i, universe, hardhatAccount));
  }

  // Establish trust networks
  // Users tend to trust others with similar interests
  for (const user of users) {
    const candidates = users.filter(u => u.id !== user.id);

    // Score candidates by interest overlap
    const scored = candidates.map(candidate => {
      let overlap = 0;
      for (const domain of Object.keys(user.interests)) {
        if (candidate.interests[domain]) {
          overlap++;
        }
      }
      return { candidate, score: overlap + Math.random() * 2 };
    });

    // Pick top N candidates
    scored.sort((a, b) => b.score - a.score);
    user.trustNetwork = scored
      .slice(0, user.trustNetworkSize)
      .map(s => s.candidate.address);
  }

  // Save to file
  const outputPath = join(__dirname, 'users.json');
  await fs.writeFile(outputPath, JSON.stringify(users, null, 2));

  console.log(`Generated ${count} users`);
  console.log(`Engagement distribution:`);
  for (const [level, config] of Object.entries(ENGAGEMENT_LEVELS)) {
    const levelCount = users.filter(u => u.engagement === level).length;
    console.log(`  ${level}: ${levelCount} (${(levelCount/count*100).toFixed(1)}%)`);
  }

  const avgWealth = users.reduce((sum, u) => sum + u.wealth, 0) / users.length;
  console.log(`Average wealth: ${avgWealth.toFixed(2)} ETH`);

  return users;
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const count = parseInt(args.find(a => !a.startsWith('--')) || 50);
  const useHardhatAccounts = args.includes('--use-hardhat-accounts');
  const hardhatAccountCount = parseInt(args.find(a => a.startsWith('--hardhat-count='))?.split('=')[1]) || DEFAULT_ACCOUNT_COUNT;
  
  generateUsers(count, { useHardhatAccounts, hardhatAccountCount }).catch(console.error);
}

export { generateUsers };
