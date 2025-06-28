
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
  apiKey: "AIzaSyB_OqHXIjYCXkRMGLjxwXVTxDCA2HN-eRk",
  authDomain: "clubzenith.firebaseapp.com",
  projectId: "clubzenith",
  storageBucket: "clubzenith.appspot.com",
  messagingSenderId: "720998936376",
  appId: "YOUR_APP_ID", // You can find this in your Firebase project settings
};
// =================================================================

// Initialize Firebase only if it hasn't been initialized yet
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Get Firestore and Auth instances
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
