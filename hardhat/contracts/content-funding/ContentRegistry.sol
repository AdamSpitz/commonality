//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

error ContentAlreadyRegistered(uint256 contentId, address existingContract);
error ContentNotRegistered(uint256 contentId);
error InvalidContentId();

interface IContentRegistry {
    function contentContract(uint256 contentId) external view returns (address);
    function registerContent(uint256 contentId, address assuranceContract) external;
    function releaseContent(uint256 contentId) external;
    function isRegistered(uint256 contentId) external view returns (bool);
}

contract ContentRegistry is IContentRegistry, Ownable {
    mapping(uint256 contentId => address assuranceContract) private _contentContracts;

    event ContentRegistered(uint256 indexed contentId, address indexed assuranceContract);
    event ContentReleased(uint256 indexed contentId);

    modifier onlyValidContentId(uint256 contentId) {
        if (contentId == 0) revert InvalidContentId();
        _;
    }

    constructor() Ownable(msg.sender) {}

    function contentContract(uint256 contentId) external view onlyValidContentId(contentId) returns (address) {
        return _contentContracts[contentId];
    }

    function registerContent(
        uint256 contentId,
        address assuranceContract
    ) external onlyOwner onlyValidContentId(contentId) {
        if (_contentContracts[contentId] != address(0)) {
            revert ContentAlreadyRegistered(contentId, _contentContracts[contentId]);
        }
        _contentContracts[contentId] = assuranceContract;
        emit ContentRegistered(contentId, assuranceContract);
    }

    function releaseContent(uint256 contentId) external onlyOwner onlyValidContentId(contentId) {
        if (_contentContracts[contentId] == address(0)) {
            revert ContentNotRegistered(contentId);
        }
        delete _contentContracts[contentId];
        emit ContentReleased(contentId);
    }

    function isRegistered(uint256 contentId) external view onlyValidContentId(contentId) returns (bool) {
        return _contentContracts[contentId] != address(0);
    }
}
