
// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// =================================================================
// IMPORTANT: REPLACE WITH YOUR FIREBASE PROJECT CONFIGURATION
// =================================================================
// Go to your Firebase project console -> Project settings (gear icon) -> General
// Under "Your apps", find your web app and copy the configuration object.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Replace with your actual API key
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com", // Replace with your actual auth domain
  projectId: "YOUR_PROJECT_ID", // Replace with your actual project ID
  storageBucket: "YOUR_PROJECT_ID.appspot.com", // Replace with your actual storage bucket
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Replace with your actual sender ID
  appId: "YOUR_APP_ID", // Replace with your actual app ID
};
// =================================================================

// Initialize Firebase only if it hasn't been initialized yet
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Get Firestore and Auth instances
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
