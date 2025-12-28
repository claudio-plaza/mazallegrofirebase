import { NextResponse } from 'next/server';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { encrypt } from '@/lib/crypto';
import { adminAuth } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    // ✅ Validar autenticación
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse('Unauthorized: No token provided', { status: 401 });
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    try {
      await adminAuth.verifyIdToken(idToken);
    } catch (authError) {
      return new NextResponse('Unauthorized: Invalid token', { status: 401 });
    }

    if (!storage) {
      throw new Error("Firebase Storage not initialized.");
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const path = formData.get('path') as string | null;

    if (!file) {
      return new NextResponse('No file found in the request.', { status: 400 });
    }
    if (!path) {
        return new NextResponse('No path found in the request.', { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const encryptedBuffer = encrypt(buffer);

    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, encryptedBuffer);
    const downloadURL = await getDownloadURL(storageRef);

    return NextResponse.json({ downloadURL });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return new NextResponse('Error uploading file.', { status: 500 });
  }
}

