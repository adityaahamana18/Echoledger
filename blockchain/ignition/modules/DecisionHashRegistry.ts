import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("DecisionHashRegistryModule", (m) => {
  const registry = m.contract("DecisionHashRegistry");
  return { registry };
});
