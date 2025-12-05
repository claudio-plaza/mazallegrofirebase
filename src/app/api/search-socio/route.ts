import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  console.log('[API Search] ===== REQUEST START =====');
  
  try {
    console.log('[API Search] Step 1: Loading Algolia vars');
    const APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
    const SEARCH_ONLY_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY;
    console.log('[API Search] Step 1 OK - Vars:', { APP_ID: !!APP_ID, SEARCH_ONLY_KEY: !!SEARCH_ONLY_KEY });

    if (!APP_ID || !SEARCH_ONLY_KEY) {
      console.error('[API Search] ERROR: Missing Algolia vars');
      return NextResponse.json({ message: 'Search not configured' }, { status: 500 });
    }

    console.log('[API Search] Step 2: Importing algoliasearch');
    // Using createRequire for robust CJS module import in ESM context
    const { createRequire } = require('node:module');
    const customRequire = createRequire(import.meta.url);
    const algoliasearch = customRequire('algoliasearch');
    console.log('[API Search] Step 2 OK - algoliasearch imported');

    console.log('[API Search] Step 3: Initializing Algolia client');
    const client = algoliasearch(APP_ID, SEARCH_ONLY_KEY);
    const index = client.initIndex('socios');
    console.log('[API Search] Step 3 OK - Client initialized');

    console.log('[API Search] Step 4: Parsing request body');
    const { searchTerm } = await request.json();
    console.log('[API Search] Step 4 OK - searchTerm:', searchTerm);

    if (!searchTerm) {
      return NextResponse.json({ results: [] });
    }

    console.log('[API Search] Step 5: Checking auth');
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      console.error('[API Search] ERROR: No auth token');
      return NextResponse.json({ message: 'No auth' }, { status: 401 });
    }
    console.log('[API Search] Step 5 OK - Token present');

    console.log('[API Search] Step 6: Verifying token');
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    console.log('[API Search] Step 6 OK - Token verified for user:', decodedToken.uid);

    console.log('[API Search] Step 7: Getting user role');
    const adminUserDoc = await adminDb.collection('adminUsers').doc(decodedToken.uid).get();
    const userRole = adminUserDoc.data();
    console.log('[API Search] Step 7 OK - Role:', userRole?.role);

    if (!userRole || !['admin', 'medico', 'portero'].includes(userRole.role)) {
      console.error('[API Search] ERROR: Unauthorized role:', userRole?.role);
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    console.log('[API Search] Step 8: Searching Algolia');
    const { hits } = await index.search(searchTerm, { hitsPerPage: 10 });
    console.log('[API Search] Step 8 OK - Hits:', hits.length);

    console.log('[API Search] ===== REQUEST SUCCESS =====');
    return NextResponse.json({ results: hits });

  } catch (error: any) {
    console.error('[API Search] ===== REQUEST FAILED =====');
    console.error('[API Search] Error type:', error?.constructor?.name);
    console.error('[API Search] Error message:', error?.message);
    console.error('[API Search] Error stack:', error?.stack);
    
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: error?.message || 'Unknown error',
        type: error?.constructor?.name
      },
      { status: 500 }
    );
  }
}
