import hre from 'hardhat';
import { generateStatements } from './generateStatements.js';

const { ethers } = hre;

/**
 * Funding and Delegation Actions for Generative Testing
 * 
 * This module provides actions for:
 * - Funding: Create projects, purchase tokens, trade on secondary market
 * - Delegation: Create notes, delegate, revoke, spend
 */

class FundingAndDelegationActions {
  constructor(contracts, users, statements) {
    this.contracts = contracts;
    this.users = users;
    this.statements = statements;
    this.createdProjects = [];
    this.createdNotes = []; // Track created notes: { noteId, owner, amount, token, tokenType, tokenId }
  }

  getWalletForUser(user) {
    return new ethers.Wallet(user.privateKey, ethers.provider);
  }

  getRandomUser() {
    return this.users[Math.floor(Math.random() * this.users.length)];
  }

  getRandomStatement() {
    return this.statements[Math.floor(Math.random() * this.statements.length)];
  }

  getUserNotes(user) {
    return this.createdNotes.filter(note => note.owner === user.address);
  }

  getDelegatableNotes(user) {
    // Get notes that can be delegated (ETH-based notes owned by user)
    return this.createdNotes.filter(note => 
      note.owner === user.address && 
      note.token === ethers.ZeroAddress &&
      note.tokenType === 0 // ERC20 type for ETH
    );
  }

  /**
   * Funding Action: Create a new project using Pubstarter
   */
  async createProject(user) {
    if (!this.contracts.pubstarter) {
      throw new Error('Pubstarter contract not deployed');
    }

    const wallet = this.getWalletForUser(user);
    const pubstarter = this.contracts.pubstarter.connect(wallet);

    // Generate random project parameters
    const threshold = ethers.parseEther((Math.random() * 5 + 1).toFixed(2)); // 1-6 ETH
    const deadline = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 1 week from now
    const projectMetadataCid = `ipfs://QmProject${Math.floor(Math.random() * 10000)}`;
    
    // Token configuration
    const tokenIds = [1, 2, 3]; // Three tiers of tokens
    const maxSupplies = [100, 500, 1000];
    const prices = [
      ethers.parseEther('0.1'),  // Tier 1: 0.1 ETH
      ethers.parseEther('0.05'), // Tier 2: 0.05 ETH
      ethers.parseEther('0.01')  // Tier 3: 0.01 ETH
    ];

    try {
      const tx = await pubstarter.pubstart(
        user.address, // recipient
        threshold,
        deadline,
        projectMetadataCid,
        'https://example.com/metadata/', // metadataURI
        'https://example.com/contract.json', // contractURI
        tokenIds,
        maxSupplies,
        prices
      );

      const receipt = await tx.wait();
      
      // Parse events to get created contract addresses
      const projectCreatedEvent = receipt.logs
        .map(log => {
          try {
            return pubstarter.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(event => event && event.name === 'ProjectCreated');

      if (projectCreatedEvent) {
        const project = {
          owner: user.address,
          erc1155: projectCreatedEvent.args.erc1155,
          marketplace: projectCreatedEvent.args.marketplace,
          assuranceContract: projectCreatedEvent.args.assuranceContract,
          threshold: threshold.toString(),
          deadline,
          tokenIds,
          prices: prices.map(p => p.toString())
        };
        
        this.createdProjects.push(project);
        return { success: true, project, receipt };
      }

      return { success: true, receipt };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Funding Action: Purchase tokens from primary market
   */
  async purchaseFromPrimaryMarket(user, project, tokenId, count) {
    const wallet = this.getWalletForUser(user);
    
    try {
      // Get the assurance contract
      const assuranceContract = await ethers.getContractAt(
        'MultiERC1155_AssuranceContract',
        project.assuranceContract,
        wallet
      );

      // Find the price for this token
      const tokenIndex = project.tokenIds.indexOf(tokenId);
      if (tokenIndex === -1) {
        throw new Error('Invalid token ID');
      }
      
      const price = BigInt(project.prices[tokenIndex]);
      const totalCost = price * BigInt(count);

      const tx = await assuranceContract.buyERC1155(
        user.address,
        project.erc1155,
        [tokenId],
        [count],
        '0x', // data
        { value: totalCost }
      );

      const receipt = await tx.wait();
      return { success: true, receipt, totalCost: totalCost.toString() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Funding Action: Create a sale listing on secondary market
   */
  async createSecondaryMarketListing(user, project, tokenId, count, pricePerToken) {
    const wallet = this.getWalletForUser(user);
    
    try {
      // First approve the marketplace to transfer tokens
      const erc1155 = await ethers.getContractAt('IERC1155', project.erc1155, wallet);
      const marketplace = await ethers.getContractAt(
        'ERC1155SecondaryMarket',
        project.marketplace,
        wallet
      );

      // Check balance first
      const balance = await erc1155.balanceOf(user.address, tokenId);
      if (balance < count) {
        throw new Error(`Insufficient balance: ${balance} < ${count}`);
      }

      // Approve marketplace
      await (await erc1155.setApprovalForAll(project.marketplace, true)).wait();

      // Create listing
      const tx = await marketplace.createSaleListing(tokenId, count, pricePerToken);
      const receipt = await tx.wait();

      // Parse listing ID from event
      const listingEvent = receipt.logs
        .map(log => {
          try {
            return marketplace.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(event => event && event.name === 'SaleListingCreated');

      const listingId = listingEvent ? listingEvent.args.listingId.toString() : null;

      return { success: true, receipt, listingId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Funding Action: Purchase from secondary market
   */
  async purchaseFromSecondaryMarket(user, project, listingId, count) {
    const wallet = this.getWalletForUser(user);
    
    try {
      const marketplace = await ethers.getContractAt(
        'ERC1155SecondaryMarket',
        project.marketplace,
        wallet
      );

      // Get listing details
      const listing = await marketplace.getSaleListing(listingId);
      const totalCost = listing.pricePerToken * BigInt(count);

      const tx = await marketplace.fulfillSaleListing(listingId, count, { value: totalCost });
      const receipt = await tx.wait();

      return { success: true, receipt, totalCost: totalCost.toString() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Funding Action: Withdraw funds from successful project
   */
  async withdrawProjectFunds(user, project) {
    const wallet = this.getWalletForUser(user);
    
    try {
      // Only project recipient can withdraw
      if (user.address.toLowerCase() !== project.owner.toLowerCase()) {
        throw new Error('Only project recipient can withdraw');
      }

      const assuranceContract = await ethers.getContractAt(
        'MultiERC1155_AssuranceContract',
        project.assuranceContract,
        wallet
      );

      const tx = await assuranceContract.withdraw();
      const receipt = await tx.wait();

      return { success: true, receipt };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delegation Action: Deposit ETH to create a note
   */
  async depositToNote(user, amount) {
    if (!this.contracts.delegatableNotes) {
      throw new Error('DelegatableNotes contract not deployed');
    }

    const wallet = this.getWalletForUser(user);
    const delegatableNotes = this.contracts.delegatableNotes.connect(wallet);

    try {
      // Deposit ETH as ERC20 type (address 0)
      const tx = await delegatableNotes.deposit(
        ethers.ZeroAddress, // token address (ETH)
        0, // TokenType.ERC20
        0, // tokenId (not used for ETH)
        amount,
        { value: amount }
      );

      const receipt = await tx.wait();

      // Parse note ID from event
      const noteCreatedEvent = receipt.logs
        .map(log => {
          try {
            return delegatableNotes.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(event => event && event.name === 'NoteCreated');

      if (noteCreatedEvent) {
        const noteId = noteCreatedEvent.args.noteId.toString();
        const note = {
          noteId,
          owner: user.address,
          amount: amount.toString(),
          token: ethers.ZeroAddress,
          tokenType: 0, // ERC20
          tokenId: 0
        };
        this.createdNotes.push(note);
        return { success: true, note, receipt };
      }

      return { success: true, receipt };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delegation Action: Delegate a note to another user
   */
  async delegateNote(user, noteId, delegateTo, amountToDelegate) {
    if (!this.contracts.delegatableNotes) {
      throw new Error('DelegatableNotes contract not deployed');
    }

    const wallet = this.getWalletForUser(user);
    const delegatableNotes = this.contracts.delegatableNotes.connect(wallet);

    try {
      // Find the note
      const note = this.createdNotes.find(n => n.noteId === noteId);
      if (!note) {
        throw new Error('Note not found');
      }

      if (note.owner !== user.address) {
        throw new Error('Not note owner');
      }

      // Chain is just [user] for root notes
      const owners = [user.address];

      const tx = await delegatableNotes.delegate(
        noteId,
        owners,
        delegateTo,
        amountToDelegate
      );

      const receipt = await tx.wait();

      // Parse events to get new note IDs
      const chainSplitEvent = receipt.logs
        .map(log => {
          try {
            return delegatableNotes.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(event => event && event.name === 'ChainSplit');

      if (chainSplitEvent) {
        // Partial delegation - update original note and create delegated note
        const delegatedNoteId = chainSplitEvent.args.splitLeafId.toString();
        const remainderNoteId = chainSplitEvent.args.remainderLeafId.toString();
        const splitAmount = chainSplitEvent.args.splitAmount.toString();

        // Update original note
        note.amount = (BigInt(note.amount) - BigInt(splitAmount)).toString();

        // Add delegated note
        this.createdNotes.push({
          noteId: delegatedNoteId,
          owner: delegateTo,
          amount: splitAmount,
          token: note.token,
          tokenType: note.tokenType,
          tokenId: note.tokenId
        });

        return { 
          success: true, 
          delegatedNoteId, 
          remainderNoteId,
          receipt 
        };
      } else {
        // Full delegation
        const delegatedNoteId = noteId;
        note.owner = delegateTo;
        return { success: true, delegatedNoteId, receipt };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delegation Action: Revoke a delegation
   */
  async revokeDelegation(user, noteId) {
    if (!this.contracts.delegatableNotes) {
      throw new Error('DelegatableNotes contract not deployed');
    }

    const wallet = this.getWalletForUser(user);
    const delegatableNotes = this.contracts.delegatableNotes.connect(wallet);

    try {
      // Find the note
      const note = this.createdNotes.find(n => n.noteId === noteId);
      if (!note) {
        throw new Error('Note not found');
      }

      // For simplicity, assume chain is [current_owner, original_delegator]
      // In a real scenario, we'd need to track the full chain
      const owners = [note.owner, user.address];

      const tx = await delegatableNotes.revoke(noteId, owners);
      const receipt = await tx.wait();

      // Update note ownership back to user
      note.owner = user.address;

      return { success: true, receipt };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delegation Action: Spend notes to purchase tokens from primary market
   */
  async spendNotesOnPrimaryMarket(user, noteIds, project, tokenIds, counts) {
    if (!this.contracts.delegatableNotes) {
      throw new Error('DelegatableNotes contract not deployed');
    }

    const wallet = this.getWalletForUser(user);
    const delegatableNotes = this.contracts.delegatableNotes.connect(wallet);

    try {
      // Calculate total cost
      let totalCost = BigInt(0);
      for (let i = 0; i < tokenIds.length; i++) {
        const tokenIndex = project.tokenIds.indexOf(tokenIds[i]);
        if (tokenIndex !== -1) {
          totalCost += BigInt(project.prices[tokenIndex]) * BigInt(counts[i]);
        }
      }

      // Build chains array
      const chains = noteIds.map(() => [user.address]);

      const tx = await delegatableNotes.purchaseFromPrimaryMarket(
        noteIds,
        chains,
        totalCost,
        project.assuranceContract,
        project.erc1155,
        tokenIds,
        counts
      );

      const receipt = await tx.wait();

      // Update note amounts
      for (const noteId of noteIds) {
        const note = this.createdNotes.find(n => n.noteId === noteId);
        if (note) {
          // Simplified: evenly distribute cost across notes
          const costPerNote = totalCost / BigInt(noteIds.length);
          note.amount = (BigInt(note.amount) - costPerNote).toString();
        }
      }

      return { success: true, receipt, totalCost: totalCost.toString() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delegation Action: Reclaim funds from a root note
   */
  async reclaimNoteFunds(user, noteId) {
    if (!this.contracts.delegatableNotes) {
      throw new Error('DelegatableNotes contract not deployed');
    }

    const wallet = this.getWalletForUser(user);
    const delegatableNotes = this.contracts.delegatableNotes.connect(wallet);

    try {
      // Find the note
      const note = this.createdNotes.find(n => n.noteId === noteId);
      if (!note) {
        throw new Error('Note not found');
      }

      if (note.owner !== user.address) {
        throw new Error('Not note owner');
      }

      const tx = await delegatableNotes.reclaimFunds(noteId);
      const receipt = await tx.wait();

      // Remove the note from tracking
      this.createdNotes = this.createdNotes.filter(n => n.noteId !== noteId);

      return { success: true, receipt };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export { FundingAndDelegationActions };
