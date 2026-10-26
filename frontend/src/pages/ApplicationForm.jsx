import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, BadgeCheck, CheckCircle2, FileText, GraduationCap, Briefcase, Info, Lock, Shield, Upload } from "lucide-react";
import Page from "../components/Page";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";
import Input from "../components/Input";
import { auth } from "../firebase";
import { createApplication } from "../utils/audit";
import { decisionCategories } from "./IndustrySelector";

// ── Scholarship Form Component ───────────────────────────────────────────────

function ScholarshipForm({ values, errors, change, toggleDoc }) {
  const docList = [
    "Class 10 / 12 Marksheet & Passing Certificate",
    "Annual Family Income Certificate (Issued by Revenue Authority)",
    "State Domicile / Residence Certificate",
    "Current College Bonafide Student ID / Fee Receipt",
    "National / State Entrance Exam Rank Card (JEE, NEET, GATE)",
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs leading-5 text-cyan-200">
        <Info size={16} className="inline mr-2 text-cyan-400" />
        <strong>Explainable & Privacy-Safe:</strong> Your name and demographic attributes are strictly excluded from AI decision prompts to prevent identity bias.
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          name="name"
          label="Applicant Full Name"
          value={values.name}
          onChange={change}
          error={errors.name}
          placeholder="e.g. Aarav Sharma"
        />
        <Input
          name="email"
          label="Email Address"
          type="email"
          value={values.email}
          onChange={change}
          error={errors.email}
          placeholder="e.g. aarav@example.com"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          name="phone"
          label="Mobile Number (10 Digits)"
          type="tel"
          value={values.phone}
          onChange={change}
          error={errors.phone}
          placeholder="e.g. 9876543210"
          maxLength={10}
        />
        <label className="block space-y-2 text-sm font-medium text-slate-300">
          State of Permanent Residence
          <input
            name="state"
            value={values.state}
            onChange={change}
            placeholder="e.g. Karnataka, Maharashtra, Delhi"
            className={`w-full rounded-xl border ${errors.state ? "border-rose-500" : "border-slate-700"} bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20`}
          />
          {errors.state && <p className="text-xs text-rose-400">{errors.state}</p>}
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block space-y-2 text-sm font-medium text-slate-300">
          Current Education Level
          <select
            name="educationLevel"
            value={values.educationLevel}
            onChange={change}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
          >
            <option>Undergraduate</option>
            <option>Postgraduate</option>
            <option>Diploma</option>
            <option>High School</option>
            <option>PhD / Doctorate</option>
          </select>
        </label>

        <Input
          name="course"
          label="Degree / Major Program"
          value={values.course}
          onChange={change}
          error={errors.course}
          placeholder="e.g. B.Tech Computer Science, B.Sc Physics"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          name="institution"
          label="Institution / University Name"
          value={values.institution}
          onChange={change}
          error={errors.institution}
          placeholder="e.g. National Institute of Technology, Karnataka"
        />
        <label className="block space-y-2 text-sm font-medium text-slate-300">
          Current Year of Study
          <select
            name="yearOfStudy"
            value={values.yearOfStudy}
            onChange={change}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
          >
            <option>1st Year (Fresher)</option>
            <option>2nd Year</option>
            <option>3rd Year</option>
            <option>Final Year</option>
          </select>
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Input
            name="academicScore"
            label="Academic Marks / CGPA"
            type="number"
            step="0.01"
            value={values.academicScore}
            onChange={change}
            error={errors.academicScore}
            placeholder="e.g. 8.75 or 85"
          />
        </div>
        <div>
          <label className="block space-y-2 text-sm font-medium text-slate-300">
            Grading Scale
            <select
              name="gpaScale"
              value={values.gpaScale}
              onChange={change}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
            >
              <option value="10">Scale of 10.0 (CGPA)</option>
              <option value="4">Scale of 4.0 (GPA)</option>
              <option value="100">Percentage (0 - 100%)</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Input
            name="annualIncome"
            label="Gross Annual Household Income (₹)"
            type="number"
            value={values.annualIncome}
            onChange={change}
            error={errors.annualIncome}
            placeholder="e.g. 350000"
          />
          <p className="mt-1 text-xs text-slate-500">
            Leave blank if applying solely for merit scholarships without income ceiling.
          </p>
        </div>

        <label className="block space-y-2 text-sm font-medium text-slate-300">
          Quota / Personal Category (Optional)
          <select
            name="category"
            value={values.category}
            onChange={change}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
          >
            <option>General / Open Merit</option>
            <option>Economically Weaker Section (EWS)</option>
            <option>OBC (Non-Creamy Layer)</option>
            <option>SC / ST</option>
            <option>Person with Disability (PwD)</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Only applied when specifically required by verified scheme guidelines.
          </p>
        </label>
      </div>

      {/* Verification Documents Checklist */}
      <div className="rounded-xl border border-white/10 bg-white/[.02] p-5">
        <p className="text-sm font-semibold text-white">Available Verification Documents</p>
        <p className="mt-1 text-xs text-slate-400">
          Check documents you currently hold for verified scheme confirmation (documents are not uploaded or stored).
        </p>
        <div className="mt-4 space-y-3">
          {docList.map((doc) => {
            const checked = (values.verifiedDocuments || []).includes(doc);
            return (
              <label key={doc} className="flex cursor-pointer items-start gap-3 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleDoc(doc)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                />
                <span>{doc}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Job Form Component ───────────────────────────────────────────────────────

function JobForm({ values, errors, change }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-xs leading-5 text-violet-200">
        <Info size={16} className="inline mr-2 text-violet-400" />
        <strong>Fair Hiring Engine:</strong> Demographic attributes (gender, age, race, nationality) are excluded. Missing preferred skills do not trigger auto-rejection.
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          name="name"
          label="Candidate Full Name"
          value={values.name}
          onChange={change}
          error={errors.name}
          placeholder="e.g. Diya Patel"
        />
        <Input
          name="email"
          label="Email Address"
          type="email"
          value={values.email}
          onChange={change}
          error={errors.email}
          placeholder="e.g. diya@example.com"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          name="phone"
          label="Mobile Number (10 Digits)"
          type="tel"
          value={values.phone}
          onChange={change}
          error={errors.phone}
          placeholder="e.g. 9876543210"
          maxLength={10}
        />
        <Input
          name="preferredRole"
          label="Target Role Applied For"
          value={values.preferredRole}
          onChange={change}
          error={errors.preferredRole}
          placeholder="e.g. Frontend Developer, Backend Developer, Data Analyst"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block space-y-2 text-sm font-medium text-slate-300">
          Experience Level
          <select
            name="experienceTier"
            value={values.experienceTier}
            onChange={change}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-violet-500"
          >
            <option>Student / Internship</option>
            <option>Entry-Level (0 - 2 Years)</option>
            <option>Junior (2 - 4 Years)</option>
            <option>Mid-Level (4 - 7 Years)</option>
            <option>Senior (7+ Years)</option>
          </select>
        </label>

        <Input
          name="yearsExperience"
          label="Total Years of Experience"
          type="number"
          min="0"
          max="50"
          value={values.yearsExperience}
          onChange={change}
          error={errors.yearsExperience}
          placeholder="e.g. 1"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block space-y-2 text-sm font-medium text-slate-300">
          Highest Completed Qualification
          <select
            name="education"
            value={values.education}
            onChange={change}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-violet-500"
          >
            <option>Bachelor's</option>
            <option>Master's</option>
            <option>Diploma</option>
            <option>High School</option>
            <option>PhD / Doctorate</option>
          </select>
        </label>

        <label className="block space-y-2 text-sm font-medium text-slate-300">
          Work Arrangement Preference
          <select
            name="workPreference"
            value={values.workPreference}
            onChange={change}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-violet-500"
          >
            <option>Remote</option>
            <option>Hybrid</option>
            <option>On-site</option>
          </select>
        </label>
      </div>

      <div>
        <label className="block space-y-2 text-sm font-medium text-slate-300">
          Technical & Professional Skills (Comma-Separated)
          <textarea
            name="skills"
            rows={3}
            value={values.skills}
            onChange={change}
            placeholder="e.g. React, JavaScript, TypeScript, HTML/CSS, Node.js, SQL, Git"
            className={`w-full resize-none rounded-xl border ${errors.skills ? "border-rose-500" : "border-slate-700"} bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20`}
          />
          {errors.skills && <p className="text-xs text-rose-400">{errors.skills}</p>}
        </label>
        <p className="mt-1 text-xs text-slate-500">
          List your practical skills. The engine distinguishes mandatory core competencies from nice-to-have preferred skills.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          name="portfolioUrl"
          label="Portfolio / GitHub Repository URL"
          type="url"
          value={values.portfolioUrl}
          onChange={change}
          placeholder="e.g. https://github.com/diyapatel"
        />

        <Input
          name="expectedCtc"
          label="Expected Annual Salary (₹/yr, Optional)"
          type="number"
          value={values.expectedCtc}
          onChange={change}
          placeholder="e.g. 800000"
        />
      </div>

      <label className="block space-y-2 text-sm font-medium text-slate-300">
        Key Projects & Work Highlights
        <textarea
          name="projectsSummary"
          rows={3}
          value={values.projectsSummary}
          onChange={change}
          placeholder="Brief summary of 1-2 major projects, internships, or open-source contributions..."
          className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
        />
      </label>

      {/* Resume Upload */}
      <div>
        <p className="text-sm font-medium text-slate-300 mb-2">Upload Resume (PDF / DOC)</p>
        <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition ${
          values.resumeFile ? "border-violet-500/60 bg-violet-500/5" : "border-slate-700 bg-white/[.02] hover:border-violet-500/40"
        }`}>
          <FileText size={28} className={values.resumeFile ? "text-violet-400" : "text-slate-500"} />
          {values.resumeFile ? (
            <div>
              <p className="text-sm font-semibold text-violet-300">{values.resumeFile.name}</p>
              <p className="text-xs text-slate-400 mt-1">{(values.resumeFile.size / 1024).toFixed(1)} KB · Click to change</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-300 font-medium">Click to upload your resume</p>
              <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX up to 5 MB</p>
            </div>
          )}
          <input
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) change({ target: { name: "resumeFile", value: file } });
            }}
          />
        </label>
        <p className="mt-1.5 text-xs text-slate-500">Your resume helps the AI understand your full profile. It is processed securely and not stored permanently.</p>
      </div>
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────────

const INITIAL_SCHOLARSHIP = {
  name: "",
  email: "",
  phone: "",
  state: "",
  educationLevel: "Undergraduate",
  course: "",
  institution: "",
  yearOfStudy: "1st Year (Fresher)",
  academicScore: "",
  gpaScale: "10",
  annualIncome: "",
  category: "General / Open Merit",
  verifiedDocuments: [
    "Class 10 / 12 Marksheet & Passing Certificate",
    "Current College Bonafide Student ID / Fee Receipt",
  ],
};

const INITIAL_JOB = {
  name: "",
  email: "",
  phone: "",
  preferredRole: "Frontend Developer",
  experienceTier: "Entry-Level (0 - 2 Years)",
  yearsExperience: "1",
  education: "Bachelor's",
  workPreference: "Remote",
  skills: "JavaScript, React, HTML/CSS, Git",
  portfolioUrl: "",
  expectedCtc: "",
  projectsSummary: "",
  resumeFile: null,
};

export default function ApplicationForm() {
  const { industry } = useParams();
  const navigate = useNavigate();

  // Map industry parameter: default to scholarship or job
  const normalizedCategory = (industry || "").toLowerCase().includes("job") || (industry || "").toLowerCase().includes("hiring")
    ? "job"
    : "scholarship";

  const isJob = normalizedCategory === "job";
  const [values, setValues] = useState(isJob ? INITIAL_JOB : INITIAL_SCHOLARSHIP);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const change = (e) => setValues((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const toggleDoc = (doc) => {
    setValues((prev) => {
      const current = prev.verifiedDocuments || [];
      const updated = current.includes(doc) ? current.filter((d) => d !== doc) : [...current, doc];
      return { ...prev, verifiedDocuments: updated };
    });
  };

  const validate = () => {
    const e = {};
    if (!values.name || values.name.trim().length < 2) e.name = "Enter applicant full name (minimum 2 characters).";
    if (!values.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) e.email = "Enter a valid email address.";

    if (isJob) {
      if (!values.preferredRole || values.preferredRole.trim().length < 2) e.preferredRole = "Target role is required.";
      if (!values.skills || values.skills.trim().length < 2) e.skills = "List at least one core skill.";
      if (values.yearsExperience !== "" && Number(values.yearsExperience) < 0) e.yearsExperience = "Experience cannot be negative.";
    } else {
      if (!values.course || values.course.trim().length < 2) e.course = "Course or major is required.";
      if (!values.institution || values.institution.trim().length < 2) e.institution = "Institution name is required.";
      if (!values.state || values.state.trim().length < 2) e.state = "State of residence is required.";
      const score = Number(values.academicScore);
      if (isNaN(score) || score <= 0) e.academicScore = "Enter a valid academic score or CGPA.";
      if (values.annualIncome !== "" && Number(values.annualIncome) < 0) e.annualIncome = "Income cannot be negative.";
    }
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (!auth.currentUser) {
      setErrors({ form: "Please sign in with Google before submitting an application." });
      return;
    }

    setSubmitting(true);
    try {
      // eslint-disable-next-line no-unused-vars
      const { resumeFile, ...safeValues } = values;

      // Store resume file in memory for Processing page to pick up
      if (resumeFile instanceof File) window.__resumeFile = resumeFile;
      else window.__resumeFile = null;

      const payload = {
        ...safeValues,
        category: normalizedCategory,
        industry: normalizedCategory,
        industryLabel: isJob ? "Job Decision Assistant" : "Scholarship Decision Assistant",
        hasResume: isJob && Boolean(resumeFile),
        resumeFileName: isJob && resumeFile ? resumeFile.name : null,
      };

      const id = await createApplication(payload);
      navigate(`/processing/${id}`);
    } catch (err) {
      console.error("Save application error:", err);
      setErrors({ form: "Could not save your application. Please check your network and Firestore connection." });
    } finally {
      setSubmitting(false);
    }
  };

  const Icon = isJob ? Briefcase : GraduationCap;
  const themeColor = isJob ? "text-violet-400" : "text-cyan-400";
  const title = isJob ? "Job Fit & Qualification Review" : "Scholarship Eligibility Assessment";
  const desc = isJob
    ? "Submit your skills, experience, and career preferences for an explainable, skill-gap-aware hiring assessment."
    : "Submit your academic profile and criteria for a transparent, evidence-led scholarship match.";

  return (
    <Page>
      <section className="mx-auto max-w-5xl px-6 py-14 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <button
            onClick={() => navigate("/apply")}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
          >
            ← Change decision category
          </button>
          <div className="flex justify-center">
            <span className="eyebrow">
              <Shield size={14} className={themeColor} />
              {isJob ? "Career Fit Engine" : "Verified Schemes Engine"}
            </span>
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">
            {title.split(" ").slice(0, -1).join(" ")} <span className="gradient-text">{title.split(" ").at(-1)}</span>
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-400 md:text-base">
            {desc}
          </p>
        </div>

        <GlassCard className="mx-auto mt-10 max-w-3xl">
          <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <Icon size={24} className={themeColor} />
              <span className="text-lg font-semibold">{isJob ? "Job Decision Assistant" : "Scholarship Decision Assistant"}</span>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Lock size={13} /> Protected Attributes Excluded
            </span>
          </div>

          <form onSubmit={submit} noValidate className="space-y-6">
            {isJob ? (
              <JobForm values={values} errors={errors} change={change} />
            ) : (
              <ScholarshipForm values={values} errors={errors} change={change} toggleDoc={toggleDoc} />
            )}

            {errors.form && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                {errors.form}
              </div>
            )}

            <div className="flex flex-col justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
              <p className="flex items-center gap-2 text-xs text-slate-400">
                <BadgeCheck size={16} className="text-emerald-400" />
                Deterministic evaluation precedes AI deliberation.
              </p>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Analyzing Profile…" : "Run Assessment"} <ArrowRight size={17} />
              </Button>
            </div>
          </form>
        </GlassCard>
      </section>
    </Page>
  );
}
