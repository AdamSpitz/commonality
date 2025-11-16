//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/**
 * @dev Interface for the ERC7572 Contract-Level Metadata Standard
 * See https://eips.ethereum.org/EIPS/eip-7572
 */
interface IERC7572 {
	function contractURI() external view returns (string memory);

	event ContractURIUpdated();
}
