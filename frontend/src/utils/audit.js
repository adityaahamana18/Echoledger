import CryptoJS from "crypto-js";
import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const applications = (uid = auth.currentUser?.uid) => {
  if (!uid) throw new Error("Please sign in to access decision records.");
  return collection(db, "users", uid, "applications");
};

export async function createApplication(application) {
  const createdAt = new Date().toISOString();
  const reference = await addDoc(applications(), { application, createdAt, createdAtServer: serverTimestamp(), status: "processing", challenge: null });
  return reference.id;
}

export async function saveDecision(id, application, result, reasoningSteps = []) {
  const createdAt = new Date().toISOString();
  const hash = CryptoJS.SHA256(JSON.stringify({ application, result, createdAt, id })).toString();
  await updateDoc(doc(applications(), id), { result, hash, reasoningSteps, status: "complete", completedAt: createdAt, completedAtServer: serverTimestamp() });
  return { id, application, result, hash, createdAt, status: "complete" };
}

export async function getAudit(id) {
  const snapshot = await getDoc(doc(applications(), id));
  if (!snapshot.exists()) throw new Error("Decision record not found.");
  return { id: snapshot.id, ...snapshot.data() };
}

export async function getAudits() {
  const snapshots = await getDocs(query(applications(), orderBy("createdAtServer", "desc")));
  return snapshots.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function challengeAudit(id, challenge) {
  await updateDoc(doc(applications(), id), { challenge: { ...challenge, status: "Pending review", submittedAt: new Date().toISOString(), submittedAtServer: serverTimestamp() } });
  return getAudit(id);
}

export async function saveBlockchainCommit(id, transactionHash) {
  await updateDoc(doc(applications(), id), { blockchain: { transactionHash, committedAt: new Date().toISOString() } });
}

export const percent = (value) => `${Math.round(Number(value) || 0)}%`;
