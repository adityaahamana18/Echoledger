import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("SimpleDisputeModule", (m) => {
  const minimumStake = m.getParameter("minimumStake", 1000000000000000n);
  const dispute = m.contract("SimpleDispute", [minimumStake]);
  return { dispute };
});
