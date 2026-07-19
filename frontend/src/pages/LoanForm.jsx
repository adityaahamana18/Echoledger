import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BadgeCheck, Shield } from "lucide-react";
import Page from "../components/Page";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";
import Input from "../components/Input";
import { auth } from "../firebase";
import { createApplication } from "../utils/audit";

const initial = { name: "", age: "", income: "", creditScore: "", employment: "Salaried", loanAmount: "", purpose: "Home improvement" };
const labels = { name: "Full legal name", age: "Age", income: "Monthly income (₹)", creditScore: "Credit score", loanAmount: "Requested loan amount (₹)" };

export default function LoanForm() {
  const [values, setValues] = useState(initial); const [errors, setErrors] = useState({}); const navigate = useNavigate();
  const change = (event) => setValues({ ...values, [event.target.name]: event.target.value });
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => { event.preventDefault(); const next = {};
    if (values.name.trim().length < 2) next.name = "Enter the applicant's name.";
    if (+values.age < 18 || +values.age > 100) next.age = "Applicant must be between 18 and 100.";
    if (+values.income <= 0) next.income = "Enter a valid monthly income.";
    if (+values.creditScore < 300 || +values.creditScore > 900) next.creditScore = "Credit score must be 300–900.";
    if (+values.loanAmount <= 0) next.loanAmount = "Enter a valid loan amount.";
    setErrors(next); if (Object.keys(next).length) return;
    if (!auth.currentUser) { setErrors({ form: "Please sign in with Google before submitting an application." }); return; }
    setSubmitting(true); try { const id = await createApplication(values); navigate(`/processing/${id}`); } catch { setErrors({ form: "Could not save your application. Please check Firestore setup." }); } finally { setSubmitting(false); }
  };
  return <Page><section className="mx-auto max-w-5xl px-6 py-14 md:py-20"><div className="mx-auto max-w-2xl text-center"><span className="eyebrow"><Shield size={14} /> Secure application</span><h1 className="mt-5 text-4xl font-bold md:text-5xl">Start a transparent <span className="gradient-text">decision</span></h1><p className="mt-4 text-slate-400">Submit the facts. EchoLedger records the reasoning, signal quality, and a tamper-evident audit hash.</p></div>
  <GlassCard className="mx-auto mt-10 max-w-3xl"><form onSubmit={submit} noValidate className="space-y-6"><div className="grid gap-5 sm:grid-cols-2">{Object.keys(labels).map((name) => <Input key={name} name={name} label={labels[name]} value={values[name]} onChange={change} error={errors[name]} type={name === "name" ? "text" : "number"} min={name === "age" ? 18 : undefined} placeholder={name === "creditScore" ? "e.g. 740" : ""} />)}</div>
  <div className="grid gap-5 sm:grid-cols-2"><Select label="Employment type" name="employment" value={values.employment} onChange={change} options={["Salaried", "Self-employed", "Contract", "Retired"]} /><Select label="Loan purpose" name="purpose" value={values.purpose} onChange={change} options={["Home improvement", "Education", "Business expansion", "Medical", "Vehicle", "Other"]} /></div>
  {errors.form && <p className="text-sm text-rose-300">{errors.form}</p>}<div className="flex flex-col justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center"><p className="flex items-center gap-2 text-xs text-slate-500"><BadgeCheck size={16} className="text-emerald-400" /> Saved privately to your Firebase account.</p><Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Analyze application"} <ArrowRight size={17} /></Button></div></form></GlassCard></section></Page>;
}
function Select({ label, options, ...props }) { return <label className="block space-y-2 text-sm font-medium text-slate-300">{label}<select className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" {...props}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
