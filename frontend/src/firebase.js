import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { GoogleAuthProvider, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC0qW8cWOtU3B775z0jlbcarsMVP1dHJT8",
  authDomain: "echoledg.firebaseapp.com",
  projectId: "echoledg",
  storageBucket: "echoledg.firebasestorage.app",
  messagingSenderId: "1085802048537",
  appId: "1:1085802048537:web:fc1a440860e07ac9770e88",
  measurementId: "G-KNR0BQJ2YD",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
export const db = getFirestore(firebaseApp);

// Analytics is unavailable in some browser contexts (including private mode).
// Keep it optional so the app remains reliable in every demo environment.
export const analyticsPromise = typeof window !== "undefined"
  ? isSupported().then((supported) => supported ? getAnalytics(firebaseApp) : null)
  : Promise.resolve(null);