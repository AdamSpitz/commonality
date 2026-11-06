// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/**
 * @title SuggestedNames
 * @notice A bulletin board of suggested display names.
 *
 * Anyone may suggest a name for any account, including their own. Pass your
 * own address as accountBeingNamed to name yourself. The contract does not
 * store names, check uniqueness, or check that the name is true. Readers
 * decide which attester to believe. The latest event from an attester about
 * an account is that attester's current suggestion only by indexer convention.
 */
contract SuggestedNames {
    /**
     * @notice Emitted when an attester suggests a display name for an account.
     * @param attester The address making the suggestion.
     * @param accountBeingNamed The account the name is about.
     * @param name The suggested display name. Not indexed: an indexed string
     *             is stored only as its hash, and the text would be lost.
     */
    event NameSuggested(
        address indexed attester,
        address indexed accountBeingNamed,
        string name
    );

    /**
     * @notice Suggest a display name for an account.
     * @param accountBeingNamed The account the name is about. Use msg.sender to name yourself.
     * @param name The suggested display name.
     */
    function suggestName(address accountBeingNamed, string calldata name) external {
        emit NameSuggested(msg.sender, accountBeingNamed, name);
    }
}
