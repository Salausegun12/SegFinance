import { initializeApp, cert, getApps } from "firebase-admin";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    initializeApp({ credential: cert(serviceAccount) });
  } else {
    initializeApp();
  }
}

export const firebaseAuth = getAuth();
