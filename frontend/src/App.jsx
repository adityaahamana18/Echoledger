import { useEffect, useState } from "react";
import { Navigate, Routes, Route } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import IndustrySelector from "./pages/IndustrySelector";
import ApplicationForm from "./pages/ApplicationForm";
import Processing from "./pages/Processing";
import Decision from "./pages/Decision";
import Trace from "./pages/Trace";
import Challenge from "./pages/Challenge";
import Admin from "./pages/Admin";
import GovernanceDashboard from "./pages/GovernanceDashboard";
import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";
import Verify from "./pages/Verify";
import { auth } from "./firebase";

function ProtectedRoute({ children }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  if (user === undefined) return <div className="min-h-[50vh]" aria-label="Checking sign-in status" />;
  return user ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <Navbar />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/loan" element={<ProtectedRoute><IndustrySelector /></ProtectedRoute>} />
          <Route path="/apply" element={<ProtectedRoute><IndustrySelector /></ProtectedRoute>} />
          <Route path="/apply/:industry" element={<ProtectedRoute><ApplicationForm /></ProtectedRoute>} />
          <Route path="/processing/:id" element={<ProtectedRoute><Processing /></ProtectedRoute>} />
          <Route path="/decision/:id" element={<ProtectedRoute><Decision /></ProtectedRoute>} />
          <Route path="/trace/:id" element={<Trace />} />
          <Route path="/trace" element={<Trace />} />
          <Route path="/challenge/:id" element={<Challenge />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/governance" element={<ProtectedRoute><GovernanceDashboard /></ProtectedRoute>} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/verify/:id" element={<Verify />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
