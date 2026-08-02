import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, browserSessionPersistence, setPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};


// Initialize Firebase app and export auth instance
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure session-only persistence on initialization
setPersistence(auth, browserSessionPersistence).catch((err) => {
  console.error("Firebase persistence initialization failed", err);
});

// Deprecated: No longer needed on button clicks as it is set on initialization
export const setSessionPersistence = () => Promise.resolve();

// Always show the Google account picker so users are never auto-signed in
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });