# Glossary / terminology / concepts

This isn't meant to be a detailed description of each term; this is just meant to pin down what concepts we have and what word we're using for each concept.

(This was AI-generated; feel free to blow it away and ask the AI to recreate it from the top-level spec.)

## Core Concepts

- **Statement**: An immutable concept/idea/cause uploaded to IPFS; the basic unit of belief in Concept Space
- **Signing**: The act of a user expressing belief (or disbelief) in a statement
- **Implication Attestation**: An event declaring that belief in statement S1 probably implies belief in statement S2
- **Attester**: An account (typically AI) that publishes Implication Attestations
- **Commonality Statement**: A statement that represents common ground between multiple other statements (not a technical term, but a useful conceptual pattern)
- **Direct Support**: When a user has explicitly signed a statement
- **Indirect Support**: When a user has signed other statements that imply this statement

## Funding Portal Concepts

- **Funding Portal**: The collection of fundable projects aligned with a particular statement
- **Project**: A crypto-based crowdfunding campaign (similar to Kickstarter) aligned with a statement/cause
- **Project Alignment Attestation**: An event declaring that project P is aligned with statement S
- **Investor**: Someone who buys project NFTs but may resell them
- **Donor**: Someone who buys project NFTs and burns them (permanent contribution)
- **Nano-VC**: A small-scale venture capitalist who invests in public good projects with the hope of later exiting to donors

## Delegation Concepts

- **Delegatable Note**: A smart contract representing earmarked funds that can be delegated to someone else to manage
- **Delegation**: Allowing a trusted person to make funding decisions on your behalf
- **Nano-Trustee**: Someone entrusted to make funding decisions on behalf of others who have delegated to them
- **Delegation Chain**: The full path of delegation (e.g., Alice -> Bob -> Charlie)

## Technical Terms

- **CID**: Content Identifier (IPFS hash) - the unique ID for a statement
- **Unique-Human Verification**: Systems to combat Sybil attacks by verifying one account per human (e.g., Worldcoin, BrightID)
- **High-Profile Signer**: A supporter with a verified social media account above a certain follower threshold
