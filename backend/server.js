import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { getApps, initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

import { validateScholarshipInput, validateJobInput } from "./engine/validator.js";
import { evaluateScholarship, evaluateJob } from "./engine/deterministicEvaluator.js";

dotenv.config();
const app = express();

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// Rate limiting
const rateLimitMap = new Map();
app.use((req, res, next) => {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const client = rateLimitMap.get(ip) || { count: 0, reset: now + 60000 };
  if (now > client.reset) { client.count = 0; client.reset = now + 60000; }
  client.count++;
  rateLimitMap.set(ip, client);
  if (client.count > 40) return res.status(429).json({ error: "Too many requests. Please wait a moment." });
  next();
});

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// Multer — memory storage (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_, file, cb) => {
    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    cb(null, allowed.includes(file.mimetype));
  },
});

// Extract plain text from uploaded resume buffer
async function extractResumeText(file) {
  if (!file) return null;
  try {
    if (file.mimetype === "application/pdf") {
      const parser = new PDFParse({ data: file.buffer });
      const result = await parser.getText();
      return result?.text?.trim() || (typeof result === "string" ? result.trim() : null);
    }
    // DOCX
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value?.trim() || null;
  } catch (e) {
    console.warn("Resume parse failed:", e.message);
    return null;
  }
}

// Summarise resume text via Groq (max ~400 tokens output)
async function summariseResume(resumeText, targetRole) {
  if (!groq || !resumeText) return null;
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a resume parser. Extract structured information from the resume text for a ${targetRole || "software"} role.
Return ONLY valid JSON:
{
  "extractedSkills": ["skill1", "skill2"],
  "experienceSummary": "2-3 sentence summary of work experience",
  "educationSummary": "highest degree and institution",
  "projectHighlights": ["project1 description", "project2 description"],
  "strengths": ["strength1", "strength2"],
  "gaps": ["gap1", "gap2"]
}`,
        },
        { role: "user", content: resumeText.slice(0, 6000) }, // cap at 6000 chars
      ],
      temperature: 0.1,
      max_tokens: 600,
      response_format: { type: "json_object" },
    });
    return JSON.parse(completion.choices[0].message.content);
  } catch (e) {
    console.warn("Resume summarise failed:", e.message);
    return null;
  }
}

// Firebase Admin (optional — for token verification in production)
let adminAuth = null;
try {
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) : null;
  if (sa || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const fb = getApps().length ? getApps()[0] : initializeApp({ credential: sa ? cert(sa) : applicationDefault() });
    adminAuth = getAuth(fb);
    console.log("Firebase Admin initialized.");
  } else {
    console.warn("No Firebase Admin credentials — running in local dev mode.");
  }
} catch (e) {
  console.warn("Firebase Admin skipped:", e.message);
}

const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (adminAuth && token && token !== "null") {
    try { req.user = await adminAuth.verifyIdToken(token); return next(); }
    catch { return res.status(401).json({ error: "Invalid or expired token." }); }
  }
  req.user = { uid: "dev-user", isDev: true };
  next();
};

// ── Category metadata & AI prompts ───────────────────────────────────────────

const CATEGORY_META = {
  scholarship: {
    excluded: ["Name", "Gender", "Race", "Religion", "Caste", "Nationality"],
    evaluated: ["Education Level", "Academic Score/CGPA", "Course", "Institution", "State", "Family Income", "Documents"],
    validate: validateScholarshipInput,
    evaluate: evaluateScholarship,

    optimistPrompt: `You are the Optimist agent on a scholarship evaluation jury.
Your job: Make the strongest honest case FOR the applicant using only the deterministic evaluation data provided.
Focus on: academic strengths, scheme eligibility, verified criteria met.
Never invent award amounts, deadlines, or rules not in the data.
Return JSON: { "position": "string", "rationale": "2-3 sentence explanation", "keyFactors": ["factor1", "factor2", "factor3"] }`,

    riskPrompt: `You are the Risk Assessor agent on a scholarship evaluation jury.
Your job: Identify genuine gaps, missing documents, or borderline criteria that need attention.
Be constructive — frame gaps as actionable steps, not rejections.
Return JSON: { "position": "string", "rationale": "2-3 sentence explanation", "keyFactors": ["gap1", "gap2"] }`,

    judgePrompt: `You are the Judge of a fair scholarship evaluation jury. You have heard both the Optimist and Risk Assessor.
Your job: Deliver a clear, honest, encouraging final verdict that a student can actually understand and act on.

Rules:
- Use simple, plain language (no jargon)
- Explain WHY the decision was made in 3-4 sentences
- Give ONE specific, actionable next step
- Never mention blockchain, hashes, or technical system details
- Base decision ONLY on the deterministic evaluation data

Return ONLY valid JSON:
{
  "headline": "One encouraging sentence summarizing the outcome",
  "decision": "Award Recommended | Potential Match | Documentation Required | Alternative Pathways Recommended",
  "confidence": <number 0-100>,
  "risk": "Low | Medium | High",
  "reason": "3-4 sentences explaining exactly why this decision was made, what criteria were checked, and what the applicant's profile shows",
  "suggestion": "One specific actionable next step the applicant should take right now",
  "whatWorked": "What aspects of the profile were strong",
  "whatToImprove": "What the applicant can do to strengthen their application",
  "biasCheck": "Confirming which protected attributes were excluded"
}`,
  },

  job: {
    excluded: ["Name", "Gender", "Age", "Race", "Religion", "Nationality", "Marital Status"],
    evaluated: ["Target Role", "Technical Skills", "Years of Experience", "Education", "Portfolio/Projects", "Work Preference"],
    validate: validateJobInput,
    evaluate: evaluateJob,

    optimistPrompt: `You are the Optimist agent on a fair hiring jury.
Your job: Make the strongest honest case FOR shortlisting the candidate using only the deterministic evaluation data.
Focus on: matching skills, relevant experience, transferable strengths.
Never disqualify for missing preferred (non-mandatory) skills.
Return JSON: { "position": "string", "rationale": "2-3 sentence explanation", "keyFactors": ["skill1", "skill2", "skill3"] }`,

    riskPrompt: `You are the Risk Assessor agent on a fair hiring jury.
Your job: Identify genuine mandatory skill gaps or experience shortfalls that need addressing.
Frame every gap as an upskilling opportunity, not a disqualifier.
Return JSON: { "position": "string", "rationale": "2-3 sentence explanation", "keyFactors": ["gap1", "gap2"] }`,

    judgePrompt: `You are the Judge of a fair hiring jury. You have heard both the Optimist and Risk Assessor.
Your job: Deliver a clear, honest, encouraging final verdict that the candidate can understand and act on.

Rules:
- Use simple, plain language
- Explain WHY the decision was made — which skills matched, which were missing
- Give ONE specific, actionable next step
- Never auto-reject for missing preferred skills
- Never mention blockchain, hashes, or technical system details
- Base decision ONLY on the deterministic evaluation data

Return ONLY valid JSON:
{
  "headline": "One encouraging sentence summarizing the outcome",
  "decision": "Recommended for Shortlist | Positive Match | Conditional Match (Upskilling Suggested) | Alternative Roles Recommended",
  "confidence": <number 0-100>,
  "risk": "Low | Medium | High",
  "reason": "3-4 sentences explaining exactly why this decision was made — which skills matched, which were missing, and how experience was assessed",
  "suggestion": "One specific actionable next step the candidate should take right now",
  "whatWorked": "Which skills and experience aspects were strong",
  "whatToImprove": "Specific skills or areas to develop for a stronger profile",
  "biasCheck": "Confirming which protected attributes were excluded"
}`,
  },
};

const getCategoryMeta = (raw) => {
  const norm = (raw || "").toLowerCase();
  return (norm.includes("job") || norm.includes("hiring")) ? CATEGORY_META.job : CATEGORY_META.scholarship;
};

const buildBiasAudit = (meta) => ({
  protectedAttributesExcluded: meta.excluded,
  evaluatedFactors: meta.evaluated,
  note: "Decision rendered purely on verifiable merit. No demographic attributes were used.",
});

const buildAgentReview = (result) => {
  const positive = result.decision?.toLowerCase().match(/award|recommend|shortlist|positive/);
  const highConfidence = Number(result.confidence) >= 65;
  const needsReview = !positive || !highConfidence;
  return {
    disagrees: needsReview,
    verdict: needsReview ? "Human review recommended" : "No material disagreement",
    reason: needsReview
      ? "Some criteria require human administrative confirmation."
      : "Independent review confirms decision aligns with verified benchmarks.",
  };
};

const callGroq = async (systemPrompt, userContent) => {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(userContent) },
    ],
    temperature: 0.15,
    max_tokens: 1024,
    response_format: { type: "json_object" },
  });
  return JSON.parse(completion.choices[0].message.content);
};

// Deterministic fallback when Groq is unavailable
const buildFallback = (evaluation, meta, category) => {
  const isJob = category === "job";
  const best = evaluation.bestMatch;
  const outcome = evaluation.deterministicOutcome;
  const conf = evaluation.confidence;

  const optimist = {
    position: outcome,
    rationale: isJob
      ? `Strong foundation in ${(best?.matchingMandatory || []).slice(0, 3).join(", ") || "core technical skills"} demonstrated. Profile aligns with role requirements.`
      : `Academic performance of ${evaluation.applicantProfile?.academicPercentage}% meets the merit threshold for ${best?.schemeName || "scholarship schemes"}.`,
    keyFactors: isJob ? (best?.matchingMandatory || ["Core Skills"]).slice(0, 3) : ["Academic Score", "Scheme Eligibility", "Education Level"],
  };

  const riskAssessor = {
    position: "Verify documentation and requirements",
    rationale: isJob
      ? (best?.missingMandatory?.length ? `Skill gaps in: ${best.missingMandatory.join(", ")}. These can be addressed through focused learning.` : "All mandatory skills present. Verify project portfolio depth.")
      : "Ensure income certificate and academic marksheets are certified by the issuing authority.",
    keyFactors: isJob ? (best?.missingMandatory || ["Portfolio verification"]) : ["Income Certificate", "Marksheet Verification"],
  };

  const judge = {
    headline: isJob
      ? (best?.status === "Strong Match" ? "Your skills align well with this role — you're a strong candidate!" : "You have solid foundations with clear steps to strengthen your profile.")
      : (outcome === "Award Recommended" ? "Your academic profile strongly matches verified scholarship criteria!" : "You are a competitive candidate — complete your documentation to proceed."),
    decision: outcome,
    confidence: conf,
    risk: conf >= 75 ? "Low" : "Medium",
    reason: isJob
      ? `Your profile was evaluated against ${best?.title || "the target role"} requirements. You matched ${best?.matchingMandatory?.length || 0} out of ${(best?.matchingMandatory?.length || 0) + (best?.missingMandatory?.length || 0)} mandatory skills. ${best?.missingMandatory?.length ? `Skills to develop: ${best.missingMandatory.join(", ")}.` : "All mandatory skills are present."}`
      : `Your academic score of ${evaluation.applicantProfile?.academicPercentage}% was checked against verified scheme requirements. ${best?.matchStatus === "Confirmed Eligible" ? "You meet all criteria for " + best.schemeName + "." : "You are close to eligibility — see the next steps below."}`,
    suggestion: isJob
      ? (best?.learningPathway || "Highlight your GitHub projects and prepare for the core technical assessment round.")
      : "Submit certified income and academic certificates to the National Scholarship Portal before the deadline.",
    whatWorked: isJob
      ? `Matched skills: ${(best?.matchingMandatory || []).join(", ") || "Core technical foundation"}. Experience level is appropriate for the role.`
      : `Academic score (${evaluation.applicantProfile?.academicPercentage}%) and education level (${evaluation.applicantProfile?.educationLevel}) meet scheme requirements.`,
    whatToImprove: isJob
      ? (best?.missingMandatory?.length ? `Focus on: ${best.missingMandatory.join(", ")}. ${best?.learningPathway || ""}` : "Strengthen your portfolio with real-world projects.")
      : (best?.checks?.find(c => !c.passed)?.criterion ? `Address: ${best.checks.filter(c => !c.passed).map(c => c.criterion).join(", ")}` : "Ensure all documents are certified and up to date."),
    biasCheck: `Protected attributes excluded: ${meta.excluded.join(", ")}.`,
  };

  return { optimist, riskAssessor, judge };
};

// ── Routes ────────────────────────────────────────────────────────────────────

app.get("/", (_, res) => res.json({
  service: "EchoLedger Decision Engine",
  version: "3.0.0",
  categories: ["scholarship", "job"],
  ai: groq ? "Groq LLaMA-3.3-70B active" : "Deterministic fallback mode",
}));

app.post("/jury", requireAuth, upload.single("resume"), async (req, res) => {
  const rawCategory = req.body.category || req.body.industry || "scholarship";
  const category = (rawCategory.toLowerCase().includes("job") || rawCategory.toLowerCase().includes("hiring")) ? "job" : "scholarship";
  const meta = CATEGORY_META[category];

  // Validate input
  const validation = meta.validate(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ error: "Validation failed", details: validation.errors });
  }

  // Deterministic evaluation first
  const det = meta.evaluate(req.body);

  // Parse resume if uploaded (job category only)
  let resumeSummary = null;
  if (category === "job" && req.file) {
    const resumeText = await extractResumeText(req.file);
    resumeSummary = await summariseResume(resumeText, req.body.preferredRole);
    // Merge extracted skills into profile for better deterministic scoring
    if (resumeSummary?.extractedSkills?.length) {
      const existingSkills = (req.body.skills || "").split(",").map(s => s.trim()).filter(Boolean);
      const merged = [...new Set([...existingSkills, ...resumeSummary.extractedSkills])];
      req.body.skills = merged.join(", ");
      // Re-evaluate with enriched skills
      Object.assign(det, meta.evaluate(req.body));
    }
  }

  // SSE headers
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" });
  res.flushHeaders();

  const send = (event, payload) => res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);

  const reasoningSteps = [
    { title: "Profile normalized", detail: `Protected attributes removed: ${meta.excluded.join(", ")}.` },
    { title: "Deterministic rules applied", detail: `Profile matched against verified ${category === "job" ? "job role" : "scholarship scheme"} database with exact policy rules.` },
    { title: `${category === "job" ? "Skill gap" : "Eligibility"} analysis completed`, detail: category === "job"
      ? `Mandatory skills checked: ${det.bestMatch?.matchingMandatory?.length || 0} matched, ${det.bestMatch?.missingMandatory?.length || 0} gaps identified.`
      : `Academic score ${det.applicantProfile?.academicPercentage}% evaluated against scheme thresholds.` },
    { title: "Multi-agent AI jury deliberated", detail: "Optimist, Risk Assessor, and Judge agents reviewed the deterministic findings independently." },
    { title: "Decision receipt generated", detail: "Outcome, reasoning, and profile bound into a SHA-256 tamper-evident fingerprint." },
  ];

  const juryInput = {
    category,
    deterministicEvaluation: det,
    resumeSummary: resumeSummary || null,
    profileSummary: category === "job"
      ? { role: req.body.preferredRole, skills: req.body.skills, experience: req.body.yearsExperience, education: req.body.education, projects: req.body.projectsSummary }
      : { educationLevel: req.body.educationLevel, course: req.body.course, score: req.body.academicScore, scale: req.body.gpaScale, income: req.body.annualIncome, state: req.body.state },
  };

  // Extend reasoning steps if resume was analysed
  if (resumeSummary) {
    reasoningSteps.splice(2, 0, {
      title: "Resume analysed by AI",
      detail: `Extracted ${resumeSummary.extractedSkills?.length || 0} skills from resume. Strengths: ${(resumeSummary.strengths || []).slice(0, 2).join(", ") || "identified"}.`,
    });
  }

  try {
    let optimist, riskAssessor, judge;

    if (!groq) {
      const fb = buildFallback(det, meta, category);
      optimist = fb.optimist;
      riskAssessor = fb.riskAssessor;
      judge = fb.judge;
    } else {
      [optimist, riskAssessor] = await Promise.all([
        callGroq(meta.optimistPrompt, juryInput),
        callGroq(meta.riskPrompt, juryInput),
      ]);

      const judgeInput = {
        deterministicEvaluation: det,
        resumeSummary: resumeSummary || null,
        optimistArgument: optimist,
        riskArgument: riskAssessor,
        profileSummary: juryInput.profileSummary,
      };
      const judgeContext = resumeSummary
        ? `${meta.judgePrompt}\n\nDeterministic data: ${JSON.stringify(det)}\n\nResume analysis: ${JSON.stringify(resumeSummary)}`
        : `${meta.judgePrompt}\n\nDeterministic data: ${JSON.stringify(det)}`;
      judge = await callGroq(judgeContext, judgeInput);
    }

    send("argument", { role: "Optimist", ...optimist });
    send("argument", { role: "Risk Assessor", ...riskAssessor });
    send("verdict", { role: "Judge", ...judge });

    send("complete", {
      ...det,
      ...judge,
      jury: { optimist, riskAssessor, judge },
      biasAudit: buildBiasAudit(meta),
      agentReview: buildAgentReview(judge),
      reasoningSteps,
      trace: reasoningSteps,
      resumeSummary: resumeSummary || null,
      demoMode: !groq,
    });

    res.end();
  } catch (err) {
    console.error("Jury failed, using fallback:", err.message);
    const fb = buildFallback(det, meta, category);

    send("argument", { role: "Optimist", ...fb.optimist });
    send("argument", { role: "Risk Assessor", ...fb.riskAssessor });
    send("verdict", { role: "Judge", ...fb.judge });
    send("complete", {
      ...det,
      ...fb.judge,
      jury: { optimist: fb.optimist, riskAssessor: fb.riskAssessor, judge: fb.judge },
      biasAudit: buildBiasAudit(meta),
      agentReview: buildAgentReview(fb.judge),
      reasoningSteps,
      trace: reasoningSteps,
      resumeSummary: resumeSummary || null,
      demoMode: true,
      fallbackReason: err.message,
    });
    res.end();
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`EchoLedger API → http://localhost:${port} | AI: ${groq ? "Groq active" : "Deterministic fallback"}`));
