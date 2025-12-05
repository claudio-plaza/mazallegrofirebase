
import admin from 'firebase-admin';
import type { SearchIndex, SearchClient } from "algoliasearch";
import { defineString } from 'firebase-functions/params';
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin SDK ONCE in the global scope
admin.initializeApp();

// Define params right away, but their .value() will only be called inside the getter
const ALGOLIA_APP_ID = defineString('ALGOLIA_APP_ID');
const ALGOLIA_API_KEY = defineString('ALGOLIA_API_KEY');
const ALGOLIA_INDEX_NAME = "socios";

// Singleton instances
let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;
let algoliaClient: SearchClient | null = null;
let algoliaIndex: SearchIndex | null = null;

/**
 * Lazily initializes and returns the Firestore database instance.
 */
export function getDb(): admin.firestore.Firestore {
  if (!db) {
    db = admin.firestore();
  }
  return db;
}

/**
 * Lazily initializes and returns the Algolia search index instance.
 * Handles client and index initialization on the first call.
 */
export function getAlgoliaIndex(): SearchIndex {
  if (!algoliaIndex) {
    // Using require here is a common pattern in Cloud Functions for lazy loading
    const algoliasearch = require("algoliasearch");
    
    const appId = ALGOLIA_APP_ID.value();
    const apiKey = ALGOLIA_API_KEY.value();

    if (!appId || !apiKey) {
      logger.error("Algolia environment variables not set. Ensure ALGOLIA_APP_ID and ALGOLIA_API_KEY are configured.");
      throw new Error("Application is not configured correctly for search.");
    }

    algoliaClient = algoliasearch(appId, apiKey);
    algoliaIndex = algoliaClient!.initIndex(ALGOLIA_INDEX_NAME);
    logger.info("Algolia client and index initialized.");
  }
  
  return algoliaIndex;
}

/**
 * Lazily initializes and returns the Firebase Auth instance.
 */
export function getAuth(): admin.auth.Auth {
    if (!auth) {
        auth = admin.auth();
    }
    return auth;
}

/**
 * Lazily initializes and returns the Firebase Storage instance.
 */
let storage: admin.storage.Storage;
export function getStorage(): admin.storage.Storage {
    if (!storage) {
        storage = admin.storage();
    }
    return storage;
}
