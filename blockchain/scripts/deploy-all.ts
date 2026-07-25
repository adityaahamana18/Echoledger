import { network } from "hardhat";

async function main() {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();

  console.log("Deploying from:", deployer.account.address);

  // 1. Deploy DecisionHashRegistry
  const registry = await viem.deployContract("DecisionHashRegistry", []);
  console.log("DecisionHashRegistry deployed at:", registry.address);

  // 2. Deploy SimpleDispute with minimum stake of 0.001 ETH (in wei)
  const minimumStake = 1000000000000000n; // 0.001 ETH
  const dispute = await viem.deployContract("SimpleDispute", [minimumStake]);
  console.log("SimpleDispute deployed at:", dispute.address);

  // Print deployment summary
  console.log("\n=== Deployment Summary ===");
  console.log(`DecisionHashRegistry: ${registry.address}`);
  console.log(`SimpleDispute:        ${dispute.address}`);
  console.log(`Minimum stake:        0.001 ETH`);
  console.log(`Deployer:             ${deployer.account.address}`);
  console.log("\nAdd these to your .env files:");
  console.log(`VITE_REGISTRY_ADDRESS=${registry.address}`);
  console.log(`VITE_SIMPLE_DISPUTE_ADDRESS=${dispute.address}`);
  console.log(`REGISTRY_ADDRESS=${registry.address}`);
  console.log(`SIMPLE_DISPUTE_ADDRESS=${dispute.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});