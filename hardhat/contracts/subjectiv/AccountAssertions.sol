// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/**
 * @title AccountAssertions
 * @notice Tier-0/1 proof-of-personhood self-declarations.
 *
 * Each account may publicly assert, "this is my one Commonality account." The
 * assertion is a self-claim by the account holder (signed from the account),
 * not a check by Commonality or any third party — so it carries essentially no
 * Sybil-resistance on its own. It exists to make the "sign once, we union your
 * signatures" pitch demonstrable before any proof-of-personhood provider is
 * wired up, and to give the tiered head-count UI something to count at
 * tier 1 (ProofTier.ASSERTED). See specs/tech/shared/unique-human-id.md.
 *
 * The onchain record is a single boolean per account: asserted or not. The SDK
 * derives the anonymized anchor ID (`hash(anchor_address, app_salt)`) offchain
 * and maps asserted accounts to tier 1 when building the `knownTiers` map for
 * Tally counts. An account may revoke its assertion (e.g. when re-anchoring),
 * which returns it to tier 0.
 *
 * This contract deliberately has no admin, no upgradeability, and no external
 * dependencies: it is a public, durable bulletin board of self-claims.
 */
contract AccountAssertions {
    /// @notice Emitted when an account sets or revokes its single-account assertion.
    /// @param user The account making (or retracting) the claim.
    /// @param asserted True when the account asserts this is its one account; false when revoked.
    event AccountAssertionSet(address indexed user, bool asserted);

    /// @notice Whether each account currently asserts this is its one Commonality account.
    mapping(address => bool) public asserted;

    /**
     * @notice Assert that this is your one Commonality account (tier 0 → 1).
     * @dev Idempotent: re-asserting is a no-op but still emits an event so the
     *      indexer can observe the latest intent. Last-write-wins.
     */
    function assertSingleAccount() external {
        asserted[msg.sender] = true;
        emit AccountAssertionSet(msg.sender, true);
    }

    /**
     * @notice Revoke your single-account assertion (return to tier 0).
     * @dev Used when re-anchoring attestations to a new account, per
     *      unique-human-id.md caveat #3. Idempotent.
     */
    function revokeAssertion() external {
        asserted[msg.sender] = false;
        emit AccountAssertionSet(msg.sender, false);
    }
}
