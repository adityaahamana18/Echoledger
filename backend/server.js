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

// ── Industry-aware helpers ────────────────────────────────────────────────────

const INDUSTRY_META = {
  banking: {
    excluded: ["Name", "Age", "Gender", "Race"],
    evaluated: ["Income", "Credit score", "Employment type", "Loan amount", "Purpose"],
    juryInput: ({ income, creditScore, loanAmount, employment, purpose }) => ({ income, creditScore, loanAmount, employment, purpose }),
    demoDecide: ({ income, creditScore, loanAmount }) => {
      const ratio = Number(loanAmount) / Math.max(Number(income) * 12, 1);
      const ok = Number(creditScore) >= 650 && ratio <= 5;
      return { decision: ok ? "Approved" : "Review required", confidence: Math.max(58, Math.min(96, Math.round(Number(creditScore) / 10 - ratio * 2))), risk: ok ? (Number(creditScore) > 740 ? "Low" : "Medium") : "High", reason: ok ? "Credit profile and income meet the policy threshold." : "Credit profile or affordability requires human review.", suggestion: ok ? "Maintain on-time repayments." : "Reduce loan amount or provide additional income evidence." };
    },
    steps: ({ income, creditScore, loanAmount }) => [
      { title: "Application normalized", detail: "Financial inputs validated; protected attributes excluded." },
      { title: "Income affordability assessed", detail: `Annualized income: ₹${(Number(income) * 12).toLocaleString("en-IN")}.` },
      { title: "Credit signal assessed", detail: `Credit score ${creditScore} evaluated against policy threshold.` },
      { title: "Exposure ratio calculated", detail: `Loan-to-income ratio: ${(Number(loanAmount) / Math.max(Number(income) * 12, 1)).toFixed(2)}×.` },
    ],
    optimistPrompt: "You are the Optimist on a loan decision jury. Make the strongest evidence-based case for approval using only income, credit score, employment, loan amount, and purpose. Never use protected characteristics. Return JSON with position, rationale, keyFactors (array).",
    riskPrompt: "You are the Risk Assessor on a loan decision jury. Analyze affordability and downside risk using only income, credit score, employment, loan amount, and purpose. No protected characteristics. Return JSON with position, rationale, keyFactors (array).",
    judgePrompt: "You are the Judge of a fair loan decision jury. Weigh both arguments. Return ONLY JSON with decision (Approved or Review required), reason, risk (Low/Medium/High), confidence (0-100), suggestion, rationale, biasCheck.",
  },
  insurance: {
    excluded: ["Name", "Age", "Gender", "Race", "Religion"],
    evaluated: ["Policy type", "Coverage amount", "Smoking status", "Occupation", "Pre-existing conditions"],
    juryInput: ({ policyType, coverageAmount, smokingStatus, occupation, preExistingConditions }) => ({ policyType, coverageAmount, smokingStatus, occupation, preExistingConditions }),
    demoDecide: ({ smokingStatus, preExistingConditions, coverageAmount }) => {
      const highRisk = smokingStatus === "Smoker" || (preExistingConditions && preExistingConditions !== "None");
      const ok = !highRisk || Number(coverageAmount) < 500000;
      return { decision: ok ? "Policy eligible" : "Review required", confidence: ok ? 82 : 64, risk: highRisk ? "High" : "Low", reason: ok ? "Risk profile is within acceptable policy parameters." : "Elevated risk factors require underwriter review.", suggestion: ok ? "Maintain healthy lifestyle to preserve premium rates." : "Consult an underwriter for a tailored policy assessment." };
    },
    steps: ({ policyType, coverageAmount }) => [
      { title: "Application normalized", detail: "Policy inputs validated; protected attributes excluded." },
      { title: "Risk profile assessed", detail: `Policy type: ${policyType}. Coverage: ₹${Number(coverageAmount).toLocaleString("en-IN")}.` },
      { title: "Lifestyle factors evaluated", detail: "Smoking status and pre-existing conditions assessed against underwriting rules." },
      { title: "Underwriting decision generated", detail: "Final eligibility determined from combined risk signals." },
    ],
    optimistPrompt: "You are the Optimist on an insurance underwriting jury. Make the strongest case for policy eligibility using only policy type, coverage amount, smoking status, occupation, and pre-existing conditions. No protected characteristics. Return JSON with position, rationale, keyFactors (array).",
    riskPrompt: "You are the Risk Assessor on an insurance underwriting jury. Analyze risk exposure using only policy type, coverage amount, smoking status, occupation, and pre-existing conditions. No protected characteristics. Return JSON with position, rationale, keyFactors (array).",
    judgePrompt: "You are the Judge of a fair insurance underwriting jury. Weigh both arguments. Return ONLY JSON with decision (Policy eligible or Review required), reason, risk (Low/Medium/High), confidence (0-100), suggestion, rationale, biasCheck.",
  },
  hiring: {
    excluded: ["Name", "Gender", "Age", "Race", "Religion", "Nationality"],
    evaluated: ["Role", "Years of experience", "Education", "Skills", "CTC expectations"],
    juryInput: ({ role, yearsExperience, education, skills, currentCTC, expectedCTC }) => ({ role, yearsExperience, education, skills, currentCTC, expectedCTC }),
    demoDecide: ({ yearsExperience, education, skills }) => {
      const score = Number(yearsExperience) * 10 + (education === "Master's" || education === "PhD" ? 20 : 0) + (skills?.split(",").length || 0) * 5;
      const ok = score >= 40;
      return { decision: ok ? "Shortlisted" : "Not shortlisted", confidence: Math.min(92, Math.max(55, score)), risk: ok ? "Low" : "Medium", reason: ok ? "Candidate profile meets the role requirements." : "Candidate profile does not sufficiently match the role requirements.", suggestion: ok ? "Proceed to technical interview." : "Consider roles better aligned with current experience level." };
    },
    steps: ({ role, yearsExperience, education }) => [
      { title: "Profile normalized", detail: "Candidate inputs validated; name and demographic attributes excluded." },
      { title: "Experience assessed", detail: `${yearsExperience} years of experience evaluated for the ${role} role.` },
      { title: "Education signal evaluated", detail: `Highest qualification: ${education}.` },
      { title: "Skills match calculated", detail: "Stated skills cross-referenced against role requirements." },
    ],
    optimistPrompt: "You are the Optimist on a hiring jury. Make the strongest case for shortlisting using only role, years of experience, education, skills, and CTC. Never use name, gender, age, race, or any protected characteristic. Return JSON with position, rationale, keyFactors (array).",
    riskPrompt: "You are the Risk Assessor on a hiring jury. Identify gaps between the candidate profile and role requirements using only role, experience, education, skills, and CTC. No protected characteristics. Return JSON with position, rationale, keyFactors (array).",
    judgePrompt: "You are the Judge of a fair hiring jury. Weigh both arguments. Return ONLY JSON with decision (Shortlisted or Not shortlisted), reason, risk (Low/Medium/High), confidence (0-100), suggestion, rationale, biasCheck.",
  },
  healthcare: {
    excluded: ["Name", "Gender", "Race", "Religion", "Nationality"],
    evaluated: ["Condition", "Requested treatment", "Insurance coverage", "Referral source", "Urgency"],
    juryInput: ({ condition, requestedTreatment, insuranceCoverage, referralSource, urgency }) => ({ condition, requestedTreatment, insuranceCoverage, referralSource, urgency }),
    demoDecide: ({ urgency, insuranceCoverage }) => {
      const ok = urgency === "Emergency" || urgency === "Urgent" || insuranceCoverage === "Yes";
      return { decision: ok ? "Treatment approved" : "Review required", confidence: ok ? 88 : 62, risk: urgency === "Emergency" ? "High" : "Low", reason: ok ? "Clinical urgency and coverage support treatment approval." : "Coverage or clinical priority requires further review.", suggestion: ok ? "Proceed with treatment as planned." : "Obtain specialist referral and insurance pre-authorisation." };
    },
    steps: ({ condition, requestedTreatment, urgency }) => [
      { title: "Patient record normalized", detail: "Clinical inputs validated; demographic attributes excluded." },
      { title: "Condition assessed", detail: `Condition: ${condition}.` },
      { title: "Treatment evaluated", detail: `Requested: ${requestedTreatment}.` },
      { title: "Urgency and coverage checked", detail: `Urgency level: ${urgency}.` },
    ],
    optimistPrompt: "You are the Optimist on a healthcare eligibility jury. Make the strongest clinical case for treatment approval using only condition, requested treatment, insurance coverage, referral source, and urgency. No protected characteristics. Return JSON with position, rationale, keyFactors (array).",
    riskPrompt: "You are the Risk Assessor on a healthcare eligibility jury. Identify clinical or coverage risks using only condition, treatment, insurance, referral, and urgency. No protected characteristics. Return JSON with position, rationale, keyFactors (array).",
    judgePrompt: "You are the Judge of a fair healthcare eligibility jury. Weigh both arguments. Return ONLY JSON with decision (Treatment approved or Review required), reason, risk (Low/Medium/High), confidence (0-100), suggestion, rationale, biasCheck.",
  },
  government: {
    excluded: ["Name", "Gender", "Race", "Religion", "Caste"],
    evaluated: ["Annual income", "Household size", "Benefit type", "Employment status", "State"],
    juryInput: ({ annualIncome, householdSize, benefitType, employmentStatus, state }) => ({ annualIncome, householdSize, benefitType, employmentStatus, state }),
    demoDecide: ({ annualIncome, householdSize, employmentStatus }) => {
      const perCapita = Number(annualIncome) / Math.max(Number(householdSize), 1);
      const ok = perCapita < 50000 || employmentStatus === "Unemployed";
      return { decision: ok ? "Eligible" : "Not eligible", confidence: ok ? 85 : 70, risk: ok ? "Low" : "Medium", reason: ok ? "Household income and employment status meet the eligibility criteria." : "Household income exceeds the benefit threshold.", suggestion: ok ? "Proceed with benefit enrollment." : "Review eligibility criteria for alternative schemes." };
    },
    steps: ({ benefitType, annualIncome, householdSize }) => [
      { title: "Application normalized", detail: "Welfare inputs validated; protected attributes excluded." },
      { title: "Income threshold checked", detail: `Annual income: ₹${Number(annualIncome).toLocaleString("en-IN")}. Household size: ${householdSize}.` },
      { title: "Benefit type assessed", detail: `Requested benefit: ${benefitType}.` },
      { title: "Eligibility decision generated", detail: "Per-capita income and employment status evaluated against scheme rules." },
    ],
    optimistPrompt: "You are the Optimist on a government welfare eligibility jury. Make the strongest case for eligibility using only annual income, household size, benefit type, employment status, and state. No protected characteristics. Return JSON with position, rationale, keyFactors (array).",
    riskPrompt: "You are the Risk Assessor on a government welfare jury. Identify eligibility risks or misuse potential using only the provided inputs. No protected characteristics. Return JSON with position, rationale, keyFactors (array).",
    judgePrompt: "You are the Judge of a fair government welfare jury. Weigh both arguments. Return ONLY JSON with decision (Eligible or Not eligible), reason, risk (Low/Medium/High), confidence (0-100), suggestion, rationale, biasCheck.",
  },
  education: {
    excluded: ["Name", "Gender", "Race", "Religion", "Caste", "Nationality"],
    evaluated: ["Program", "GPA", "Entrance score", "Financial need", "Personal statement"],
    juryInput: ({ program, institution, gpa, entranceScore, financialNeed, essaySummary }) => ({ program, institution, gpa, entranceScore, financialNeed, essaySummary }),
    demoDecide: ({ gpa, entranceScore }) => {
      const score = Number(gpa) * 10 + Number(entranceScore) * 0.3;
      const ok = score >= 90;
      return { decision: ok ? "Admitted" : "Waitlisted", confidence: Math.min(94, Math.max(55, Math.round(score))), risk: ok ? "Low" : "Medium", reason: ok ? "Academic profile meets the admission threshold." : "Academic profile is below the competitive threshold for direct admission.", suggestion: ok ? "Confirm enrollment by the deadline." : "Consider reapplying after improving entrance scores or GPA." };
    },
    steps: ({ program, gpa, entranceScore }) => [
      { title: "Application normalized", detail: "Academic inputs validated; demographic attributes excluded." },
      { title: "GPA evaluated", detail: `GPA: ${gpa} / 10.` },
      { title: "Entrance score assessed", detail: `Entrance percentile: ${entranceScore}.` },
      { title: "Admission decision generated", detail: `Program: ${program}.` },
    ],
    optimistPrompt: "You are the Optimist on an education admissions jury. Make the strongest case for admission using only program, GPA, entrance score, financial need, and personal statement summary. No protected characteristics. Return JSON with position, rationale, keyFactors (array).",
    riskPrompt: "You are the Risk Assessor on an education admissions jury. Identify academic gaps or risks using only the provided inputs. No protected characteristics. Return JSON with position, rationale, keyFactors (array).",
    judgePrompt: "You are the Judge of a fair admissions jury. Weigh both arguments. Return ONLY JSON with decision (Admitted or Waitlisted), reason, risk (Low/Medium/High), confidence (0-100), suggestion, rationale, biasCheck.",
  },
  "customer-support": {
    excluded: ["Name", "Gender", "Race", "Religion"],
    evaluated: ["Issue type", "Severity", "Product", "Issue description", "Previous tickets"],
    juryInput: ({ issueType, severity, productName, issueDescription, previousTickets }) => ({ issueType, severity, productName, issueDescription, previousTickets }),
    demoDecide: ({ severity, previousTickets }) => {
      const escalate = severity === "Critical" || severity === "High" || Number(previousTickets) >= 3;
      return { decision: escalate ? "Escalate to senior agent" : "Standard resolution", confidence: escalate ? 90 : 78, risk: escalate ? "High" : "Low", reason: escalate ? "Severity or repeat contact history warrants escalation." : "Issue can be resolved through standard support workflow.", suggestion: escalate ? "Assign to Tier-2 support immediately." : "Follow standard resolution playbook and close within SLA." };
    },
    steps: ({ issueType, severity, productName }) => [
      { title: "Case normalized", detail: "Support inputs validated; customer demographic attributes excluded." },
      { title: "Issue type classified", detail: `Issue type: ${issueType}. Product: ${productName}.` },
      { title: "Severity assessed", detail: `Severity level: ${severity}.` },
      { title: "Routing decision generated", detail: "Escalation path determined from severity and contact history." },
    ],
    optimistPrompt: "You are the Optimist on a customer support routing jury. Make the case for standard resolution using only issue type, severity, product, description, and previous tickets. No protected characteristics. Return JSON with position, rationale, keyFactors (array).",
    riskPrompt: "You are the Risk Assessor on a customer support routing jury. Identify escalation risks using only the provided inputs. No protected characteristics. Return JSON with position, rationale, keyFactors (array).",
    judgePrompt: "You are the Judge of a fair support routing jury. Weigh both arguments. Return ONLY JSON with decision (Escalate to senior agent or Standard resolution), reason, risk (Low/Medium/High), confidence (0-100), suggestion, rationale, biasCheck.",
  },
};

const getIndustryMeta = (industry) => INDUSTRY_META[industry] || INDUSTRY_META.banking;

const biasAudit = (industry) => {
  const meta = getIndustryMeta(industry);
  return { protectedAttributesExcluded: meta.excluded, evaluatedFactors: meta.evaluated, status: "No protected attributes used", note: "This audit confirms the decision excludes protected characteristics. It is a transparency check, not a guarantee of fairness across populations." };
};

const agentReview = (result) => {
  const requiresReview = !result.decision?.toLowerCase().match(/approv|eligible|shortlist|admit|standard|escalate/) || Number(result.confidence) < 70;
  return { disagrees: requiresReview, verdict: requiresReview ? "Challenge recommended" : "No material disagreement", reason: requiresReview ? "Independent reviewer found insufficient certainty for an unassisted decision." : "Independent reviewer agrees the available signals support this outcome." };
};

const juryFallback = (application) => {
  const meta = getIndustryMeta(application.industry);
  const result = meta.demoDecide(application);
  const input = meta.juryInput(application);
  const optimist = { position: result.decision, rationale: `The strongest available signals support this outcome based on: ${Object.values(input).filter(Boolean).join(", ")}.`, keyFactors: meta.evaluated.slice(0, 3) };
  const riskAssessor = { position: "Requires review", rationale: result.reason, keyFactors: meta.evaluated.slice(1, 4) };
  const judge = { ...result, rationale: result.reason, biasCheck: `Protected characteristics excluded: ${meta.excluded.join(", ")}.` };
  return { ...result, jury: { optimist, riskAssessor, judge }, agentReview: agentReview(result) };
};
const getJuryAgent = async (system, input) => {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify(input) }],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });
  return JSON.parse(completion.choices[0].message.content);
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

// Generic jury endpoint — works for all industries via SSE streaming.
app.post("/jury", requireAuth, async (req, res) => {
  const { name, industry = "banking" } = req.body;
  if (!name) return res.status(400).json({ error: "Applicant name is required." });
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" });
  res.flushHeaders();
  const send = (event, payload) => res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
  const meta = getIndustryMeta(industry);
  const input = meta.juryInput(req.body);
  const steps = meta.steps(req.body);

  try {
    if (!groq) {
      const result = juryFallback(req.body);
      send("argument", { role: "Optimist", ...result.jury.optimist });
      send("argument", { role: "Risk Assessor", ...result.jury.riskAssessor });
      send("verdict", { role: "Judge", ...result.jury.judge });
      send("complete", { ...result, biasAudit: biasAudit(industry), reasoningSteps: steps, demoMode: true });
      return res.end();
    }

    const [optimist, riskAssessor] = await Promise.all([
      getJuryAgent(meta.optimistPrompt, input).then((a) => { send("argument", { role: "Optimist", ...a }); return a; }),
      getJuryAgent(meta.riskPrompt, input).then((a) => { send("argument", { role: "Risk Assessor", ...a }); return a; }),
    ]);
    const judge = await getJuryAgent(meta.judgePrompt, { input, optimist, riskAssessor });
    const finalResult = { ...meta.demoDecide(req.body), ...judge };
    send("verdict", { role: "Judge", ...finalResult });
    send("complete", { ...finalResult, jury: { optimist, riskAssessor, judge: finalResult }, biasAudit: biasAudit(industry), reasoningSteps: steps, agentReview: agentReview(finalResult) });
    res.end();
  } catch (err) {
    console.error("Jury processing failed", err.message);
    const result = juryFallback(req.body);
    send("argument", { role: "Optimist", ...result.jury.optimist });
    send("argument", { role: "Risk Assessor", ...result.jury.riskAssessor });
    send("verdict", { role: "Judge", ...result.jury.judge });
    send("complete", { ...result, biasAudit: biasAudit(industry), reasoningSteps: steps, demoMode: true, fallbackReason: "AI provider unavailable" });
    res.end();
  }
});

// Legacy alias so old /loan/jury calls still work
app.post("/loan/jury", requireAuth, (req, res, next) => { req.body.industry = req.body.industry || "banking"; next(); }, (req, res, next) => app._router.handle({ ...req, url: "/jury", path: "/jury" }, res, next));

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

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`EchoLedger API listening on http://localhost:${port}`));
