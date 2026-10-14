
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TERRALEDGER PropertyRegistry", function () {
  let registry;
  let admin;
  let owner;
  let buyer;
  let unauthorized;

  const propertyId = "TL-2026-0001";
  const locationHash =
    "0x1111111111111111111111111111111111111111111111111111111111111111";
  const documentHash =
    "0x2222222222222222222222222222222222222222222222222222222222222222";
  const areaSqMeters = 1200;

  async function registerProperty(signer = owner) {
    return registry.connect(signer).registerProperty(
      propertyId,
      locationHash,
      documentHash,
      areaSqMeters
    );
  }

  beforeEach(async function () {
    [admin, owner, buyer, unauthorized] = await ethers.getSigners();

    const PropertyRegistry = await ethers.getContractFactory(
      "PropertyRegistry"
    );

    registry = await PropertyRegistry.deploy();

    if (typeof registry.waitForDeployment === "function") {
      await registry.waitForDeployment(); // Ethers.js v6
    } else {
      await registry.deployed(); // Ethers.js v5
    }
  });

  describe("Deployment", function () {
    it("should assign the deployer as admin and authority", async function () {
      expect(await registry.admin()).to.equal(admin.address);
      expect(await registry.authorities(admin.address)).to.equal(true);
    });
  });

  describe("Property registration", function () {
    it("should register a property with the correct details", async function () {
      await registerProperty();

      const property = await registry.verifyProperty(propertyId);

      expect(property.propertyId).to.equal(propertyId);
      expect(property.owner).to.equal(owner.address);
      expect(property.locationHash).to.equal(locationHash);
      expect(property.documentHash).to.equal(documentHash);
      expect(property.areaSqMeters).to.equal(BigInt(areaSqMeters));
      expect(property.exists).to.equal(true);
      expect(property.approved).to.equal(false);
    });

    it("should reject duplicate property IDs", async function () {
      await registerProperty();

      await expect(registerProperty()).to.be.revertedWith(
        "Property already exists"
      );
    });

    it("should reject a property with zero area", async function () {
      await expect(
        registry.connect(owner).registerProperty(
          "TL-INVALID",
          locationHash,
          documentHash,
          0
        )
      ).to.be.revertedWith("Invalid area");
    });

    it("should reject a missing location hash", async function () {
      await expect(
        registry.connect(owner).registerProperty(
          "TL-INVALID",
          ethers.ZeroHash ?? ethers.constants.HashZero,
          documentHash,
          areaSqMeters
        )
      ).to.be.revertedWith("Missing location hash");
    });
  });

  describe("Property approval", function () {
    it("should allow an authorized authority to approve a property", async function () {
      await registerProperty();

      await registry.connect(admin).approveProperty(propertyId);

      const property = await registry.verifyProperty(propertyId);
      expect(property.approved).to.equal(true);
    });

    it("should reject approval by an unauthorized account", async function () {
      await registerProperty();

      await expect(
        registry.connect(unauthorized).approveProperty(propertyId)
      ).to.be.revertedWith("Authority only");
    });

    it("should allow the admin to grant authority to another account", async function () {
      await registry.connect(admin).setAuthority(buyer.address, true);

      expect(await registry.authorities(buyer.address)).to.equal(true);
    });
  });

  describe("Ownership transfer", function () {
    beforeEach(async function () {
      await registerProperty();
      await registry.connect(admin).approveProperty(propertyId);
    });

    it("should transfer ownership after an authority approves the request", async function () {
      await registry
        .connect(owner)
        .requestOwnershipTransfer(propertyId, buyer.address);

      const pending = await registry.verifyProperty(propertyId);
      expect(pending.pendingOwner).to.equal(buyer.address);
      expect(pending.owner).to.equal(owner.address);

      await registry.connect(admin).approveOwnershipTransfer(propertyId);

      const updated = await registry.verifyProperty(propertyId);
      expect(updated.owner).to.equal(buyer.address);
      expect(updated.pendingOwner).to.equal(ethers.ZeroAddress ?? ethers.constants.AddressZero);
    });

    it("should reject a transfer request from someone who is not the owner", async function () {
      await expect(
        registry
          .connect(unauthorized)
          .requestOwnershipTransfer(propertyId, buyer.address)
      ).to.be.revertedWith("Owner only");
    });

    it("should reject transfer requests before property approval", async function () {
      const anotherId = "TL-2026-0002";

      await registry.connect(buyer).registerProperty(
        anotherId,
        locationHash,
        documentHash,
        areaSqMeters
      );

      await expect(
        registry.connect(buyer).requestOwnershipTransfer(
          anotherId,
          unauthorized.address
        )
      ).to.be.revertedWith("Property not approved");
    });

    it("should allow the owner to cancel a pending transfer", async function () {
      await registry
        .connect(owner)
        .requestOwnershipTransfer(propertyId, buyer.address);

      await registry.connect(owner).cancelOwnershipTransfer(propertyId);

      const property = await registry.verifyProperty(propertyId);
      expect(property.pendingOwner).to.equal(ethers.ZeroAddress ?? ethers.constants.AddressZero);
      expect(property.owner).to.equal(owner.address);
    });
  });

  describe("Property verification", function () {
    it("should reject verification of a nonexistent property", async function () {
      await expect(
        registry.verifyProperty("TL-NOT-FOUND")
      ).to.be.revertedWith("Property not found");
    });

    it("should return a deterministic property key", async function () {
      const firstKey = await registry.getPropertyKey(propertyId);
      const secondKey = await registry.getPropertyKey(propertyId);

      expect(firstKey).to.equal(secondKey);
    });
  });
});
