
import imageCompression from 'browser-image-compression';

/**
 * Comprime una imagen en el lado del cliente manteniendo una calidad aceptable.
 * Utiliza 'browser-image-compression' para mejor manejo de memoria y EXIF.
 * @param file Archivo a comprimir
 * @param maxDimension Dimensión máxima (ancho o alto)
 * @param quality Calidad (0 a 1)
 */
export async function compressImage(file: File, maxDimension: number = 1200, quality: number = 0.6): Promise<File> {
  // Si no es imagen, devolver el archivo original
  if (!file.type.match(/image.*/)) {
    return file;
  }

  const options = {
    maxSizeMB: 0.8, // Bajamos un poco para asegurar éxito en móviles
    maxWidthOrHeight: maxDimension,
    useWebWorker: true, // Importante para no congelar la UI
    initialQuality: quality,
    fileType: 'image/jpeg', // Unificar a JPEG
  };

  try {
    // Timeout de seguridad de 30 segundos
    const compressionPromise = imageCompression(file, options);
    
    // Wrapper para timeout
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Tiempo de espera agotado al comprimir imagen')), 30000)
    );

    const compressedFile = await Promise.race([compressionPromise, timeoutPromise]);
    
    // Si por alguna razón la librería devuelve un Blob en lugar de File (raro pero posible en ver antiguas)
    if (!(compressedFile instanceof File)) {
       return new File([compressedFile], file.name, { 
         type: 'image/jpeg',
         lastModified: Date.now() 
       });
    }

    return compressedFile;

  } catch (error) {
    console.error('Error comprimiendo imagen con browser-image-compression:', error);
    // Fallback: devolver el original si falla algo (mejor subir pesado que no subir)
    return file;
  }
}

