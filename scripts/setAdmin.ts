
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import admin from 'firebase-admin';

// The service account key is loaded from the GOOGLE_APPLICATION_CREDENTIALS environment variable
// Ensure this is set in your local environment to point to your service-account-key.json
try {
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
} catch (e) {
  console.error('Firebase Admin initialization error', e);
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

const setAdminRole = async (email: string) => {
  if (!email) {
    console.error('Error: Please provide an email address as a command-line argument.');
    process.exit(1);
  }

  try {
    // 1. Get the user by email
    console.log(`Fetching user data for: ${email}...`);
    const userRecord = await auth.getUserByEmail(email);
    const uid = userRecord.uid;
    console.log(`Successfully fetched user. UID: ${uid}`);

    // 2. Create the admin document in Firestore
    const adminData = {
      role: 'admin',
      name: userRecord.displayName || email.split('@')[0],
    };

    const adminDocRef = db.collection('adminUsers').doc(uid);
    await adminDocRef.set(adminData);

    console.log(`✅ Success! User ${email} (UID: ${uid}) has been granted 'admin' role.`);

  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.error(`Error: No user found with the email: ${email}`);
    } else {
      console.error('An unexpected error occurred:', error);
    }
    process.exit(1);
  }
};

// Get email from command line arguments
const email = process.argv[2];
setAdminRole(email);

