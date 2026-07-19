import { network } from "hardhat";

async function main() {
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3" as `0x${string}`;
  const challenger = "0xf39Fd6e51aad88F6F4ce6aB8827279cfffb92266" as `0x${string}`;

  const { viem } = await network.create();
  const dispute = await viem.getContractAt("SimpleDispute", contractAddress);
  await dispute.write.setAutomatedChallenger([challenger]);
  console.log(`Automated challenger set to ${challenger}`);
}

main().catch(console.error);