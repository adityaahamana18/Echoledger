import { ShieldCheck } from "lucide-react";

function Footer() {
  return (
    <footer className="border-t border-white/10 mt-24">

      <div className="max-w-7xl mx-auto py-12 px-6">

        <div className="flex items-center gap-3 mb-4">

          <ShieldCheck
            className="text-blue-500"
            size={28}
          />

          <h2 className="text-xl font-bold gradient-text">
            EchoLedger
          </h2>

        </div>

        <p className="text-slate-400 max-w-xl">

          Building trust in AI through transparent,
          explainable and challengeable decisions.

        </p>

        <div className="mt-10 border-t border-white/10 pt-6 flex justify-between flex-col md:flex-row gap-3">

          <p className="text-slate-500">
            © 2026 EchoLedger. All rights reserved.
          </p>

          <p className="text-slate-500">
            Built with React • Tailwind • Groq AI
          </p>

        </div>

      </div>

    </footer>
  );
}

export default Footer;