export declare const CreatorAssuranceContractFactoryAbi: readonly [{
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "_contentRegistry";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "_channelRegistry";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "_channelEscrow";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "_erc1155Factory";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "_marketplaceFactory";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "_conditionFactory";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "_paymentToken";
        readonly type: "address";
    }, {
        readonly internalType: "string";
        readonly name: "_contentIdSeparator";
        readonly type: "string";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "constructor";
}, {
    readonly inputs: readonly [];
    readonly name: "ArrayLengthMismatch";
    readonly type: "error";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "channelId";
        readonly type: "bytes32";
    }, {
        readonly internalType: "bytes32";
        readonly name: "canonicalChannelIdHash";
        readonly type: "bytes32";
    }];
    readonly name: "ChannelCanonicalIdMismatch";
    readonly type: "error";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "channelId";
        readonly type: "bytes32";
    }];
    readonly name: "ChannelCreatorControlled";
    readonly type: "error";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "channelId";
        readonly type: "bytes32";
    }];
    readonly name: "ChannelNotVerifiedOrControlled";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "ConditionNotFailed";
    readonly type: "error";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "contentId";
        readonly type: "uint256";
    }];
    readonly name: "ContentAlreadyRegisteredForContract";
    readonly type: "error";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "index";
        readonly type: "uint256";
    }];
    readonly name: "EmptyContentSuffix";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "InsufficientThirdPartyPurchase";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "InvalidChannelId";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "InvalidContentIdSeparator";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "InvalidDelegatableNotesAddress";
    readonly type: "error";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "index";
        readonly type: "uint256";
    }];
    readonly name: "InvalidInitialPurchaseIndex";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "InvalidPaymentTokenAddress";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "InvalidThirdPartyMaxDuration";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "MarketplaceCreationFailed";
    readonly type: "error";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "contractAddress";
        readonly type: "address";
    }];
    readonly name: "NotCreatorContract";
    readonly type: "error";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "channelId";
        readonly type: "bytes32";
    }];
    readonly name: "OnlyChannelOwnerCanCreateCreatorContract";
    readonly type: "error";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "owner";
        readonly type: "address";
    }];
    readonly name: "OwnableInvalidOwner";
    readonly type: "error";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "account";
        readonly type: "address";
    }];
    readonly name: "OwnableUnauthorizedAccount";
    readonly type: "error";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "token";
        readonly type: "address";
    }];
    readonly name: "SafeERC20FailedOperation";
    readonly type: "error";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "deadline";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "maxDeadline";
        readonly type: "uint256";
    }];
    readonly name: "ThirdPartyDeadlineTooLong";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "ThresholdMustExceedInitialPurchase";
    readonly type: "error";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "address";
        readonly name: "contractAddress";
        readonly type: "address";
    }, {
        readonly indexed: true;
        readonly internalType: "bytes32";
        readonly name: "channelId";
        readonly type: "bytes32";
    }, {
        readonly indexed: true;
        readonly internalType: "address";
        readonly name: "creator";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly internalType: "bool";
        readonly name: "isThirdParty";
        readonly type: "bool";
    }];
    readonly name: "CreatorContractCreated";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: false;
        readonly internalType: "address";
        readonly name: "oldValue";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly internalType: "address";
        readonly name: "newValue";
        readonly type: "address";
    }];
    readonly name: "DelegatableNotesUpdated";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "address";
        readonly name: "previousOwner";
        readonly type: "address";
    }, {
        readonly indexed: true;
        readonly internalType: "address";
        readonly name: "newOwner";
        readonly type: "address";
    }];
    readonly name: "OwnershipTransferStarted";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "address";
        readonly name: "previousOwner";
        readonly type: "address";
    }, {
        readonly indexed: true;
        readonly internalType: "address";
        readonly name: "newOwner";
        readonly type: "address";
    }];
    readonly name: "OwnershipTransferred";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: false;
        readonly internalType: "uint256";
        readonly name: "oldValue";
        readonly type: "uint256";
    }, {
        readonly indexed: false;
        readonly internalType: "uint256";
        readonly name: "newValue";
        readonly type: "uint256";
    }];
    readonly name: "ThirdPartyMaxDurationUpdated";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: false;
        readonly internalType: "uint256";
        readonly name: "oldValue";
        readonly type: "uint256";
    }, {
        readonly indexed: false;
        readonly internalType: "uint256";
        readonly name: "newValue";
        readonly type: "uint256";
    }];
    readonly name: "ThirdPartyMinPurchaseUpdated";
    readonly type: "event";
}, {
    readonly inputs: readonly [];
    readonly name: "acceptOwnership";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "channelEscrow";
    readonly outputs: readonly [{
        readonly internalType: "contract ChannelEscrow";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly name: "channelIdByContract";
    readonly outputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "";
        readonly type: "bytes32";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "channelRegistry";
    readonly outputs: readonly [{
        readonly internalType: "contract ChannelRegistry";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "conditionFactory";
    readonly outputs: readonly [{
        readonly internalType: "contract ValueThresholdConditionFactory";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "contentIdSeparator";
    readonly outputs: readonly [{
        readonly internalType: "string";
        readonly name: "";
        readonly type: "string";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "contentRegistry";
    readonly outputs: readonly [{
        readonly internalType: "contract ContentRegistry";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly name: "contractCondition";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly name: "contractERC1155";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly components: readonly [{
            readonly internalType: "bytes32";
            readonly name: "channelId";
            readonly type: "bytes32";
        }, {
            readonly internalType: "string";
            readonly name: "channelCanonicalId";
            readonly type: "string";
        }, {
            readonly internalType: "string[]";
            readonly name: "contentSuffixes";
            readonly type: "string[]";
        }, {
            readonly internalType: "uint256[]";
            readonly name: "supplies";
            readonly type: "uint256[]";
        }, {
            readonly internalType: "uint256[]";
            readonly name: "prices";
            readonly type: "uint256[]";
        }, {
            readonly internalType: "uint256";
            readonly name: "threshold";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint256";
            readonly name: "deadline";
            readonly type: "uint256";
        }, {
            readonly internalType: "string";
            readonly name: "metadataCid";
            readonly type: "string";
        }, {
            readonly internalType: "string";
            readonly name: "erc1155MetadataUri";
            readonly type: "string";
        }, {
            readonly internalType: "string";
            readonly name: "erc1155ContractUri";
            readonly type: "string";
        }, {
            readonly internalType: "uint256[]";
            readonly name: "initialPurchaseIndices";
            readonly type: "uint256[]";
        }, {
            readonly internalType: "uint256[]";
            readonly name: "initialPurchaseCounts";
            readonly type: "uint256[]";
        }];
        readonly internalType: "struct CreatorAssuranceContractFactory.CreateContractParams";
        readonly name: "params";
        readonly type: "tuple";
    }];
    readonly name: "createCreatorContract";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly components: readonly [{
            readonly internalType: "bytes32";
            readonly name: "channelId";
            readonly type: "bytes32";
        }, {
            readonly internalType: "string";
            readonly name: "channelCanonicalId";
            readonly type: "string";
        }, {
            readonly internalType: "string[]";
            readonly name: "contentSuffixes";
            readonly type: "string[]";
        }, {
            readonly internalType: "uint256[]";
            readonly name: "supplies";
            readonly type: "uint256[]";
        }, {
            readonly internalType: "uint256[]";
            readonly name: "prices";
            readonly type: "uint256[]";
        }, {
            readonly internalType: "uint256";
            readonly name: "threshold";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint256";
            readonly name: "deadline";
            readonly type: "uint256";
        }, {
            readonly internalType: "string";
            readonly name: "metadataCid";
            readonly type: "string";
        }, {
            readonly internalType: "string";
            readonly name: "erc1155MetadataUri";
            readonly type: "string";
        }, {
            readonly internalType: "string";
            readonly name: "erc1155ContractUri";
            readonly type: "string";
        }, {
            readonly internalType: "uint256[]";
            readonly name: "initialPurchaseIndices";
            readonly type: "uint256[]";
        }, {
            readonly internalType: "uint256[]";
            readonly name: "initialPurchaseCounts";
            readonly type: "uint256[]";
        }];
        readonly internalType: "struct CreatorAssuranceContractFactory.CreateContractParams";
        readonly name: "params";
        readonly type: "tuple";
    }];
    readonly name: "createThirdPartyContract";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "delegatableNotes";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "erc1155Factory";
    readonly outputs: readonly [{
        readonly internalType: "contract PremintingERC1155Factory";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly name: "isThirdPartyCreated";
    readonly outputs: readonly [{
        readonly internalType: "bool";
        readonly name: "";
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "marketplaceFactory";
    readonly outputs: readonly [{
        readonly internalType: "contract MarketplaceFactory";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "owner";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "paymentToken";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "pendingOwner";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "contractAddress";
        readonly type: "address";
    }];
    readonly name: "releaseContentOnFailure";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "renounceOwnership";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "_delegatableNotes";
        readonly type: "address";
    }];
    readonly name: "setDelegatableNotes";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "_maxDuration";
        readonly type: "uint256";
    }];
    readonly name: "setThirdPartyMaxDuration";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "_minPurchase";
        readonly type: "uint256";
    }];
    readonly name: "setThirdPartyMinPurchase";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "thirdPartyMaxDuration";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "thirdPartyMinPurchase";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "newOwner";
        readonly type: "address";
    }];
    readonly name: "transferOwnership";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}];
