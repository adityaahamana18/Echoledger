import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, BadgeCheck, Shield } from "lucide-react";
import Page from "../components/Page";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";
import Input from "../components/Input";
import { auth } from "../firebase";
import { createApplication } from "../utils/audit";
import { industries } from "./IndustrySelector";

function getAge(dob) {
  const today = new Date(), birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() - birth.getMonth() < 0 || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
}

// ── Field definitions per industry ──────────────────────────────────────────

const TEMPLATES = {
  banking: {
    title: "Loan Application",
    description: "Submit financial details for a transparent, explainable credit decision.",
    initial: { name: "", email: "", phone: "", dob: "", income: "", creditScore: "", employment: "Salaried", loanAmount: "", purpose: "Home improvement" },
    validate(v) {
      const e = {};
      if (v.name.trim().length < 2) e.name = "Enter the applicant's full name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "Enter a valid email address.";
      if (!/^[6-9]\d{9}$/.test(v.phone.trim())) e.phone = "Enter a valid 10-digit Indian mobile number.";
      if (!v.dob) { e.dob = "Select a date of birth."; } else if (getAge(v.dob) < 18) e.dob = "Must be at least 18.";
      if (+v.income <= 0) e.income = "Enter a valid monthly income.";
      if (+v.creditScore < 300 || +v.creditScore > 900) e.creditScore = "Credit score must be 300–900.";
      if (+v.loanAmount <= 0) e.loanAmount = "Enter a valid loan amount.";
      return e;
    },
    prepare: (v) => ({ ...v, age: getAge(v.dob) }),
  },
  insurance: {
    title: "Insurance Assessment",
    description: "Submit your profile for a transparent policy eligibility and risk assessment.",
    initial: { name: "", email: "", phone: "", dob: "", policyType: "Health", coverageAmount: "", preExistingConditions: "None", smokingStatus: "Non-smoker", occupation: "" },
    validate(v) {
      const e = {};
      if (v.name.trim().length < 2) e.name = "Enter full name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "Enter a valid email.";
      if (!v.dob) { e.dob = "Select date of birth."; } else if (getAge(v.dob) < 18) e.dob = "Must be at least 18.";
      if (+v.coverageAmount <= 0) e.coverageAmount = "Enter a valid coverage amount.";
      if (!v.occupation.trim()) e.occupation = "Enter your occupation.";
      return e;
    },
    prepare: (v) => ({ ...v, age: getAge(v.dob) }),
  },
  hiring: {
    title: "Candidate Screening",
    description: "Submit candidate details for an AI-assisted, bias-audited hiring review.",
    initial: { name: "", email: "", phone: "", role: "", yearsExperience: "", education: "Bachelor's", skills: "", currentCTC: "", expectedCTC: "" },
    validate(v) {
      const e = {};
      if (v.name.trim().length < 2) e.name = "Enter candidate name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "Enter a valid email.";
      if (!v.role.trim()) e.role = "Enter the role applied for.";
      if (+v.yearsExperience < 0) e.yearsExperience = "Enter valid years of experience.";
      if (!v.skills.trim()) e.skills = "List at least one skill.";
      return e;
    },
    prepare: (v) => v,
  },
  healthcare: {
    title: "Treatment Eligibility",
    description: "Submit patient details for a transparent treatment eligibility assessment.",
    initial: { name: "", email: "", phone: "", dob: "", condition: "", requestedTreatment: "", insuranceCoverage: "Yes", referralSource: "GP", urgency: "Routine" },
    validate(v) {
      const e = {};
      if (v.name.trim().length < 2) e.name = "Enter patient name.";
      if (!v.dob) { e.dob = "Select date of birth."; }
      if (!v.condition.trim()) e.condition = "Describe the medical condition.";
      if (!v.requestedTreatment.trim()) e.requestedTreatment = "Describe the requested treatment.";
      return e;
    },
    prepare: (v) => ({ ...v, age: getAge(v.dob) }),
  },
  government: {
    title: "Welfare Benefit Application",
    description: "Submit your details for a transparent government benefit eligibility check.",
    initial: { name: "", email: "", phone: "", dob: "", annualIncome: "", householdSize: "", benefitType: "Housing subsidy", employmentStatus: "Unemployed", state: "" },
    validate(v) {
      const e = {};
      if (v.name.trim().length < 2) e.name = "Enter full name.";
      if (!v.dob) e.dob = "Select date of birth.";
      if (+v.annualIncome < 0) e.annualIncome = "Enter a valid annual income.";
      if (+v.householdSize < 1) e.householdSize = "Enter household size.";
      if (!v.state.trim()) e.state = "Enter your state.";
      return e;
    },
    prepare: (v) => ({ ...v, age: getAge(v.dob) }),
  },
  education: {
    title: "Admission & Scholarship Review",
    description: "Submit your academic profile for a transparent admission or scholarship decision.",
    initial: { name: "", email: "", phone: "", dob: "", program: "", institution: "", gpa: "", entranceScore: "", financialNeed: "Yes", essaySummary: "" },
    validate(v) {
      const e = {};
      if (v.name.trim().length < 2) e.name = "Enter full name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "Enter a valid email.";
      if (!v.program.trim()) e.program = "Enter the program name.";
      if (!v.institution.trim()) e.institution = "Enter the institution name.";
      if (+v.gpa < 0 || +v.gpa > 10) e.gpa = "GPA must be between 0 and 10.";
      return e;
    },
    prepare: (v) => ({ ...v, age: getAge(v.dob) }),
  },
  "customer-support": {
    title: "Support Escalation",
    description: "Submit a support case for AI-assisted priority routing and resolution.",
    initial: { name: "", email: "", phone: "", issueType: "Billing", severity: "Medium", productName: "", issueDescription: "", previousTickets: "0", resolutionRequested: "" },
    validate(v) {
      const e = {};
      if (v.name.trim().length < 2) e.name = "Enter customer name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "Enter a valid email.";
      if (!v.productName.trim()) e.productName = "Enter the product or service name.";
      if (v.issueDescription.trim().length < 20) e.issueDescription = "Describe the issue in at least 20 characters.";
      return e;
    },
    prepare: (v) => v,
  },
};

// ── Field renderers per industry ─────────────────────────────────────────────

function Fields({ industry, values, errors, change }) {
  const dobField = (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">Date of birth</label>
      <input name="dob" type="date" value={values.dob} onChange={change}
        max={new Date().toISOString().split("T")[0]}
        className={`w-full rounded-xl border ${errors.dob ? "border-rose-500" : "border-slate-700"} bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`} />
      {errors.dob && <p className="text-sm text-rose-400">{errors.dob}</p>}
    </div>
  );

  if (industry === "banking") return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="name" label="Full legal name" value={values.name} onChange={change} error={errors.name} placeholder="e.g. Rajesh Kumar" />
        <Input name="email" label="Email address" type="email" value={values.email} onChange={change} error={errors.email} placeholder="e.g. rajesh@example.com" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="phone" label="Phone number" type="tel" value={values.phone} onChange={change} error={errors.phone} placeholder="e.g. 9876543210" maxLength={10} />
        {dobField}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="income" label="Monthly income (₹)" type="number" value={values.income} onChange={change} error={errors.income} placeholder="e.g. 75000" />
        <Input name="creditScore" label="Credit score" type="number" value={values.creditScore} onChange={change} error={errors.creditScore} placeholder="e.g. 740" min={300} max={900} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="loanAmount" label="Requested loan amount (₹)" type="number" value={values.loanAmount} onChange={change} error={errors.loanAmount} placeholder="e.g. 500000" />
        <div />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Employment type" name="employment" value={values.employment} onChange={change} options={["Salaried", "Self-employed", "Contract", "Retired"]} />
        <SelectField label="Loan purpose" name="purpose" value={values.purpose} onChange={change} options={["Home improvement", "Education", "Business expansion", "Medical", "Vehicle", "Other"]} />
      </div>
    </>
  );

  if (industry === "insurance") return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="name" label="Full name" value={values.name} onChange={change} error={errors.name} placeholder="e.g. Priya Sharma" />
        <Input name="email" label="Email address" type="email" value={values.email} onChange={change} error={errors.email} placeholder="e.g. priya@example.com" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="phone" label="Phone number" type="tel" value={values.phone} onChange={change} error={errors.phone} placeholder="e.g. 9876543210" maxLength={10} />
        {dobField}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Policy type" name="policyType" value={values.policyType} onChange={change} options={["Health", "Life", "Vehicle", "Property", "Travel"]} />
        <Input name="coverageAmount" label="Coverage amount (₹)" type="number" value={values.coverageAmount} onChange={change} error={errors.coverageAmount} placeholder="e.g. 1000000" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Smoking status" name="smokingStatus" value={values.smokingStatus} onChange={change} options={["Non-smoker", "Smoker", "Ex-smoker"]} />
        <Input name="occupation" label="Occupation" value={values.occupation} onChange={change} error={errors.occupation} placeholder="e.g. Software Engineer" />
      </div>
      <SelectField label="Pre-existing conditions" name="preExistingConditions" value={values.preExistingConditions} onChange={change} options={["None", "Diabetes", "Hypertension", "Heart disease", "Other"]} />
    </>
  );

  if (industry === "hiring") return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="name" label="Candidate name" value={values.name} onChange={change} error={errors.name} placeholder="e.g. Ananya Iyer" />
        <Input name="email" label="Email address" type="email" value={values.email} onChange={change} error={errors.email} placeholder="e.g. ananya@example.com" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="phone" label="Phone number" type="tel" value={values.phone} onChange={change} error={errors.phone} placeholder="e.g. 9876543210" maxLength={10} />
        <Input name="role" label="Role applied for" value={values.role} onChange={change} error={errors.role} placeholder="e.g. Senior Backend Engineer" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="yearsExperience" label="Years of experience" type="number" value={values.yearsExperience} onChange={change} error={errors.yearsExperience} placeholder="e.g. 5" min={0} />
        <SelectField label="Highest education" name="education" value={values.education} onChange={change} options={["High School", "Diploma", "Bachelor's", "Master's", "PhD"]} />
      </div>
      <Input name="skills" label="Key skills (comma-separated)" value={values.skills} onChange={change} error={errors.skills} placeholder="e.g. React, Node.js, PostgreSQL" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="currentCTC" label="Current CTC (₹/yr)" type="number" value={values.currentCTC} onChange={change} placeholder="e.g. 1200000" />
        <Input name="expectedCTC" label="Expected CTC (₹/yr)" type="number" value={values.expectedCTC} onChange={change} placeholder="e.g. 1800000" />
      </div>
    </>
  );

  if (industry === "healthcare") return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="name" label="Patient name" value={values.name} onChange={change} error={errors.name} placeholder="e.g. Suresh Patel" />
        <Input name="email" label="Email address" type="email" value={values.email} onChange={change} error={errors.email} placeholder="e.g. suresh@example.com" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="phone" label="Phone number" type="tel" value={values.phone} onChange={change} error={errors.phone} placeholder="e.g. 9876543210" maxLength={10} />
        {dobField}
      </div>
      <Input name="condition" label="Medical condition / diagnosis" value={values.condition} onChange={change} error={errors.condition} placeholder="e.g. Type 2 Diabetes" />
      <Input name="requestedTreatment" label="Requested treatment / procedure" value={values.requestedTreatment} onChange={change} error={errors.requestedTreatment} placeholder="e.g. Insulin therapy" />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Insurance coverage" name="insuranceCoverage" value={values.insuranceCoverage} onChange={change} options={["Yes", "No", "Partial"]} />
        <SelectField label="Referral source" name="referralSource" value={values.referralSource} onChange={change} options={["GP", "Specialist", "Emergency", "Self-referred"]} />
      </div>
      <SelectField label="Urgency" name="urgency" value={values.urgency} onChange={change} options={["Routine", "Urgent", "Emergency"]} />
    </>
  );

  if (industry === "government") return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="name" label="Full name" value={values.name} onChange={change} error={errors.name} placeholder="e.g. Meena Devi" />
        <Input name="email" label="Email address" type="email" value={values.email} onChange={change} error={errors.email} placeholder="e.g. meena@example.com" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="phone" label="Phone number" type="tel" value={values.phone} onChange={change} error={errors.phone} placeholder="e.g. 9876543210" maxLength={10} />
        {dobField}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="annualIncome" label="Annual household income (₹)" type="number" value={values.annualIncome} onChange={change} error={errors.annualIncome} placeholder="e.g. 120000" />
        <Input name="householdSize" label="Household size" type="number" value={values.householdSize} onChange={change} error={errors.householdSize} placeholder="e.g. 4" min={1} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Benefit type" name="benefitType" value={values.benefitType} onChange={change} options={["Housing subsidy", "Food assistance", "Healthcare coverage", "Education grant", "Unemployment benefit"]} />
        <SelectField label="Employment status" name="employmentStatus" value={values.employmentStatus} onChange={change} options={["Employed", "Unemployed", "Self-employed", "Retired", "Student"]} />
      </div>
      <Input name="state" label="State of residence" value={values.state} onChange={change} error={errors.state} placeholder="e.g. Maharashtra" />
    </>
  );

  if (industry === "education") return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="name" label="Applicant name" value={values.name} onChange={change} error={errors.name} placeholder="e.g. Riya Nair" />
        <Input name="email" label="Email address" type="email" value={values.email} onChange={change} error={errors.email} placeholder="e.g. riya@example.com" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="phone" label="Phone number" type="tel" value={values.phone} onChange={change} error={errors.phone} placeholder="e.g. 9876543210" maxLength={10} />
        {dobField}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="program" label="Program applied for" value={values.program} onChange={change} error={errors.program} placeholder="e.g. M.Tech Computer Science" />
        <Input name="institution" label="Institution" value={values.institution} onChange={change} error={errors.institution} placeholder="e.g. IIT Bombay" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="gpa" label="Current GPA (out of 10)" type="number" value={values.gpa} onChange={change} error={errors.gpa} placeholder="e.g. 8.5" min={0} max={10} step={0.1} />
        <Input name="entranceScore" label="Entrance exam score (percentile)" type="number" value={values.entranceScore} onChange={change} placeholder="e.g. 95" min={0} max={100} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Financial need" name="financialNeed" value={values.financialNeed} onChange={change} options={["Yes", "No"]} />
        <div />
      </div>
      <label className="block space-y-2 text-sm font-medium text-slate-300">
        Personal statement summary
        <textarea name="essaySummary" value={values.essaySummary} onChange={change} rows={3}
          placeholder="Brief summary of your goals and motivation..."
          className="mt-2 w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
      </label>
    </>
  );

  if (industry === "customer-support") return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="name" label="Customer name" value={values.name} onChange={change} error={errors.name} placeholder="e.g. Vikram Singh" />
        <Input name="email" label="Email address" type="email" value={values.email} onChange={change} error={errors.email} placeholder="e.g. vikram@example.com" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="phone" label="Phone number" type="tel" value={values.phone} onChange={change} error={errors.phone} placeholder="e.g. 9876543210" maxLength={10} />
        <Input name="productName" label="Product / service name" value={values.productName} onChange={change} error={errors.productName} placeholder="e.g. EchoLedger Pro" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Issue type" name="issueType" value={values.issueType} onChange={change} options={["Billing", "Technical", "Account access", "Refund", "Feature request", "Other"]} />
        <SelectField label="Severity" name="severity" value={values.severity} onChange={change} options={["Low", "Medium", "High", "Critical"]} />
      </div>
      <label className="block space-y-2 text-sm font-medium text-slate-300">
        Issue description
        <textarea name="issueDescription" value={values.issueDescription} onChange={change} rows={4}
          placeholder="Describe the issue in detail..."
          className={`mt-2 w-full resize-none rounded-xl border ${errors.issueDescription ? "border-rose-500" : "border-slate-700"} bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`} />
        {errors.issueDescription && <p className="text-sm text-rose-400">{errors.issueDescription}</p>}
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="previousTickets" label="Previous tickets raised" type="number" value={values.previousTickets} onChange={change} placeholder="e.g. 2" min={0} />
        <Input name="resolutionRequested" label="Resolution requested" value={values.resolutionRequested} onChange={change} placeholder="e.g. Full refund" />
      </div>
    </>
  );

  return null;
}

function SelectField({ label, options, ...props }) {
  return (
    <label className="block space-y-2 text-sm font-medium text-slate-300">
      {label}
      <select className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" {...props}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ApplicationForm() {
  const { industry } = useParams();
  const navigate = useNavigate();

  const template = TEMPLATES[industry];
  const meta = industries.find((i) => i.id === industry);

  if (!template || !meta) {
    navigate("/apply", { replace: true });
    return null;
  }

  const [values, setValues] = useState(template.initial);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const change = (e) => setValues((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const next = template.validate(values);
    setErrors(next);
    if (Object.keys(next).length) return;

    if (!auth.currentUser) {
      setErrors({ form: "Please sign in with Google before submitting." });
      return;
    }

    setSubmitting(true);
    try {
      const id = await createApplication({ ...template.prepare(values), industry, industryLabel: meta.label });
      navigate(`/processing/${id}`);
    } catch {
      setErrors({ form: "Could not save your application. Please check Firestore setup." });
    } finally {
      setSubmitting(false);
    }
  };

  const Icon = meta.icon;

  return (
    <Page>
      <section className="mx-auto max-w-5xl px-6 py-14 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <button onClick={() => navigate("/apply")} className="mb-4 text-sm text-slate-500 hover:text-slate-300 transition">← Change industry</button>
          <span className="eyebrow"><Shield size={14} /> {meta.label}</span>
          <h1 className="mt-5 text-4xl font-bold md:text-5xl">{template.title.split(" ").slice(0, -1).join(" ")} <span className="gradient-text">{template.title.split(" ").at(-1)}</span></h1>
          <p className="mt-4 text-slate-400">{template.description}</p>
        </div>

        <GlassCard className="mx-auto mt-10 max-w-3xl">
          <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-5">
            <Icon size={22} className={meta.color} />
            <span className="font-semibold">{meta.label}</span>
          </div>
          <form onSubmit={submit} noValidate className="space-y-6">
            <Fields industry={industry} values={values} errors={errors} change={change} />
            {errors.form && <p className="text-sm text-rose-300">{errors.form}</p>}
            <div className="flex flex-col justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <BadgeCheck size={16} className="text-emerald-400" /> Saved privately to your Firebase account.
              </p>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Analyze application"} <ArrowRight size={17} />
              </Button>
            </div>
          </form>
        </GlassCard>
      </section>
    </Page>
  );
}
