
/**
 * Comprime una imagen en el lado del cliente manteniendo una calidad aceptable.
 * Reduce la dimensión máxima a maxDimension (default 1280px) y la calidad a quality (default 0.7).
 */
export async function compressImage(file: File, maxDimension: number = 1280, quality: number = 0.7): Promise<File> {
  return new Promise((resolve, reject) => {
    // Si no es imagen, devolver el archivo original
    if (!file.type.match(/image.*/)) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calcular nuevas dimensiones manteniendo aspecto
        if (width > height) {
          if (width > maxDimension) {
            height *= maxDimension / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width *= maxDimension / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto del canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a Blob/File
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al comprimir la imagen'));
              return;
            }
            
            // Crear nuevo archivo con el blob comprimido
            const newFile = new File([blob], file.name, {
              type: 'image/jpeg', // Forzamos JPEG para mejor compresión
              lastModified: Date.now(),
            });


            resolve(newFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}
