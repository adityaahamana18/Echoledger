import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, Check, Copy, Mail, MessageSquare, Phone, ShieldCheck, X } from "lucide-react";
import Page from "../components/Page";

const ADMIN_EMAIL = "contact@echoledger.io";

export default function Contact() {
  const [params] = useSearchParams();
  const [showPopup, setShowPopup] = useState(false);
  const [copied, setCopied] = useState(null); // "email" | "subject" | "body"

  const plan = params.get("plan") || "";
  const type = params.get("type") || "general";

  const subject = plan
    ? `EchoLedger ${plan} Plan — ${type === "demo" ? "Demo Request" : type === "trial" ? "Free Trial" : "Sales Enquiry"}`
    : "EchoLedger — Sales Enquiry";

  const body = plan
    ? `Hi EchoLedger Team,\n\nI'm interested in the EchoLedger ${plan} plan.\n\nOrganisation name: \nContact name: \nPhone number: \nNumber of AI decisions per month (approx): \nCurrent compliance challenges: \n\nPlease get in touch at your earliest convenience.\n\nRegards,`
    : `Hi EchoLedger Team,\n\nI'd like to learn more about EchoLedger.\n\nOrganisation name: \nContact name: \nPhone number: \n\nRegards,`;

  const label =
    type === "demo" ? "Book a Demo" :
    type === "trial" ? "Start Free Trial" :
    "Contact Sales";

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Page>
      <section className="mx-auto max-w-2xl px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <span className="eyebrow"><ShieldCheck size={13} /> Get in touch</span>
          <h1 className="mt-5 text-4xl font-bold">
            {label} — <span className="gradient-text">{plan || "EchoLedger"}</span>
          </h1>
          <p className="mt-3 text-slate-400">
            We respond within <span className="text-white font-medium">2 business hours.</span> Send us an email and we'll set everything up.
          </p>
        </motion.div>

        {/* Contact card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mt-10 rounded-2xl border border-white/10 bg-white/[.04] p-8 space-y-6"
        >
          {plan && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
              You selected the <span className="font-bold">{plan} plan</span>. We'll confirm pricing and onboarding details over email.
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[.03] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/15">
                <Mail size={18} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Send email to</p>
                <p className="text-sm font-medium text-white">{ADMIN_EMAIL}</p>
              </div>
              <button
                onClick={() => copy(ADMIN_EMAIL, "email")}
                className="secondary-btn !px-3 !py-2 text-xs shrink-0"
              >
                {copied === "email" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied === "email" ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[.03] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/15">
                <MessageSquare size={18} className="text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Response time</p>
                <p className="text-sm font-medium text-white">Within 2 business hours</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[.03] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                <Phone size={18} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Availability</p>
                <p className="text-sm font-medium text-white">Mon – Sat, 9 AM – 7 PM IST</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowPopup(true)}
            className="btn-primary w-full justify-center"
          >
            <Mail size={17} /> View email template <ArrowRight size={16} />
          </button>

          <p className="text-center text-xs text-slate-500">
            We'll show you the exact email to send — just copy and paste it.
          </p>
        </motion.div>

        {/* What happens next */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mt-8 rounded-2xl border border-white/10 bg-white/[.03] p-6"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">What happens next</p>
          <div className="space-y-3">
            {[
              { step: "1", text: "Click \"View email template\" and copy the pre-filled message" },
              { step: "2", text: `Open your email app and send it to ${ADMIN_EMAIL}` },
              { step: "3", text: "We'll reply within 2 hours with a demo link or trial credentials" },
              { step: "4", text: "30-minute onboarding call — go live with full compliance reports" },
            ].map((s) => (
              <div key={s.step} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400">
                  {s.step}
                </span>
                <p className="text-sm text-slate-300">{s.text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Email popup modal */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowPopup(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 20 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Mail size={17} className="text-blue-400" />
                  <h2 className="font-semibold text-white">Email template</h2>
                </div>
                <button onClick={() => setShowPopup(false)} className="text-slate-400 hover:text-white transition">
                  <X size={20} />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-400">
                  Copy this email and send it to{" "}
                  <span className="font-semibold text-white">{ADMIN_EMAIL}</span>
                </p>

                {/* To */}
                <div className="rounded-xl border border-white/10 bg-white/[.03] p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">To</p>
                    <button onClick={() => copy(ADMIN_EMAIL, "email")} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition">
                      {copied === "email" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      {copied === "email" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-sm text-white font-mono">{ADMIN_EMAIL}</p>
                </div>

                {/* Subject */}
                <div className="rounded-xl border border-white/10 bg-white/[.03] p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Subject</p>
                    <button onClick={() => copy(subject, "subject")} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition">
                      {copied === "subject" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      {copied === "subject" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-sm text-white">{subject}</p>
                </div>

                {/* Body */}
                <div className="rounded-xl border border-white/10 bg-white/[.03] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Message</p>
                    <button onClick={() => copy(body, "body")} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition">
                      {copied === "body" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      {copied === "body" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-6">{body}</pre>
                </div>

                {/* Copy all button */}
                <button
                  onClick={() => copy(`To: ${ADMIN_EMAIL}\nSubject: ${subject}\n\n${body}`, "all")}
                  className="btn-primary w-full justify-center"
                >
                  {copied === "all" ? <Check size={16} className="text-emerald-300" /> : <Copy size={16} />}
                  {copied === "all" ? "Copied! Now paste into your email app" : "Copy full email"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}
