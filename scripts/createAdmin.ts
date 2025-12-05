import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { db } = require('../src/lib/firebase/config');
import { doc, setDoc } from 'firebase/firestore';

const createAdmin = async () => {
  const adminUid = '1aZECRemxFMdid44vJwlGuu99ts2';
  const adminData = {
    role: 'admin',
    name: 'Admin General'
  };

  try {
    // Note: The firestore functions (doc, setDoc) are ES Modules, so they are imported normally.
    // The db config is loaded using the CommonJS require.
    await setDoc(doc(db, 'adminUsers', adminUid), adminData);
    console.log(`Successfully created admin user with UID: ${adminUid}`);
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

createAdmin();
