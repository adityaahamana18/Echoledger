# EchoLedger — PPT Content Guide

Use this structured content to build a presentation in PowerPoint, Google Slides, or Canva.

---

## Slide 1: Title Slide
**EchoLedger**
*Making AI Decisions Transparent, Verifiable & Human-Challengeable*

Subtitle: An AI Governance Platform
Footer: Built with React · Node.js · Solidity · Firebase · Groq AI

---

## Slide 2: The Problem
**AI Decision-Making is a Black Box**

- AI systems make critical decisions: loan approvals, hiring, healthcare, welfare eligibility
- Users have **no visibility** into *why* a decision was made
- No **verifiable proof** of what the AI actually decided
- No **recourse** to challenge or dispute an AI decision
- Regulatory pressure increasing (EU AI Act, India's DPDP, etc.)

---

## Slide 3: The Solution
**EchoLedger — AI Governance, Made Tangible**

Turn every AI decision into:
1. ✅ **Explainable** — Clear plain-language rationale
2. ✅ **Verifiable** — Tamper-evident SHA-256 fingerprint on-chain
3. ✅ **Auditable** — Protected attributes excluded, bias audit attached
4. ✅ **Challengeable** — Stake-gated on-chain dispute system

---

## Slide 4: Architecture Overview
[Show a clean diagram]

```
[User] → React Frontend → Express API
                              ↓
                  ┌──────────────────────┐
                  │  3-Agent AI Jury     │
                  │  Optimist            │
                  │  Risk Assessor       │
                  │  Judge               │
                  └──────────┬───────────┘
                             ↓
                  ┌──────────────────────┐
                  │  Smart Contracts     │
                  │  DecisionHashRegistry│
                  │  SimpleDispute       │
                  └──────────────────────┘
```

Key Components:
- **Frontend**: React + Vite + Tailwind + Framer Motion
- **Backend**: Express server with SSE streaming
- **AI**: Groq SDK (LLaMA 3.3-70B) + algorithmic fallback
- **Blockchain**: Solidity contracts on EVM (Hardhat + viem)
- **Storage**: Firebase Firestore
- **Auth**: Firebase Auth (Google Sign-In)

---

## Slide 5: Core Feature — AI Jury System
**3-Agent Deliberation for Every Decision**

| Agent | Role |
|-------|------|
| **Optimist** | Makes strongest evidence-based case for approval |
| **Risk Assessor** | Identifies downside risks and concerns |
| **Judge** | Weighs both arguments, delivers verdict + bias check |

Decisions stream in real-time via Server-Sent Events (SSE):
1. Optimist argument → 2. Risk Assessor argument → 3. Judge verdict → 4. Complete

---

## Slide 6: Supported Industries

| Industry | Example Decision | Protected (Excluded) |
|----------|-----------------|---------------------|
| 🏦 Banking | Loan Approval | Name, Age, Gender, Race |
| 🏥 Insurance | Policy Underwriting | Name, Age, Gender, Race, Religion |
| 💼 Hiring | Candidate Shortlisting | Name, Gender, Age, Race, Religion, Nationality |
| 🏨 Healthcare | Treatment Approval | Name, Gender, Race, Religion, Nationality |
| 🏛️ Government | Welfare Eligibility | Name, Gender, Race, Religion, Caste |
| 🎓 Education | Admission Decision | Name, Gender, Race, Religion, Caste, Nationality |
| 🎧 Customer Support | Ticket Escalation | Name, Gender, Race, Religion |

---

## Slide 7: Smart Contracts

### DecisionHashRegistry
- Immutable registry of SHA-256 decision fingerprints
- `anchor()` → Store decision hash on-chain
- `verify()` → Check if a hash was ever anchored
- Event: `DecisionAnchored`

### SimpleDispute
- Stake-gated challenge system
- **Human challenge**: Pay minimum stake (ETH) + provide reason (≥20 chars)
- **Automated challenge**: Designated wallet can challenge without stake
- Events: `DecisionCommitted`, `DecisionChallenged`

---

## Slide 8: User Journey

```
Home → Sign In (Google) → Select Industry 
  → Fill Application → Submit 
    → Processing (SSE Streaming) → Decision Page 
      → Trace Reasoning → Challenge (Optional) → Verify
```

**Demo Walkthrough:**
1. Land on Home page → See AI Governance Score (91%)
2. Click "Run a decision" → Sign in with Google
3. Select "Banking" industry
4. Enter: Income ₹8L, Credit Score 720, Loan ₹3L
5. Watch jury deliberation stream in real-time
6. See decision: **"Loan Approved"** at **92% confidence**
7. Click "Trace" → see step-by-step reasoning
8. Click "Challenge" → submit on-chain dispute
9. Verify via QR code at `/verify/:id`

---

## Slide 9: Bias Audit & Transparency

Every decision includes:
```json
{
  "protectedAttributesExcluded": ["Name", "Age", "Gender", "Race"],
  "status": "No protected attributes used",
  "note": "Transparency check, not a guarantee of fairness"
}
```

**Agent Review system:**
- Independent reviewer checks every decision
- Confidence < 70% → "Challenge recommended"
- Triggers automated on-chain challenge via SimpleDispute

---

## Slide 10: Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 7, Tailwind CSS 4, Framer Motion |
| Backend | Node.js, Express, Groq SDK |
| Blockchain | Solidity, Hardhat 3, viem (EVM) |
| Database | Firebase Firestore |
| Auth | Firebase Auth + Google Provider |
| Libraries | recharts, html2canvas, jsPDF, QRCode, crypto-js |

---

## Slide 11: Demo Mode

**EchoLedger works fully without an AI API key!**

When no Groq API key is configured:
- Algorithmic `demoDecide()` functions for every industry
- Realistic decisions based on input thresholds
- Same UI, same flow, same on-chain verification
- Great for demos, testing, and presentations

---

## Slide 12: Future Roadmap

- [ ] Multi-chain support (Polygon, Arbitrum)
- [ ] Zero-knowledge proofs for private verification
- [ ] Custom jury prompt templates per organization
- [ ] Real-time governance dashboard with charts
- [ ] Mobile app (React Native)
- [ ] Integration APIs for enterprise systems

---

## Slide 13: Get Started

**Run Locally:**
```bash
cd frontend && npm install && npm run dev
cd backend && npm install && npm run dev
# Open http://localhost:5173
```

**Deploy Contracts:**
```bash
cd blockchain && npx hardhat ignition deploy
```

**Links:**
- GitHub: github.com/adityaahamana18/Echoledger
- Demo: [live URL if available]

---

## Slide 14: Thank You

**EchoLedger**
*Trust Every AI Decision.*

Questions?

Contact: [Your Contact Info]