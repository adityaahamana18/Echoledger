import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, Mail, UserPlus, X } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebase";

export default function SignInModal({ open, onClose, onSuccess }) {
  const [mode, setMode] = useState("signin"); // "signin" or "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const resetForm = () => {
    setMode("signin");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setDisplayName("");
    setAuthError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const saveUserProfile = async (user) => {
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name: displayName || user.displayName || "EchoLedger user",
          email: user.email || null,
          photoURL: user.photoURL || null,
          provider: mode === "signup" ? "password" : user.providerData?.[0]?.providerId || "password",
          lastLoginAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (profileError) {
      console.warn("Profile sync failed", profileError);
      setAuthError(
        "Signed in successfully. Enable Firestore to sync your profile and decisions."
      );
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError("");
    try {
      const { user } = await signInWithPopup(auth, googleProvider);
      await saveUserProfile(user);
      onSuccess?.(user);
      handleClose();
    } catch (error) {
      console.error("Google sign-in failed", error);
      setAuthError(
        error.code === "auth/popup-closed-by-user"
          ? "Sign-in cancelled."
          : "Could not sign in with Google. Check Firebase Authentication setup."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError("");

    // Validation
    if (!email.trim()) {
      setAuthError("Please enter your email address.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setAuthError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }
    if (mode === "signup") {
      if (!displayName.trim()) {
        setAuthError("Please enter your full name.");
        return;
      }
      if (password !== confirmPassword) {
        setAuthError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);
    try {
      let userCredential;
      if (mode === "signup") {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }
      await saveUserProfile(userCredential.user);
      onSuccess?.(userCredential.user);
      handleClose();
    } catch (error) {
      console.error("Email auth failed", error);
      switch (error.code) {
        case "auth/email-already-in-use":
          setAuthError("This email is already registered. Try signing in instead.");
          break;
        case "auth/user-not-found":
          setAuthError("No account found with this email. Please sign up.");
          break;
        case "auth/wrong-password":
          setAuthError("Incorrect password. Please try again.");
          break;
        case "auth/invalid-credential":
          setAuthError("Invalid email or password.");
          break;
        case "auth/too-many-requests":
          setAuthError("Too many attempts. Please try again later.");
          break;
        default:
          setAuthError(error.message || "Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setAuthError("");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl p-8 shadow-2xl"
          >
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            {/* Tabs */}
            <div className="flex rounded-xl border border-slate-700 bg-slate-800/50 p-1 mb-6">
              <button
                onClick={() => switchMode("signin")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  mode === "signin"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LogIn size={16} /> Sign In
              </button>
              <button
                onClick={() => switchMode("signup")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  mode === "signup"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <UserPlus size={16} /> Sign Up
              </button>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-500/10">
                {mode === "signin" ? (
                  <LogIn className="h-8 w-8 text-blue-400" />
                ) : (
                  <UserPlus className="h-8 w-8 text-blue-400" />
                )}
              </div>
              <h2 className="mt-4 text-2xl font-bold text-white">
                {mode === "signin" ? "Welcome back" : "Create an account"}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                {mode === "signin"
                  ? "Sign in to access your decision records."
                  : "Create an account to start recording decisions."}
              </p>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailAuth} className="mt-6 space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "At least 6 characters" : "Enter your password"}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {mode === "signup" && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3.5 font-semibold text-white transition hover:from-blue-500 hover:to-violet-600 disabled:opacity-60 shadow-lg shadow-blue-600/30"
              >
                <Mail size={17} />
                {loading
                  ? "Please wait…"
                  : mode === "signin"
                  ? "Sign in with Email"
                  : "Create account"}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-900/95 px-3 text-slate-500">or continue with</span>
              </div>
            </div>

            {/* Google Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-600 bg-white/5 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {loading ? "Signing in…" : `Continue with Google`}
            </button>

            {/* Switch mode hint */}
            <p className="mt-5 text-center text-xs text-slate-500">
              {mode === "signin" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    onClick={() => switchMode("signup")}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => switchMode("signin")}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>

            {authError && (
              <p className="mt-4 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2.5 text-center text-xs text-rose-300">
                {authError}
              </p>
            )}

            <p className="mt-4 text-center text-xs text-slate-500">
              Your decision records are saved privately to your Firebase account.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}