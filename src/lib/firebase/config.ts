// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// =================================================================
// =================================================================
// CRITICAL STEP: CONFIGURE YOUR FIREBASE PROJECT
// =================================================================
// =================================================================
//
// To publish your app, you MUST replace the placeholder values below
// with the configuration from your own Firebase project.
//
// HOW TO GET YOUR CONFIG:
// 1. Go to your Firebase project console: https://console.firebase.google.com/
// 2. In the top-left, click the gear icon (Project settings).
// 3. Under the "General" tab, scroll down to the "Your apps" section.
// 4. Find your web app (or create one if you haven't).
// 5. Select the "Config" option (</> icon).
// 6. Copy the entire 'firebaseConfig' object and paste it here, replacing the object below.
//
// =================================================================
const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_YOUR_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_APP_ID",
};
// =================================================================
// =================================================================

// This check ensures you've replaced the placeholder values.
// The app will not start until you provide your own Firebase config.
const configValues = Object.values(firebaseConfig);
if (configValues.some(value => value.startsWith('REPLACE_WITH_YOUR_'))) {
  throw new Error("\n\n*** CRITICAL ERROR ***\nPlease replace the placeholder Firebase configuration in 'src/lib/firebase/config.ts' before running the application.\nSee the comments in that file for instructions.\n\n");
}

// Initialize Firebase only if it hasn't been initialized yet
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with in-memory cache and point to the correct DB.
// This resolves the "client is offline" errors by connecting to the named 'allegro-db' database.
const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
}, "allegro-db");

const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };
