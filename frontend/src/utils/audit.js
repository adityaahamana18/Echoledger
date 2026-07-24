import CryptoJS from "crypto-js";
import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where, limit } from "firebase/firestore";
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

  // Also save a public verification record for the /verify page
  // Use setDoc with the same ID for direct lookup in publicVerifications
  try {
    await setDoc(doc(db, "publicVerifications", id), {
      hash,
      createdAt,
      status: "complete",
    });
  } catch (error) {
    console.warn("Could not save public verification record:", error);
  }

  return { id, application, result, hash, createdAt, status: "complete" };
}

export async function getAudit(id) {
  const snapshot = await getDoc(doc(applications(), id));
  if (!snapshot.exists()) throw new Error("Decision record not found.");
  return { id: snapshot.id, ...snapshot.data() };
}

export async function getPublicVerification(id) {
  if (!id) throw new Error("A decision ID is required.");

  console.log("Searching for decision ID:", id);

  // 1. Try direct lookup (new format)
  try {
    const snapshot = await getDoc(doc(db, "publicVerifications", id));
    if (snapshot.exists()) {
      console.log("Found in publicVerifications (direct)");
      return { id: snapshot.id, ...snapshot.data() };
    }
  } catch (e) {
    console.error("Direct lookup error:", e);
  }

  // 2. Try query (old format)
  try {
    const q = query(collection(db, "publicVerifications"), where("id", "==", id), limit(1));
    const snapshots = await getDocs(q);
    if (!snapshots.empty) {
      console.log("Found in publicVerifications (query)");
      const item = snapshots.docs[0];
      return { id: item.data().id, ...item.data() };
    }
  } catch (e) {
    console.error("Query lookup error:", e);
  }

  // 3. Last Resort: Search ALL users' applications (admin-like or public fallback)
  // Note: This requires a Firestore index or specific rules.
  // We can try to see if it's in the CURRENT user's apps first.
  if (auth.currentUser) {
    try {
      const privateAudit = await getAudit(id);
      console.log("Found in user's private applications");
      return {
        id: privateAudit.id,
        hash: privateAudit.hash,
        createdAt: privateAudit.createdAt,
        status: privateAudit.status,
      };
    } catch (e) {
      console.warn("Not found in current user's applications");
    }
  }

  console.error("Decision record not found anywhere.");
  throw new Error("Decision record not found.");
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
