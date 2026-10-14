
 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TERRALEDGER Property Registry
/// @notice Educational prototype for verifiable property records.
/// @dev This contract does not establish legal ownership by itself.
contract PropertyRegistry {
    address public immutable admin;

    mapping(address => bool) public authorities;

    struct Property {
        string propertyId;
        address owner;
        bytes32 locationHash;
        bytes32 documentHash;
        uint256 areaSqMeters;
        bool exists;
        bool approved;
        address pendingOwner;
    }

    mapping(bytes32 => Property) private properties;

    event AuthorityUpdated(address indexed account, bool authorized);

    event PropertyRegistered(
        bytes32 indexed propertyKey,
        string propertyId,
        address indexed submittedBy
    );

    event PropertyApproved(
        bytes32 indexed propertyKey,
        address indexed owner,
        address indexed approvedBy
    );

    event OwnershipTransferRequested(
        bytes32 indexed propertyKey,
        address indexed currentOwner,
        address indexed proposedOwner
    );

    event OwnershipTransferred(
        bytes32 indexed propertyKey,
        address indexed previousOwner,
        address indexed newOwner
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "Admin only");
        _;
    }

    modifier onlyAuthority() {
        require(authorities[msg.sender], "Authority only");
        _;
    }

    constructor() {
        admin = msg.sender;
        authorities[msg.sender] = true;
        emit AuthorityUpdated(msg.sender, true);
    }

    function setAuthority(
        address account,
        bool authorized
    ) external onlyAdmin {
        require(account != address(0), "Invalid address");

        authorities[account] = authorized;
        emit AuthorityUpdated(account, authorized);
    }

    function registerProperty(
        string calldata propertyId,
        bytes32 locationHash,
        bytes32 documentHash,
        uint256 areaSqMeters
    ) external {
        require(bytes(propertyId).length > 0, "Empty property ID");
        require(locationHash != bytes32(0), "Missing location hash");
        require(documentHash != bytes32(0), "Missing document hash");
        require(areaSqMeters > 0, "Invalid area");

        bytes32 key = keccak256(bytes(propertyId));

        require(!properties[key].exists, "Property already exists");

        properties[key] = Property({
            propertyId: propertyId,
            owner: msg.sender,
            locationHash: locationHash,
            documentHash: documentHash,
            areaSqMeters: areaSqMeters,
            exists: true,
            approved: false,
            pendingOwner: address(0)
        });

        emit PropertyRegistered(key, propertyId, msg.sender);
    }

    function approveProperty(
        string calldata propertyId
    ) external onlyAuthority {
        bytes32 key = keccak256(bytes(propertyId));
        Property storage property = properties[key];

        require(property.exists, "Property not found");
        require(!property.approved, "Already approved");

        property.approved = true;

        emit PropertyApproved(key, property.owner, msg.sender);
    }

    function requestOwnershipTransfer(
        string calldata propertyId,
        address proposedOwner
    ) external {
        bytes32 key = keccak256(bytes(propertyId));
        Property storage property = properties[key];

        require(property.exists, "Property not found");
        require(property.approved, "Property not approved");
        require(property.owner == msg.sender, "Owner only");
        require(proposedOwner != address(0), "Invalid new owner");
        require(proposedOwner != msg.sender, "Already the owner");
        require(
            property.pendingOwner == address(0),
            "Transfer already pending"
        );

        property.pendingOwner = proposedOwner;

        emit OwnershipTransferRequested(
            key,
            msg.sender,
            proposedOwner
        );
    }

    function approveOwnershipTransfer(
        string calldata propertyId
    ) external onlyAuthority {
        bytes32 key = keccak256(bytes(propertyId));
        Property storage property = properties[key];

        require(property.exists, "Property not found");
        require(property.approved, "Property not approved");

        address newOwner = property.pendingOwner;
        require(newOwner != address(0), "No pending transfer");

        address previousOwner = property.owner;

        property.owner = newOwner;
        property.pendingOwner = address(0);

        emit OwnershipTransferred(key, previousOwner, newOwner);
    }

    function cancelOwnershipTransfer(
        string calldata propertyId
    ) external {
        bytes32 key = keccak256(bytes(propertyId));
        Property storage property = properties[key];

        require(property.exists, "Property not found");
        require(property.owner == msg.sender, "Owner only");
        require(
            property.pendingOwner != address(0),
            "No pending transfer"
        );

        property.pendingOwner = address(0);
    }

    function verifyProperty(
        string calldata propertyId
    ) external view returns (Property memory) {
        bytes32 key = keccak256(bytes(propertyId));

        require(properties[key].exists, "Property not found");

        return properties[key];
    }

    function getPropertyKey(
        string calldata propertyId
    ) external pure returns (bytes32) {
        return keccak256(bytes(propertyId));
    }
}

