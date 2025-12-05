import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from './config';

const storage = getStorage(app);

/**
 * Sube un archivo a Firebase Storage y devuelve la URL de descarga.
 * @param file El archivo a subir.
 * @param path La ruta completa en el bucket donde se guardará el archivo.
 * @returns La URL de descarga del archivo.
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
};
