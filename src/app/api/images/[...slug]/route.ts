import { NextResponse } from 'next/server';
import { adminStorage } from '../../../../lib/firebase/admin';
import { lookup } from 'mime-types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { slug: string[] } }
) {
  const imagePath = params.slug.join('/');
  console.log('[API/IMAGES] Checking for file at path:', imagePath); // DEBUGGING

  try {
    const bucket = adminStorage.bucket();
    const file = bucket.file(imagePath);

    const [exists] = await file.exists();
    if (!exists) {
      return new NextResponse('Image not found in storage', { status: 404 });
    }

    const [metadata] = await file.getMetadata();
    const contentType = metadata.contentType || lookup(imagePath) || 'application/octet-stream';
    const contentLength = metadata.size;

    const fileStream = file.createReadStream();

    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => {
          controller.enqueue(chunk);
        });
        fileStream.on('end', () => {
          controller.close();
        });
        fileStream.on('error', (err) => {
          console.error('[API/IMAGES] Stream error:', err);
          controller.error(err);
        });
      },
    });

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    if (contentLength) {
      headers.set('Content-Length', String(contentLength));
    }
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Content-Disposition', `inline; filename="${params.slug[params.slug.length - 1]}"`);


    return new NextResponse(webStream, {
      status: 200,
      headers,
    });

  } catch (error: any) {
    if (error.code === 404) {
        return new NextResponse('Image not found via catch', { status: 404 });
    }
    console.error(`[API/IMAGES] Failed to fetch image: ${imagePath}`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
