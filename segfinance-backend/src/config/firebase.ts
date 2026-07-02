import { initializeApp, cert, getApps } from "firebase-admin";
import { getAuth } from "firebase-admin/auth";

let firebaseAuth: import("firebase-admin/auth").Auth | null = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    initializeApp({ credential: cert(serviceAccount) });
  }
  firebaseAuth = getAuth();
}

export { firebaseAuth };
