import { createPublicClient, createWalletClient, custom, keccak256, parseEther, stringToHex } from "viem";

const address = import.meta.env.VITE_SIMPLE_DISPUTE_ADDRESS;
export const minimumStake = import.meta.env.VITE_CHALLENGE_STAKE_ETH || "0.001";
const abi = [
  { type: "function", name: "commitDecision", stateMutability: "nonpayable", inputs: [{ name: "decisionId", type: "bytes32" }, { name: "decisionHash", type: "bytes32" }], outputs: [] },
  { type: "function", name: "challengeDecision", stateMutability: "payable", inputs: [{ name: "decisionId", type: "bytes32" }, { name: "reason", type: "string" }], outputs: [] },
  { type: "function", name: "verifyDecision", stateMutability: "view", inputs: [{ name: "decisionId", type: "bytes32" }], outputs: [{ name: "hash", type: "bytes32" }, { name: "committedAt", type: "uint64" }, { name: "committedBy", type: "address" }] },
];
const assertReady = () => { if (!window.ethereum) throw new Error("Install MetaMask or another EIP-1193 wallet."); if (!address) throw new Error("VITE_SIMPLE_DISPUTE_ADDRESS is not configured."); };
const hashId = (id) => keccak256(stringToHex(id));
const hashBytes = (hash) => `0x${hash.replace(/^sha256:/, "").replace(/^0x/, "")}`;
const clients = async () => { assertReady(); await window.ethereum.request({ method: "eth_requestAccounts" }); const transport = custom(window.ethereum); const wallet = createWalletClient({ transport }); const [account] = await wallet.getAddresses(); return { wallet, publicClient: createPublicClient({ transport }), account }; };

export async function commitDecision(id, hash) { const { wallet, publicClient, account } = await clients(); const tx = await wallet.writeContract({ address, abi, functionName: "commitDecision", args: [hashId(id), hashBytes(hash)], account }); return publicClient.waitForTransactionReceipt({ hash: tx }); }
export async function challengeDecision(id, reason) { const { wallet, publicClient, account } = await clients(); const tx = await wallet.writeContract({ address, abi, functionName: "challengeDecision", args: [hashId(id), reason], value: parseEther(minimumStake), account }); return publicClient.waitForTransactionReceipt({ hash: tx }); }
export async function verifyDecision(id) { assertReady(); const publicClient = createPublicClient({ transport: custom(window.ethereum) }); try { const [hash, committedAt, committedBy] = await publicClient.readContract({ address, abi, functionName: "verifyDecision", args: [hashId(id)] }); return { hash, committedAt, committedBy }; } catch (error) { if (error.message?.includes("no data") || error.message?.includes("0x")) throw new Error("No contract found at the configured address. Ensure MetaMask is connected to the correct network where SimpleDispute is deployed."); throw error; } }
export const isBlockchainConfigured = () => Boolean(address);
