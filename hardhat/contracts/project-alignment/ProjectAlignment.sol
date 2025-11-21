// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

// AI-generated from specs/README.md
// ProjectAlignment contract for Funding Portals: Links projects to statements/causes

/**
 * @title ProjectAlignment
 * @notice Allows attesters to declare that a project is aligned with a statement/cause
 * @dev Any address can be an attester. Projects are identified by contract address.
 *      Statements are IPFS CIDs (bytes32).
 *      Similar pattern to Implications.sol but for project-statement relationships.
 */
contract ProjectAlignment {
    /**
     * @notice Emitted when an attester declares that a project is aligned with a statement
     * @param attester The address making the attestation
     * @param projectAddress The address of the project contract (ERC1155)
     * @param statementId The IPFS CID of the statement this project aligns with
     */
    event ProjectAlignmentAttestation(
        address indexed attester,
        address indexed projectAddress,
        bytes32 indexed statementId
    );

    // Mapping to track if an alignment has been attested by a specific attester
    // attester => projectAddress => statementId => exists
    mapping(address => mapping(address => mapping(bytes32 => bool)))
        public attestations;

    /**
     * @notice Attest that a project is aligned with a statement/cause
     * @dev Can be called multiple times by the same attester for the same pair (idempotent)
     * @param projectAddress The address of the project contract
     * @param statementId The IPFS CID of the statement
     */
    function attestAlignment(address projectAddress, bytes32 statementId)
        external
    {
        require(
            projectAddress != address(0),
            "Invalid project address"
        );
        require(
            statementId != bytes32(0),
            "Invalid statement ID"
        );

        attestations[msg.sender][projectAddress][statementId] = true;

        emit ProjectAlignmentAttestation(msg.sender, projectAddress, statementId);
    }

    /**
     * @notice Batch attest multiple project alignments
     * @param projectAddresses Array of project contract addresses
     * @param statementIds Array of statement IPFS CIDs
     */
    function attestAlignmentsInBatch(
        address[] calldata projectAddresses,
        bytes32[] calldata statementIds
    ) external {
        require(
            projectAddresses.length == statementIds.length,
            "Arrays must have same length"
        );

        for (uint256 i = 0; i < projectAddresses.length; i++) {
            address projectAddress = projectAddresses[i];
            bytes32 statementId = statementIds[i];

            require(
                projectAddress != address(0),
                "Invalid project address"
            );
            require(
                statementId != bytes32(0),
                "Invalid statement ID"
            );

            attestations[msg.sender][projectAddress][statementId] = true;

            emit ProjectAlignmentAttestation(msg.sender, projectAddress, statementId);
        }
    }

    /**
     * @notice Check if an attester has attested an alignment
     * @param attester The address of the attester
     * @param projectAddress The project contract address
     * @param statementId The statement IPFS CID
     * @return Whether the attestation exists
     */
    function hasAttestation(
        address attester,
        address projectAddress,
        bytes32 statementId
    ) external view returns (bool) {
        return attestations[attester][projectAddress][statementId];
    }
}
