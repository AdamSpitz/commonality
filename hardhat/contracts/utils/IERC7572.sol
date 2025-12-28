//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/**
 * @title IERC7572
 * @dev Interface for the ERC7572 Contract-Level Metadata Standard
 * @dev See https://eips.ethereum.org/EIPS/eip-7572
 */
interface IERC7572 {
	/**
	 * @notice Returns the URI for contract-level metadata
	 * @return The URI string pointing to contract metadata
	 */
	function contractURI() external view returns (string memory);

	/**
	 * @notice Emitted when the contract URI is updated
	 */
	event ContractURIUpdated();
}
