import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { createPublicClient, createWalletClient, http, keccak256, stringToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const disputeAbi = [{ type: "function", name: "automatedChallenge", stateMutability: "nonpayable", inputs: [{ type: "bytes32", name: "decisionId" }, { type: "string", name: "reason" }], outputs: [] }];
const automationReady = () => process.env.BLOCKCHAIN_RPC_URL && process.env.SIMPLE_DISPUTE_ADDRESS && process.env.AUTOMATION_PRIVATE_KEY;
const automatedChallenge = async (id, hash, reason) => {
  if (!automationReady()) return null;
  const account = privateKeyToAccount(process.env.AUTOMATION_PRIVATE_KEY);
  const client = createWalletClient({ account, transport: http(process.env.BLOCKCHAIN_RPC_URL) });
  const tx = await client.writeContract({ address: process.env.SIMPLE_DISPUTE_ADDRESS, abi: disputeAbi, functionName: "automatedChallenge", args: [keccak256(stringToHex(id)), reason] });
  await createPublicClient({ transport: http(process.env.BLOCKCHAIN_RPC_URL) }).waitForTransactionReceipt({ hash: tx });
  return tx;
};
let adminAuth = null;
let adminDb = null;
try {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) : null;
  const firebaseAdmin = getApps().length ? getApps()[0] : initializeApp({ credential: serviceAccount ? cert(serviceAccount) : applicationDefault() });
  adminAuth = getAuth(firebaseAdmin);
  adminDb = getFirestore(firebaseAdmin);
} catch (error) {
  console.warn("Firebase Admin is not configured. Admin challenge endpoints are disabled.", error.message);
}

const demoDecision = ({ income, creditScore, loanAmount }) => {
  const ratio = Number(loanAmount) / Math.max(Number(income) * 12, 1);
  const approved = Number(creditScore) >= 650 && ratio <= 5;
  return {
    decision: approved ? "Approved" : "Review required",
    confidence: Math.max(58, Math.min(96, Math.round(Number(creditScore) / 10 - ratio * 2))),
    risk: approved ? (Number(creditScore) > 740 ? "Low" : "Medium") : "High",
    reason: approved ? "Credit profile, stated income, and requested amount meet the policy threshold." : "The requested amount or credit profile needs a human review before approval.",
    suggestion: approved ? "Maintain on-time repayments to preserve this strong profile." : "Reduce the requested amount or provide supporting income evidence for reassessment.",
  };
};

const biasAudit = () => ({
  protectedAttributesExcluded: ["Name", "Age"],
  evaluatedFactors: ["Income", "Credit score", "Employment type", "Loan amount", "Purpose"],
  status: "No protected attributes used",
  note: "This audit confirms the decision request excludes name and age. It is a transparency check, not a guarantee of fairness across populations.",
});
const reasoningSteps = ({ income, creditScore, loanAmount }) => [
  { title: "Application normalized", detail: "Required financial inputs were validated and protected attributes were excluded." },
  { title: "Income affordability assessed", detail: `Annualized income: ₹${(Number(income) * 12).toLocaleString("en-IN")}.` },
  { title: "Credit signal assessed", detail: `Credit score ${creditScore} was evaluated against the policy threshold.` },
  { title: "Exposure ratio calculated", detail: `Requested amount is ${(Number(loanAmount) / Math.max(Number(income) * 12, 1)).toFixed(2)}× annual income.` },
];
const agentReview = (result) => {
  const requiresReview = !result.decision?.toLowerCase().includes("approv") || Number(result.confidence) < 70;
  return { disagrees: requiresReview, verdict: requiresReview ? "Challenge recommended" : "No material disagreement", reason: requiresReview ? "Independent reviewer found insufficient certainty for an unassisted approval." : "Independent reviewer agrees that the available policy signals support this outcome." };
};

app.get("/", (_, res) => res.json({ service: "EchoLedger", mode: groq ? "groq" : "demo" }));
const requireAuth = async (req, res, next) => {
  if (!adminAuth) return res.status(503).json({ error: "Firebase Admin credentials are not configured." });
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Authentication token required." });
  try {
    req.user = await adminAuth.verifyIdToken(token);
    next();
  } catch { res.status(401).json({ error: "Invalid or expired authentication token." }); }
};

app.post("/loan", requireAuth, async (req, res) => {
  const { name, income, creditScore, loanAmount, age, employment, purpose } = req.body;
  if (!name || !income || !creditScore || !loanAmount) return res.status(400).json({ error: "Name, income, credit score, and loan amount are required." });
  const base = { applicant: name, income, creditScore, loanAmount };
  if (!groq) { const result = demoDecision(req.body); return res.json({ ...base, ...result, biasAudit: biasAudit(), reasoningSteps: reasoningSteps(req.body), agentReview: agentReview(result), demoMode: true }); }
  const prompt = `You are an AI loan officer. Analyze this application using only these policy inputs: monthly income ${income}; credit score ${creditScore}; employment ${employment}; requested amount ${loanAmount}; purpose ${purpose}. Do not infer or use name, age, gender, race, religion, ethnicity, disability, or any other protected characteristic. Return ONLY valid JSON with decision, reason, risk (Low/Medium/High), confidence (number 0-100), suggestion, and trace (array of {title, detail}).`;
  try {
    const completion = await groq.chat.completions.create({ model: "llama-3.3-70b-versatile", messages: [{ role: "system", content: "You are a fair, concise banking AI. Do not use protected characteristics." }, { role: "user", content: prompt }], temperature: 0.2, response_format: { type: "json_object" } });
    const ai = JSON.parse(completion.choices[0].message.content);
    const reviewCompletion = await groq.chat.completions.create({ model: "llama-3.3-70b-versatile", messages: [{ role: "system", content: "You are an independent AI auditor. Review a loan decision for unsupported confidence or policy inconsistency. Return only JSON with disagrees (boolean), verdict, and reason. Do not use protected characteristics." }, { role: "user", content: JSON.stringify({ inputs: { income, creditScore, loanAmount, employment, purpose }, decision: ai }) }], temperature: 0, response_format: { type: "json_object" } });
    const review = JSON.parse(reviewCompletion.choices[0].message.content);
    res.json({ ...base, ...ai, biasAudit: biasAudit(), reasoningSteps: reasoningSteps(req.body), agentReview: review });
  } catch (error) {
    console.error("Groq request failed", error.message);
    const result = demoDecision(req.body); res.json({ ...base, ...result, biasAudit: biasAudit(), reasoningSteps: reasoningSteps(req.body), agentReview: agentReview(result), demoMode: true, fallbackReason: "AI provider unavailable" });
  }
});

app.post("/automated-challenge", requireAuth, async (req, res) => {
  if (!adminDb) return res.status(503).json({ error: "Firestore Admin credentials are not configured." });
  const { id, hash, reason } = req.body;
  const reference = adminDb.doc(`users/${req.user.uid}/applications/${id}`);
  const audit = await reference.get();
  if (!audit.exists || !audit.data().result?.agentReview?.disagrees) return res.status(400).json({ error: "No independent AI disagreement exists for this decision." });
  if (!automationReady()) return res.status(409).json({ error: "Automation wallet is not configured." });
  const transactionHash = await automatedChallenge(id, hash, reason || audit.data().result.agentReview.reason);
  await reference.update({ agentChallenge: { status: "Submitted on-chain", reason: reason || audit.data().result.agentReview.reason, transactionHash, submittedAt: new Date().toISOString() } });
  res.json({ transactionHash });
});

const requireAdmin = async (req, res, next) => {
  if (!adminAuth || !adminDb) return res.status(503).json({ error: "Firebase Admin credentials are not configured." });
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Authentication token required." });
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.admin) return res.status(403).json({ error: "Admin access required." });
    req.admin = decoded;
    next();
  } catch { res.status(401).json({ error: "Invalid or expired authentication token." }); }
};

app.get("/admin/challenges", requireAdmin, async (_, res) => {
  const snapshot = await adminDb.collectionGroup("applications").get();
  const challengeDocuments = snapshot.docs.filter((item) => item.data().challenge?.reason);
  const challenges = await Promise.all(challengeDocuments.map(async (item) => {
    const data = item.data();
    const userId = item.ref.parent.parent.id;
    const user = await adminDb.doc(`users/${userId}`).get();
    return { id: item.id, userId, requester: user.exists ? user.data().email || user.data().name : "Unknown user", application: data.application, challenge: data.challenge, result: data.result || null, createdAt: data.createdAt };
  }));
  challenges.sort((a, b) => new Date(b.challenge.submittedAt || b.createdAt) - new Date(a.challenge.submittedAt || a.createdAt));
  res.json({ challenges });
});

app.patch("/admin/challenges/:userId/:applicationId", requireAdmin, async (req, res) => {
  const { status, reviewNote = "" } = req.body;
  if (!["Under review", "Resolved", "Rejected"].includes(status)) return res.status(400).json({ error: "Invalid challenge status." });
  const reference = adminDb.doc(`users/${req.params.userId}/applications/${req.params.applicationId}`);
  await reference.update({ "challenge.status": status, "challenge.reviewNote": reviewNote, "challenge.reviewedAt": new Date().toISOString(), "challenge.reviewedBy": req.admin.email || req.admin.uid });
  res.json({ success: true });
});
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`EchoLedger API listening on http://localhost:${port}`));
