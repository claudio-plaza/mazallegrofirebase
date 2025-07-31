import admin from 'firebase-admin';
import sharp from 'sharp';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { onObjectFinalized } from 'firebase-functions/v2/storage';

// Inicializa Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

const THUMB_MAX_WIDTH = 200;
const THUMB_MAX_HEIGHT = 200;
const PROFILE_MAX_WIDTH = 800;
const PROFILE_MAX_HEIGHT = 800;
const OPTIMIZED_QUALITY = 80; // Calidad para JPEG/WebP

export const generateOptimizedImages = onObjectFinalized(async (event) => {
  const object = event.data;
  const fileBucket = object.bucket;
  const filePath = object.name;
  const contentType = object.contentType;
  const metageneration = object.metageneration;

  if (!filePath || !contentType || !contentType.startsWith('image/')) {
    console.log('This is not an image or no file path. Exiting.');
    return null;
  }

  const fileName = path.basename(filePath);
  const fileDir = path.dirname(filePath);
  const tempFilePath = path.join(os.tmpdir(), fileName);
  const bucket = admin.storage().bucket(fileBucket);

  if (metageneration === 1) {
    console.log('This is a new upload.');
  } else {
    console.log('This is a metadata change or other event. Exiting.');
    return null;
  }

  if (fileName.startsWith('thumb_') || fileName.startsWith('profile_')) {
    console.log('Already a processed image. Exiting.');
    return null;
  }

  await bucket.file(filePath).download({ destination: tempFilePath });
  console.log('Image downloaded locally to', tempFilePath);

  const sizesToGenerate = [
    { suffix: 'thumb', width: THUMB_MAX_WIDTH, height: THUMB_MAX_HEIGHT },
    { suffix: 'profile', width: PROFILE_MAX_WIDTH, height: PROFILE_MAX_HEIGHT },
  ];

  const uploadedUrls: { [key: string]: string } = {};

  for (const size of sizesToGenerate) {
    const outputFileName = `${size.suffix}_${fileName}`;
    const outputFilePath = path.join(fileDir, outputFileName);
    const tempOutputFilePath = path.join(os.tmpdir(), outputFileName);

    try {
      await sharp(tempFilePath)
        .resize(size.width, size.height, { fit: sharp.fit.inside, withoutEnlargement: true })
        .toFormat('jpeg', { quality: OPTIMIZED_QUALITY })
        .toFile(tempOutputFilePath);

      console.log(`Generated ${size.suffix} image to`, tempOutputFilePath);

      await bucket.upload(tempOutputFilePath, {
        destination: outputFilePath,
        metadata: {
          contentType: 'image/jpeg',
          cacheControl: 'public, max-age=31536000',
        },
      });
      console.log(`Uploaded ${size.suffix} image to`, outputFilePath);

      const [url] = await bucket.file(outputFilePath).getSignedUrl({
        action: 'read',
        expires: '03-09-2491',
      });
      uploadedUrls[size.suffix] = url;

    } catch (error) {
      console.error(`Failed to process or upload ${size.suffix} image:`, error);
    } finally {
      if (fs.existsSync(tempOutputFilePath)) {
        fs.unlinkSync(tempOutputFilePath);
      }
    }
  }

  if (fs.existsSync(tempFilePath)) {
    fs.unlinkSync(tempFilePath);
  }

  const parts = filePath.split('/');
  if (parts.length >= 2 && parts[0] === 'socios') {
    const socioId = parts[1];
    const updateData: { [key: string]: string } = {};

    if (uploadedUrls.profile) {
      updateData.fotoUrl = uploadedUrls.profile;
      updateData.fotoPerfil = uploadedUrls.profile;
    }

    if (Object.keys(updateData).length > 0) {
      try {
        await db.collection('socios').doc(socioId).update(updateData);
        console.log(`Firestore document for socio ${socioId} updated with new image URLs.`);
      } catch (error) {
        console.error(`Failed to update Firestore for socio ${socioId}:`, error);
      }
    }
  } else {
    console.log('File path does not match expected socios pattern. Not updating Firestore.');
  }

  return null;
});
