import * as admin from 'firebase-admin';

// This pattern ensures the Admin SDK is initialized only once.
if (!admin.apps.length) {
  console.log('[Firebase Admin] Initializing admin app...');
  admin.initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: 'clubzenith.firebasestorage.app', // Explicitly set the correct bucket name
    // The 'credential' is automatically inferred from GOOGLE_APPLICATION_CREDENTIALS
    // when running locally or from the service account in a deployed environment.
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminStorage = admin.storage(); // Export admin storage