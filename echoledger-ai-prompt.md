# EchoLedger — AI Context Prompt

## Project Overview

EchoLedger is an **AI Governance Platform** that turns black-box AI decisions into **transparent, explainable, verifiable, and challengeable records**. Every decision receives a tamper-evident SHA-256 fingerprint stored on-chain, a plain-language explanation, an interactive trace of reasoning steps, and a human/automated challenge path with economic stakes.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite 7 + Tailwind CSS 4 + Framer Motion |
| **Backend** | Node.js + Express |
| **Blockchain** | Solidity + Hardhat 3 + viem |
| **Database/Auth** | Firebase Firestore + Firebase Auth + Google Auth |
| **AI Provider** | Groq SDK (LLaMA 3.3-70B versatile) with demo fallback mode |
| **Libraries** | recharts, html2canvas, jsPDF, QRCode, lucide-react, crypto-js, axios |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                  │
│  Home → Industry Selector → Application Form →      │
│  Processing → Decision → Trace → Challenge → Verify │
└──────────────┬──────────────────────────┬───────────┘
               │ HTTP/SSE                  │ Firebase SDK
               ▼                           ▼
┌──────────────────────┐       ┌──────────────────────┐
│   Backend (Express)  │       │  Firebase (Auth +    │
│   POST /jury (SSE)   │       │      Firestore)      │
│   POST /automated-   │       └──────────────────────┘
│    challenge          │
└──────────┬───────────┘
           │ viem (wallet client)
           ▼
┌───────────────────────────────────────────┐
│         Smart Contracts (EVM)             │
│  DecisionHashRegistry.sol                 │
│  SimpleDispute.sol                        │
└───────────────────────────────────────────┘
```

---

## Core Feature: AI Jury System

The backend implements a **3-agent jury debate** for every decision:

1. **Optimist** — Makes the strongest evidence-based case for approval/eligibility
2. **Risk Assessor** — Analyzes downside risk and flags concerns
3. **Judge** — Weighs both arguments and delivers final verdict with bias check

Each agent receives **industry-specific prompts** that strictly exclude protected attributes (name, gender, race, age, religion, caste, nationality).

The system has a **demo fallback mode** when no Groq API key is configured — it uses algorithmic `demoDecide()` functions per industry.

---

## Supported Industries & Evaluation Criteria

| Industry | Protected (Excluded) | Evaluated Factors |
|----------|---------------------|-------------------|
| **Banking** | Name, Age, Gender, Race | Income, Credit score, Employment type, Loan amount, Purpose |
| **Insurance** | Name, Age, Gender, Race, Religion | Policy type, Coverage amount, Smoking status, Occupation, Pre-existing conditions |
| **Hiring** | Name, Gender, Age, Race, Religion, Nationality | Role, Years of experience, Education, Skills, CTC expectations |
| **Healthcare** | Name, Gender, Race, Religion, Nationality | Condition, Requested treatment, Insurance coverage, Referral source, Urgency |
| **Government** | Name, Gender, Race, Religion, Caste | Annual income, Household size, Benefit type, Employment status, State |
| **Education** | Name, Gender, Race, Religion, Caste, Nationality | Program, GPA, Entrance score, Financial need, Personal statement |
| **Customer Support** | Name, Gender, Race, Religion | Issue type, Severity, Product, Issue description, Previous tickets |

---

## Smart Contracts (Solidity)

### DecisionHashRegistry.sol
- Immutable registry of SHA-256 decision fingerprints
- Functions: `anchor(decisionHash)`, `verify(decisionHash)`
- Events: `DecisionAnchored`

### SimpleDispute.sol
- Stake-gated challenge system for disputing decisions
- Minimum stake prevents spam challenges
- Supports both **human challenges** (with ETH stake) and **automated challenges** (from a designated automated challenger wallet, no stake)
- Requires reason ≥ 20 characters
- Functions: `commitDecision()`, `challengeDecision()` (payable), `automatedChallenge()`, `verifyDecision()`, `challengeCount()`
- Events: `DecisionCommitted`, `DecisionChallenged`

---

## Backend API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | No | Health check (returns service name & mode) |
| POST | `/jury` | Firebase JWT | SSE-streamed jury decision for any industry |
| POST | `/loan/jury` | Firebase JWT | Legacy alias for banking industry |
| POST | `/automated-challenge` | Firebase JWT | Submit automated on-chain challenge |

### `/jury` SSE Event Flow
1. `event: argument` (Optimist position)
2. `event: argument` (Risk Assessor position)
3. `event: verdict` (Judge final decision)
4. `event: complete` (Full result with bias audit, reasoning steps, agent review)

---

## Key Frontend Pages

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Home | Hero section, Live Dashboard, AI Governance Score |
| `/apply` | IndustrySelector | Choose industry for decision simulation |
| `/apply/:industry` | ApplicationForm | Industry-specific form inputs |
| `/processing/:id` | Processing | Real-time SSE streaming of jury deliberation |
| `/decision/:id` | Decision | Final verdict with explanation, confidence, risk, QR code |
| `/trace/:id` | Trace | Step-by-step reasoning replay with timeline |
| `/challenge/:id` | Challenge | On-chain dispute initiation with reason |
| `/verify/:id` | Verify | QR-code based decision verification |
| `/admin` | Admin | System insights dashboard (public) |
| `/governance` | GovernanceDashboard | Protected admin with stats & charts |
| `/pricing` | Pricing | Pricing page |
| `/contact` | Contact | Contact form |

---

## Data Flow (Typical User Journey)

1. User lands on **Home** → sees hero, live dashboard, governance score
2. Clicks "Run a decision" → signs in via **Google Auth** (Firebase)
3. Selects **industry** (e.g., Banking) on IndustrySelector
4. Fills **application form** with industry-specific fields
5. Form submitted → decision hash computed (SHA-256) → stored in **Firestore**
6. User redirected to **Processing** → backend streams **SSE events** for Optimist → Risk Assessor → Judge
7. Final decision displayed on **Decision** page with explanation, confidence %, risk level, QR code
8. User can **Trace** the reasoning steps interactively
9. User can **Challenge** the decision on-chain via SimpleDispute (with stake or automated)
10. Decision can be **Verified** by scanning QR code or entering decision ID

---

## Bias Audit System

Every decision includes a `biasAudit` object:
```json
{
  "protectedAttributesExcluded": ["Name", "Age", "Gender", "Race"],
  "evaluatedFactors": ["Income", "Credit score", "Employment type", "Loan amount", "Purpose"],
  "status": "No protected attributes used",
  "note": "This audit confirms the decision excludes protected characteristics. It is a transparency check, not a guarantee of fairness across populations."
}
```

## Agent Review System

An independent agent reviews every decision:
- If confidence < 70% or decision contains unexpected values → `"Challenge recommended"`
- Otherwise → `"No material disagreement"`
- This triggers the automated challenge path

---

## Environment Variables Required

```env
# Backend
GROQ_API_KEY=              # AI provider key (optional — demo mode without it)
FIREBASE_SERVICE_ACCOUNT_JSON=  # Firebase admin credentials
BLOCKCHAIN_RPC_URL=        # EVM RPC endpoint
SIMPLE_DISPUTE_ADDRESS=    # Deployed SimpleDispute contract address
AUTOMATION_PRIVATE_KEY=    # Wallet key for automated challenges
PORT=5000                  # Server port (default)

# Frontend
VITE_API_URL=              # Backend API URL (default: http://localhost:5000)
```

---

## How to Run Locally

```bash
# 1. Install & start frontend
cd frontend && npm install && npm run dev

# 2. Install & start backend
cd backend && npm install && npm run dev

# 3. (Optional) Deploy smart contracts
cd blockchain && npx hardhat ignition deploy ignition/modules/SimpleDispute.ts

# 4. Open http://localhost:5173