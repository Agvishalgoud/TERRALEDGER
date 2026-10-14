
const { ethers } = require("hardhat");

async function main() {
  const network = await ethers.provider.getNetwork();

  console.log("Network chain ID:", network.chainId.toString());

  if (network.chainId.toString() !== "11155111") {
    throw new Error("Wrong network! Expected Sepolia.");
  }

  const [deployer] = await ethers.getSigners();

  console.log("Deploying from:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Wallet balance:", ethers.formatEther
    ? ethers.formatEther(balance)
    : ethers.utils.formatEther(balance), "ETH");

  const PropertyRegistry = await ethers.getContractFactory(
    "PropertyRegistry"
  );

  console.log("Deploying PropertyRegistry...");

  const registry = await PropertyRegistry.deploy();

  if (typeof registry.waitForDeployment === "function") {
    await registry.waitForDeployment(); // Ethers v6
  } else {
    await registry.deployed(); // Ethers v5
  }

  const address =
    typeof registry.getAddress === "function"
      ? await registry.getAddress()
      : registry.address;

  console.log("\nDeployment successful!");
  console.log("Contract address:", address);
  console.log("Admin address:", await registry.admin());
  console.log("Transaction hash:", registry.deploymentTransaction
    ? registry.deploymentTransaction().hash
    : registry.deployTransaction.hash);
  console.log(
    "View on Sepolia Etherscan:",
    `https://sepolia.etherscan.io/address/${address}`
  );
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
