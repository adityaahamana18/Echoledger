import { network } from "hardhat";

const contractAddress = process.env.SIMPLE_DISPUTE_ADDRESS as `0x${string}` | undefined;
const challenger = process.env.AUTOMATION_WALLET_ADDRESS as `0x${string}` | undefined;
if (!contractAddress || !challenger) throw new Error("Set SIMPLE_DISPUTE_ADDRESS and AUTOMATION_WALLET_ADDRESS.");

const { viem } = await network.create();
const dispute = await viem.getContractAt("SimpleDispute", contractAddress);
await dispute.write.setAutomatedChallenger([challenger]);
console.log(`Automated challenger set to ${challenger}`);
