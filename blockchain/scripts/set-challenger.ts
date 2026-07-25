import { network } from "hardhat";

async function main() {
  const contractAddress = process.env.SIMPLE_DISPUTE_ADDRESS as `0x${string}` | undefined;
  const challenger = process.env.AUTOMATION_WALLET_ADDRESS as `0x${string}` | undefined;
  
  if (!contractAddress || !challenger) {
    console.error("Set SIMPLE_DISPUTE_ADDRESS and AUTOMATION_WALLET_ADDRESS.");
    console.log("\nUsing Hardhat account #1 (0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266) as default challenger.");
    console.log("Set AUTOMATION_WALLET_ADDRESS in your .env and run again for a custom wallet.");
    process.exitCode = 1;
    return;
  }

  const { viem } = await network.create();
  const dispute = await viem.getContractAt("SimpleDispute", contractAddress);
  const tx = await dispute.write.setAutomatedChallenger([challenger]);
  console.log(`✓ Automated challenger set to ${challenger}`);
  console.log(`  Transaction: ${tx}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});