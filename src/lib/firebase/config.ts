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
// Your Firebase project credentials are now managed in the `.env` 
// file at the root of your project. This is a more secure practice.
//
// HOW TO GET YOUR CONFIG:
// 1. Open your Firebase project console.
// 2. Go to Project Settings -> General tab.
// 3. Under "Your apps", find your web app and click the "SDK setup and configuration" button.
// 4. Copy the config object and paste its values into the `.env` file at the root of this project.
//
// =================================================================
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
// =================================================================
// =================================================================

// This check warns you if the placeholder values in your .env file haven't been replaced.
// The app will run, but Firebase services will not work until you provide your own config.
const configValues = Object.values(firebaseConfig);
if (configValues.some(value => !value || (typeof value === 'string' && value.includes('your-project-id')))) {
  console.warn("\n\n*** FIREBASE CONFIG WARNING ***\nYou are using placeholder Firebase credentials. The app will run, but Firebase features like login and data storage will not work.\nPlease update your Firebase configuration in the '.env' file.\nSee the comments in 'src/lib/firebase/config.ts' for instructions.\n\n");
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
