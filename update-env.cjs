const fs = require("fs");
const path = require("path");

const deploymentsDir = path.join(__dirname, "blockchain", "ignition", "deployments");

// Find all chain directories
const chains = fs.readdirSync(deploymentsDir).filter((d) =>
  fs.statSync(path.join(deploymentsDir, d)).isDirectory()
);

let simpleDisputeAddress = null;
let registryAddress = null;

for (const chain of chains) {
  const addressFile = path.join(deploymentsDir, chain, "deployed_addresses.json");
  if (!fs.existsSync(addressFile)) continue;
  const addresses = JSON.parse(fs.readFileSync(addressFile, "utf8"));
  for (const [key, value] of Object.entries(addresses)) {
    if (key.includes("SimpleDispute")) simpleDisputeAddress = value;
    if (key.includes("DecisionHashRegistry")) registryAddress = value;
  }
}

if (!simpleDisputeAddress) {
  console.error("SimpleDispute address not found in deployments.");
  process.exit(1);
}

console.log("SimpleDispute:        ", simpleDisputeAddress);
console.log("DecisionHashRegistry: ", registryAddress || "(not deployed)");

// Update frontend .env
const frontendEnvPath = path.join(__dirname, "frontend", ".env");
let frontendEnv = fs.existsSync(frontendEnvPath) ? fs.readFileSync(frontendEnvPath, "utf8") : "";

frontendEnv = setEnvVar(frontendEnv, "VITE_SIMPLE_DISPUTE_ADDRESS", simpleDisputeAddress);
if (registryAddress) {
  frontendEnv = setEnvVar(frontendEnv, "VITE_REGISTRY_ADDRESS", registryAddress);
}
if (!frontendEnv.includes("VITE_API_URL")) {
  frontendEnv += "\nVITE_API_URL=http://localhost:5000";
}
if (!frontendEnv.includes("VITE_CHALLENGE_STAKE_ETH")) {
  frontendEnv += "\nVITE_CHALLENGE_STAKE_ETH=0.001";
}
fs.writeFileSync(frontendEnvPath, frontendEnv.trim() + "\n");
console.log("Updated frontend/.env");

// Update backend .env
const backendEnvPath = path.join(__dirname, "backend", ".env");
let backendEnv = fs.existsSync(backendEnvPath) ? fs.readFileSync(backendEnvPath, "utf8") : "";

backendEnv = setEnvVar(backendEnv, "SIMPLE_DISPUTE_ADDRESS", simpleDisputeAddress);
if (registryAddress) {
  backendEnv = setEnvVar(backendEnv, "REGISTRY_ADDRESS", registryAddress);
}
if (!backendEnv.includes("BLOCKCHAIN_RPC_URL")) {
  backendEnv += "\nBLOCKCHAIN_RPC_URL=http://127.0.0.1:8545";
}
if (!backendEnv.includes("AUTOMATION_PRIVATE_KEY")) {
  backendEnv += "\nAUTOMATION_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
}
if (!backendEnv.includes("AUTOMATION_WALLET_ADDRESS")) {
  backendEnv += "\nAUTOMATION_WALLET_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
}
fs.writeFileSync(backendEnvPath, backendEnv.trim() + "\n");
console.log("Updated backend/.env");

function setEnvVar(content, key, value) {
  const regex = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;
  return regex.test(content) ? content.replace(regex, line) : content + "\n" + line;
}
