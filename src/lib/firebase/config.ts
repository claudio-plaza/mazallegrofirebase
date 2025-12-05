import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, Firestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, FirebaseStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, Functions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: 'clubzenith.firebasestorage.app', // <--- THE FIX
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);
const storage: FirebaseStorage = getStorage(app);
const functions: Functions = getFunctions(app, 'us-central1');

// Conectar a los emuladores en entorno de desarrollo
// if (process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') {
//     console.log("Usando emuladores de Firebase");
//     connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
//     connectFirestoreEmulator(db, "127.0.0.1", 8081);
//     connectFunctionsEmulator(functions, "127.0.0.1", 5001);
//     connectStorageEmulator(storage, "127.0.0.1", 9199);
// }

export { app, db, auth, storage, functions };