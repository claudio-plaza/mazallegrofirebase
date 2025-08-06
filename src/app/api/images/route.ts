
import { NextResponse } from 'next/server';
import { storage } from '@/lib/firebase/config';
import { ref, getBytes } from 'firebase/storage';
import { decrypt } from '@/lib/crypto';
import { lookup } from 'mime-types';

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const imagePath = params?.path?.join('/');
    if (!imagePath) {
      return new NextResponse('Image path is required', { status: 400 });
    }

    if (!storage) {
      return new NextResponse('Firebase storage is not initialized', { status: 500 });
    }

    const storageRef = ref(storage, imagePath);
    const encryptedBytes = await getBytes(storageRef);
    const encryptedBuffer = Buffer.from(encryptedBytes);

    const decryptedBuffer = decrypt(encryptedBuffer);

    const mimeType = lookup(imagePath) || 'application/octet-stream';

    return new NextResponse(decryptedBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error(`Failed to fetch or decrypt image: ${error.message}`)
    // Handle specific errors, e.g., not found
    if (error.code === 'storage/object-not-found') {
      return new NextResponse('Image not found', { status: 404 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
