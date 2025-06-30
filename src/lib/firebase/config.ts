
// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";

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
  appId: "1:720998936376:web:27ae05972dbed021795bcd", // You can find this in your Firebase project settings
};
// =================================================================

// Initialize Firebase only if it hasn't been initialized yet
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with in-memory cache instead of IndexedDB.
// This can resolve certain "client is offline" errors by avoiding
// potential issues with browser storage persistence.
const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
});

const auth = getAuth(app);

export { app, db, auth };
