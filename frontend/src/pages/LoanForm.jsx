import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BadgeCheck, Shield } from "lucide-react";
import Page from "../components/Page";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";
import Input from "../components/Input";
import { auth } from "../firebase";
import { createApplication } from "../utils/audit";

function getAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

const initial = {
  name: "",
  email: "",
  phone: "",
  dob: "",
  income: "",
  creditScore: "",
  employment: "Salaried",
  loanAmount: "",
  purpose: "Home improvement"
};

export default function LoanForm() {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const change = (event) => setValues({ ...values, [event.target.name]: event.target.value });

  const validate = () => {
    const next = {};
    
    // Name validation
    if (values.name.trim().length < 2) next.name = "Enter the applicant's full name.";
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!values.email.trim()) {
      next.email = "Enter an email address.";
    } else if (!emailRegex.test(values.email.trim())) {
      next.email = "Enter a valid email address.";
    }
    
    // Phone validation (Indian mobile: 10 digits starting with 6-9)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!values.phone.trim()) {
      next.phone = "Enter a phone number.";
    } else if (!phoneRegex.test(values.phone.trim())) {
      next.phone = "Enter a valid 10-digit Indian mobile number.";
    }
    
    // DOB validation (must be 18-100)
    if (!values.dob) {
      next.dob = "Select a date of birth.";
    } else {
      const age = getAge(values.dob);
      if (age < 18) next.dob = "Applicant must be at least 18 years old.";
      else if (age > 100) next.dob = "Invalid date of birth.";
    }
    
    // Other validations
    if (+values.income <= 0) next.income = "Enter a valid monthly income.";
    if (+values.creditScore < 300 || +values.creditScore > 900) next.creditScore = "Credit score must be 300–900.";
    if (+values.loanAmount <= 0) next.loanAmount = "Enter a valid loan amount.";
    
    return next;
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;

    if (!auth.currentUser) {
      setErrors({ form: "Please sign in with Google before submitting an application." });
      return;
    }

    setSubmitting(true);
    try {
      // Add computed age to the values for backend processing
      const applicationData = {
        ...values,
        age: getAge(values.dob), // computed age for backend compatibility
      };
      const id = await createApplication(applicationData);
      navigate(`/processing/${id}`);
    } catch {
      setErrors({ form: "Could not save your application. Please check Firestore setup." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page>
      <section className="mx-auto max-w-5xl px-6 py-14 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow"><Shield size={14} /> Secure application</span>
          <h1 className="mt-5 text-4xl font-bold md:text-5xl">Start a transparent <span className="gradient-text">decision</span></h1>
          <p className="mt-4 text-slate-400">Submit the facts. EchoLedger records the reasoning, signal quality, and a tamper-evident audit hash.</p>
        </div>

        <GlassCard className="mx-auto mt-10 max-w-3xl">
          <form onSubmit={submit} noValidate className="space-y-6">
            {/* Row 1: Name, Email */}
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                name="name"
                label="Full legal name"
                value={values.name}
                onChange={change}
                error={errors.name}
                type="text"
                placeholder="e.g. Rajesh Kumar"
              />
              <Input
                name="email"
                label="Email address"
                value={values.email}
                onChange={change}
                error={errors.email}
                type="email"
                placeholder="e.g. rajesh@example.com"
              />
            </div>

            {/* Row 2: Phone, DOB */}
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                name="phone"
                label="Phone number"
                value={values.phone}
                onChange={change}
                error={errors.phone}
                type="tel"
                placeholder="e.g. 9876543210"
                maxLength={10}
              />
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Date of birth
                </label>
                <input
                  name="dob"
                  type="date"
                  value={values.dob}
                  onChange={change}
                  max={new Date().toISOString().split("T")[0]}
                  className={`w-full rounded-xl border ${
                    errors.dob ? "border-rose-500" : "border-slate-700"
                  } bg-slate-900 px-4 py-3 text-white outline-none transition-all duration-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`}
                />
                {errors.dob && (
                  <p className="text-red-400 text-sm">{errors.dob}</p>
                )}
              </div>
            </div>

            {/* Row 3: Income, Credit Score */}
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                name="income"
                label="Monthly income (₹)"
                value={values.income}
                onChange={change}
                error={errors.income}
                type="number"
                min={0}
                placeholder="e.g. 75000"
              />
              <Input
                name="creditScore"
                label="Credit score"
                value={values.creditScore}
                onChange={change}
                error={errors.creditScore}
                type="number"
                min={300}
                max={900}
                placeholder="e.g. 740"
              />
            </div>

            {/* Row 4: Loan Amount */}
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                name="loanAmount"
                label="Requested loan amount (₹)"
                value={values.loanAmount}
                onChange={change}
                error={errors.loanAmount}
                type="number"
                min={0}
                placeholder="e.g. 500000"
              />
              <div />
            </div>

            {/* Select fields */}
            <div className="grid gap-5 sm:grid-cols-2">
              <Select label="Employment type" name="employment" value={values.employment} onChange={change} options={["Salaried", "Self-employed", "Contract", "Retired"]} />
              <Select label="Loan purpose" name="purpose" value={values.purpose} onChange={change} options={["Home improvement", "Education", "Business expansion", "Medical", "Vehicle", "Other"]} />
            </div>

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

function Select({ label, options, ...props }) {
  return (
    <label className="block space-y-2 text-sm font-medium text-slate-300">
      {label}
      <select className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" {...props}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}