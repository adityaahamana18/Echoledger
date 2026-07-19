import "dotenv/config";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const email = process.argv[2];
if (!email) throw new Error("Usage: node set-admin.js admin@example.com");
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) : null;
const app = getApps().length ? getApps()[0] : initializeApp({ credential: serviceAccount ? cert(serviceAccount) : applicationDefault() });
const auth = getAuth(app);
const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, { admin: true });
console.log(`${email} is now an EchoLedger admin. Sign out and sign in again to refresh the role.`);
