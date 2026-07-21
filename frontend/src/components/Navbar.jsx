import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";
import SignInModal from "./SignInModal";

function Navbar() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [pendingPath, setPendingPath] = useState(null);
  const navigate = useNavigate();
  const nav = [
    { to: "/", label: "Home" },
    { to: "/loan", label: "New decision", requiresAuth: true },
    { to: "/trace", label: "Audit trail" },
    { to: "/verify", label: "Verify" },
    { to: "/admin", label: "Insights" },
  ];

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const handleNavClick = (e, item) => {
    if (item.requiresAuth && !user) {
      e.preventDefault();
      setOpen(false);
      setPendingPath(item.to);
      setShowSignIn(true);
    } else {
      setOpen(false);
    }
  };

  const handleSignInSuccess = () => {
    // Navigate to loan if they clicked "New decision" or to pending path
    navigate(pendingPath || "/loan");
    setPendingPath(null);
  };

  const navLinkClass = ({ isActive }) =>
    `text-sm transition ${isActive ? "text-white" : "text-slate-400 hover:text-white"}`;

  return (
    <>
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

          <div className="hidden md:flex items-center gap-6">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={(e) => handleNavClick(e, item)}
                className={navLinkClass}
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            {user ? (
              <div className="flex items-center gap-2">
                <img src={user.photoURL || ""} alt="" className="h-8 w-8 rounded-full bg-slate-800" referrerPolicy="no-referrer" />
                <span className="max-w-32 truncate text-sm font-medium text-slate-200">Hi, {user.displayName?.split(" ")[0] || "there"}</span>
                <button className="secondary-btn !px-3 !py-2 text-xs" onClick={() => signOut(auth)} title="Sign out">
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            ) : (
              <button className="btn-primary !px-5 !py-3" onClick={() => { setPendingPath(null); setShowSignIn(true); }}>
                Sign in with Google
              </button>
            )}
          </div>
          <button onClick={() => setOpen(!open)} className="sm:hidden text-slate-300" aria-label="Toggle navigation">
            {open ? <X /> : <Menu />}
          </button>
        </div>

        {open && (
          <div className="border-t border-white/10 bg-slate-950/95 px-6 py-4 sm:hidden">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={(e) => handleNavClick(e, item)}
                className="block py-2.5 text-slate-300"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 border-t border-white/10 pt-3">
              {user ? (
                <button className="secondary-btn w-full" onClick={() => signOut(auth)}>
                  <LogOut size={15} /> Sign out
                </button>
              ) : (
                <button className="btn-primary w-full" onClick={() => { setOpen(false); setPendingPath(null); setShowSignIn(true); }}>
                  Sign in with Google
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      <SignInModal
        open={showSignIn}
        onClose={() => { setShowSignIn(false); setPendingPath(null); }}
        onSuccess={handleSignInSuccess}
      />
    </>
  );
}

export default Navbar;