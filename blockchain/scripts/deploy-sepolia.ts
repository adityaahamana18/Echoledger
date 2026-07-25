import "dotenv/config";
import { network } from "hardhat";

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.SEPOLIA_PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    console.error("❌ SEPOLIA_RPC_URL aur SEPOLIA_PRIVATE_KEY set nahi hai!");
    console.error("\nYeh do cheezein chahiye:");
    console.error("1. SEPOLIA_RPC_URL = https://sepolia.infura.io/v3/YOUR_KEY");
    console.error("2. SEPOLIA_PRIVATE_KEY = 0xYOUR_METAMASK_PRIVATE_KEY");
    console.error("\nKaise laoge?");
    console.error("1. https://www.infura.io/ pe jao → Sign up → Create API Key");
    console.error("2. MetaMask me jis account me Sepolia ETH ho, uski private key export karo");
    console.error("3. https://sepoliafaucet.com/ se free Sepolia ETH lo");
    process.exit(1);
  }

  const { viem } = await network.create();
  const [deployer] = await viem.getWalletClients();

  console.log("Deploying from:", deployer.account.address);
  console.log("Network: Sepolia Testnet (Chain ID: 11155111)");

  // 1. Deploy DecisionHashRegistry
  const registry = await viem.deployContract("DecisionHashRegistry", []);
  console.log("✅ DecisionHashRegistry deployed at:", registry.address);

  // 2. Deploy SimpleDispute with minimum stake of 0.001 ETH
  const minimumStake = 1000000000000000n;
  const dispute = await viem.deployContract("SimpleDispute", [minimumStake]);
  console.log("✅ SimpleDispute deployed at:", dispute.address);

  console.log("\n=== Deployment Summary ===");
  console.log(`DecisionHashRegistry: ${registry.address}`);
  console.log(`SimpleDispute:        ${dispute.address}`);
  console.log(`Minimum stake:        0.001 ETH`);
  console.log(`Deployer:             ${deployer.account.address}`);

  console.log("\n📝 Inhe apne .env files me daalo:");
  console.log(`VITE_REGISTRY_ADDRESS=${registry.address}`);
  console.log(`VITE_SIMPLE_DISPUTE_ADDRESS=${dispute.address}`);
  console.log(`REGISTRY_ADDRESS=${registry.address}`);
  console.log(`SIMPLE_DISPUTE_ADDRESS=${dispute.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});