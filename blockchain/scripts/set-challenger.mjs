import hre from "hardhat";

const { viem } = await hre.network.create();
const dispute = await viem.getContractAt("SimpleDispute", "0x5FbDB2315678afecb367f032d93F642f64180aa3");
const accounts = await viem.getWalletClients();
const sender = accounts[0];
const challengerAddr = sender.account.address;
console.log("Using sender:", sender.account.address);
console.log("Setting automated challenger to:", challengerAddr);
const tx = await dispute.write.setAutomatedChallenger([challengerAddr]);
console.log("Transaction:", tx);
console.log("Automated challenger set successfully!");