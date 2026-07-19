import { Link, NavLink } from "react-router-dom";
import { LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebase";

function Navbar() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const nav = [{ to: "/", label: "Home" }, { to: "/loan", label: "New decision" }, { to: "/trace", label: "Audit trail" }, { to: "/verify", label: "Verify" }, { to: "/admin", label: "Insights" }];
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  const signIn = async () => {
    setLoading(true); setAuthError("");
    try {
      const { user: signedInUser } = await signInWithPopup(auth, googleProvider);
      try {
        await setDoc(doc(db, "users", signedInUser.uid), {
          uid: signedInUser.uid, name: signedInUser.displayName || "EchoLedger user", email: signedInUser.email || null,
          photoURL: signedInUser.photoURL || null, provider: "google.com", lastLoginAt: serverTimestamp(),
        }, { merge: true });
      } catch (profileError) { console.warn("Signed in, but profile sync failed", profileError); setAuthError("Signed in successfully. Enable Firestore to sync your profile and decisions."); }
    } catch (error) {
      console.error("Google sign-in failed", error);
      setAuthError(error.code === "auth/popup-closed-by-user" ? "Sign-in cancelled." : "Could not sign in with Google. Check Firebase Authentication setup.");
    } finally { setLoading(false); }
  };
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl bg-slate-950/70">
      <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">

        <Link
          to="/"
          className="flex items-center gap-3"
        >
          <ShieldCheck
            className="text-blue-500"
            size={34}
          />

          <span className="font-bold text-2xl gradient-text">
            EchoLedger
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">{nav.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => `text-sm transition ${isActive ? "text-white" : "text-slate-400 hover:text-white"}`}>{item.label}</NavLink>)}</div>

        <div className="hidden items-center gap-3 sm:flex">{user ? <div className="flex items-center gap-2"><img src={user.photoURL || ""} alt="" className="h-8 w-8 rounded-full bg-slate-800" referrerPolicy="no-referrer" /><span className="max-w-32 truncate text-sm font-medium text-slate-200">Hi, {user.displayName?.split(" ")[0] || "there"}</span><button className="secondary-btn !px-3 !py-2 text-xs" onClick={() => signOut(auth)} title="Sign out"><LogOut size={15} /> Sign out</button></div> : <button className="btn-primary !px-5 !py-3" onClick={signIn} disabled={loading}>{loading ? "Signing in…" : "Sign in with Google"}</button>}</div>
        <button onClick={() => setOpen(!open)} className="sm:hidden text-slate-300" aria-label="Toggle navigation">{open ? <X /> : <Menu />}</button>

      </div>
      {open && <div className="border-t border-white/10 bg-slate-950/95 px-6 py-4 sm:hidden">{nav.map((item) => <NavLink key={item.to} onClick={() => setOpen(false)} to={item.to} className="block py-2.5 text-slate-300">{item.label}</NavLink>)}<div className="mt-3 border-t border-white/10 pt-3">{user ? <button className="secondary-btn w-full" onClick={() => signOut(auth)}><LogOut size={15} /> Sign out</button> : <button className="btn-primary w-full" onClick={signIn} disabled={loading}>{loading ? "Signing in…" : "Sign in with Google"}</button>}</div></div>}
      {authError && <p className="absolute right-6 top-[5.5rem] rounded-lg border border-rose-400/20 bg-slate-900 px-3 py-2 text-xs text-rose-300 shadow-xl">{authError}</p>}
    </nav>
  );
}

export default Navbar;
