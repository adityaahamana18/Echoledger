import { createPublicClient, createWalletClient, custom, defineChain, keccak256, parseEther, stringToHex } from "viem";

// ── Contract Addresses ─────────────────────────────────────────────────────────
const simpleDisputeAddress = import.meta.env.VITE_SIMPLE_DISPUTE_ADDRESS;
const registryAddress = import.meta.env.VITE_REGISTRY_ADDRESS;
export const minimumStake = import.meta.env.VITE_CHALLENGE_STAKE_ETH || "0.001";

// ── ABIs ──────────────────────────────────────────────────────────────────────
const disputeAbi = [
  { type: "function", name: "commitDecision", stateMutability: "nonpayable", inputs: [{ name: "decisionId", type: "bytes32" }, { name: "decisionHash", type: "bytes32" }], outputs: [] },
  { type: "function", name: "challengeDecision", stateMutability: "payable", inputs: [{ name: "decisionId", type: "bytes32" }, { name: "reason", type: "string" }], outputs: [] },
  { type: "function", name: "verifyDecision", stateMutability: "view", inputs: [{ name: "decisionId", type: "bytes32" }], outputs: [{ name: "hash", type: "bytes32" }, { name: "committedAt", type: "uint64" }, { name: "committedBy", type: "address" }] },
  { type: "function", name: "challengeCount", stateMutability: "view", inputs: [{ name: "decisionId", type: "bytes32" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "minimumStake", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
];

const registryAbi = [
  { type: "function", name: "anchor", stateMutability: "nonpayable", inputs: [{ name: "decisionHash", type: "bytes32" }], outputs: [] },
  { type: "function", name: "verify", stateMutability: "view", inputs: [{ name: "decisionHash", type: "bytes32" }], outputs: [{ name: "anchored", type: "bool" }, { name: "anchoredAt", type: "uint64" }, { name: "anchoredBy", type: "address" }] },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const assertWallet = () => {
  if (!window.ethereum) throw new Error("Install MetaMask or another EIP-1193 wallet.");
};

const hashId = (id) => keccak256(stringToHex(id));
const hashBytes = (hash) => {
  const cleaned = hash.replace(/^sha256:/, "").replace(/^0x/, "");
  return `0x${cleaned}`;
};

const IS_PRODUCTION = import.meta.env.VITE_NETWORK === "sepolia";

const TARGET_CHAIN_ID = IS_PRODUCTION ? 11155111 : 31337;
const TARGET_CHAIN = IS_PRODUCTION
  ? defineChain({
      id: 11155111,
      name: "Sepolia",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["https://rpc.sepolia.org"] } },
      blockExplorers: { default: { name: "Etherscan", url: "https://sepolia.etherscan.io" } },
    })
  : defineChain({
      id: 31337,
      name: "Hardhat Local",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
    });

const ensureHardhatNetwork = async () => {
  const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
  if (parseInt(chainIdHex, 16) === TARGET_CHAIN_ID) return;
  const chainIdHexStr = `0x${TARGET_CHAIN_ID.toString(16)}`;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHexStr }],
    });
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: chainIdHexStr,
          chainName: TARGET_CHAIN.name,
          nativeCurrency: TARGET_CHAIN.nativeCurrency,
          rpcUrls: [TARGET_CHAIN.rpcUrls.default.http[0]],
        }],
      });
    } else {
      throw err;
    }
  }
};

const getClients = async () => {
  assertWallet();
  await window.ethereum.request({ method: "eth_requestAccounts" });
  await ensureHardhatNetwork();
  const transport = custom(window.ethereum);
  const wallet = createWalletClient({ chain: TARGET_CHAIN, transport });
  const [account] = await wallet.getAddresses();
  return { wallet, publicClient: createPublicClient({ chain: TARGET_CHAIN, transport }), account };
};

// ── SimpleDispute Functions ────────────────────────────────────────────────────
export async function commitDecision(id, hash) {
  const { wallet, publicClient, account } = await getClients();
  const tx = await wallet.writeContract({
    address: simpleDisputeAddress,
    abi: disputeAbi,
    functionName: "commitDecision",
    args: [hashId(id), hashBytes(hash)],
    account,
  });
  return publicClient.waitForTransactionReceipt({ hash: tx });
}

export async function challengeDecision(id, reason) {
  const { wallet, publicClient, account } = await getClients();
  const tx = await wallet.writeContract({
    address: simpleDisputeAddress,
    abi: disputeAbi,
    functionName: "challengeDecision",
    args: [hashId(id), reason],
    value: parseEther(minimumStake),
    account,
  });
  return publicClient.waitForTransactionReceipt({ hash: tx });
}

export async function verifyDecision(id) {
  assertWallet();
  await ensureHardhatNetwork();
  const publicClient = createPublicClient({ chain: TARGET_CHAIN, transport: custom(window.ethereum) });
  try {
    const [hash, committedAt, committedBy] = await publicClient.readContract({
      address: simpleDisputeAddress,
      abi: disputeAbi,
      functionName: "verifyDecision",
      args: [hashId(id)],
    });
    const minimumStakeWei = await publicClient.readContract({
      address: simpleDisputeAddress,
      abi: disputeAbi,
      functionName: "minimumStake",
      args: [],
    });
    return { hash, committedAt: Number(committedAt), committedBy, minimumStake: minimumStakeWei.toString() };
  } catch (error) {
    if (error.message?.includes("no data") || error.message?.includes("0x")) {
      throw new Error("No contract found at the configured address. Ensure MetaMask is connected to the correct network where SimpleDispute is deployed.");
    }
    throw error;
  }
}

// ── DecisionHashRegistry Functions ─────────────────────────────────────────────
export async function anchorDecisionHash(hash) {
  const { wallet, publicClient, account } = await getClients();
  const tx = await wallet.writeContract({
    address: registryAddress,
    abi: registryAbi,
    functionName: "anchor",
    args: [hashBytes(hash)],
    account,
  });
  return publicClient.waitForTransactionReceipt({ hash: tx });
}

export async function verifyHashOnChain(hash) {
  assertWallet();
  await ensureHardhatNetwork();
  const publicClient = createPublicClient({ chain: TARGET_CHAIN, transport: custom(window.ethereum) });
  try {
    const [anchored, anchoredAt, anchoredBy] = await publicClient.readContract({
      address: registryAddress,
      abi: registryAbi,
      functionName: "verify",
      args: [hashBytes(hash)],
    });
    return { anchored, anchoredAt: Number(anchoredAt), anchoredBy };
  } catch (error) {
    if (error.message?.includes("no data") || error.message?.includes("0x")) {
      return { anchored: false, anchoredAt: 0, anchoredBy: null };
    }
    throw error;
  }
}

// ── Status Checks ──────────────────────────────────────────────────────────────
export const isBlockchainConfigured = () => Boolean(simpleDisputeAddress);
export const isRegistryConfigured = () => Boolean(registryAddress);