'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase/config';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { compressImage } from '@/lib/imageUtils';

function FileInput({ label, setFile, preview, setPreview }: any) {
  const MAX_FILE_SIZE_MB = 10;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      // Validar tipo de archivo
      if (!ALLOWED_TYPES.includes(f.type)) {
        toast.error('Formato no válido. Solo se permiten archivos JPG o PNG.');
        e.target.value = ''; // Limpiar el input
        return;
      }

      // Validar tamaño de archivo
      if (f.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`El archivo es demasiado grande. Tamaño máximo: ${MAX_FILE_SIZE_MB}MB.`);
        e.target.value = ''; // Limpiar el input
        return;
      }

      setFile(f);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    }
  };

  return (
    <div>
      <Label className="text-base font-medium">{label}</Label>
      <label className="relative block w-full h-40 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 overflow-hidden mt-2 transition-colors">
        {preview ? (
          <Image src={preview} alt="preview" fill className="object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Upload className="h-10 w-10 mb-2" />
            <span className="text-sm font-medium">Click para subir</span>
            <span className="text-xs mt-1">JPG, PNG (máx. 10MB)</span>
          </div>
        )}
        <input type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={handleChange} />
      </label>
    </div>
  );
}

export default function SubirDocumentosPage() {
  const { user, socio, isLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [dniFrente, setDniFrente] = useState<File | null>(null);
  const [dniDorso, setDniDorso] = useState<File | null>(null);
  const [fotoPerfil, setFotoPerfil] = useState<File | null>(null);
  const [fotoCarnet, setFotoCarnet] = useState<File | null>(null);
  
  const [previewDniFrente, setPreviewDniFrente] = useState('');
  const [previewDniDorso, setPreviewDniDorso] = useState('');
  const [previewFotoPerfil, setPreviewFotoPerfil] = useState('');
  const [previewFotoCarnet, setPreviewFotoCarnet] = useState('');

  // ✅ Si ya tiene documentos completos, redirigir al dashboard
  useEffect(() => {
    if (socio?.documentosCompletos === true) {
      router.push('/dashboard');
    }
  }, [socio, router]);

  // ✅ Si está cargando, mostrar spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  const handleSubirDocumentos = async () => {
    if (!dniFrente || !dniDorso || !fotoPerfil) {
      toast.error('Por favor, sube los 3 documentos requeridos.');
      return;
    }

    if (!user?.uid) return;

    setLoading(true);

    try {
      // 1. Fase de Compresión
      toast.info('Optimizando imágenes para subida rápida...', { id: 'upload', duration: Infinity });
      
      const compressWithFallback = async (file: File) => {
        try {
          // Comprimir a max 1280px y calidad 0.8
          return await compressImage(file, 1280, 0.8);
        } catch (e) {
          return file;
        }
      };

      const [compressedDniFrente, compressedDniDorso, compressedFotoPerfil] = await Promise.all([
        compressWithFallback(dniFrente),
        compressWithFallback(dniDorso),
        compressWithFallback(fotoPerfil)
      ]);

      let compressedFotoCarnet = null;
      if (fotoCarnet) {
        compressedFotoCarnet = await compressWithFallback(fotoCarnet);
      }

      // 2. Fase de Subida
      toast.loading('Subiendo documentos...', { id: 'upload' });

      const subirImagen = async (file: File, path: string) => {
        const storageRef = ref(storage, path);
        // Añadir metadata para caché
        const metadata = {
          cacheControl: 'public,max-age=31536000',
          contentType: file.type || 'image/jpeg',
        };
        await uploadBytes(storageRef, file, metadata);
        return await getDownloadURL(storageRef);
      };

      const uploads = [
        subirImagen(compressedDniFrente, `socios/${user.uid}/dni-frente.jpg`),
        subirImagen(compressedDniDorso, `socios/${user.uid}/dni-dorso.jpg`),
        subirImagen(compressedFotoPerfil, `socios/${user.uid}/foto-perfil.jpg`),
      ];

      if (compressedFotoCarnet) {
        uploads.push(subirImagen(compressedFotoCarnet, `socios/${user.uid}/foto-carnet.jpg`));
      }

      const [dniFrenteUrl, dniDorsoUrl, fotoPerfilUrl, fotoCarnetUrl] = await Promise.all(uploads);

      const dataToUpdate: any = {
        fotoPerfil: fotoPerfilUrl,
        fotoUrl: fotoPerfilUrl,
        fotoDniFrente: dniFrenteUrl,
        fotoDniDorso: dniDorsoUrl,
        documentosCompletos: true,
        updatedAt: Timestamp.now()
      };

      if (fotoCarnetUrl) {
        dataToUpdate.fotoCarnet = fotoCarnetUrl;
      }

      await setDoc(doc(db, 'socios', user.uid), dataToUpdate, { merge: true });

      toast.success('¡Documentos subidos exitosamente!', { id: 'upload' });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      window.location.href = '/dashboard';

    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al subir documentos. Intenta nuevamente o verifica tu conexión.', { id: 'upload' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold">
            Para Crear tu Cuenta, Carga tus Documentos
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Solo falta este último paso para completar tu registro. Sube las imágenes de tus documentos.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FileInput 
              label="DNI Frente *"
              setFile={setDniFrente}
              preview={previewDniFrente}
              setPreview={setPreviewDniFrente}
            />
            <FileInput 
              label="DNI Dorso *"
              setFile={setDniDorso}
              preview={previewDniDorso}
              setPreview={setPreviewDniDorso}
            />
            <FileInput 
              label="Foto para tu perfil (De frente, mirando la camara. Rostro descubierto, sin lentes ni sombreros, tipo selfie) *"
              setFile={setFotoPerfil}
              preview={previewFotoPerfil}
              setPreview={setPreviewFotoPerfil}
            />
            <FileInput 
              label="Foto del carnet sindical si corresponde"
              setFile={setFotoCarnet}
              preview={previewFotoCarnet}
              setPreview={setPreviewFotoCarnet}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>
                Una vez que subas tus documentos, podrás acceder a tu panel de socio y disfrutar de todos los beneficios del club.
              </span>
            </p>
          </div>

          <Button 
            onClick={handleSubirDocumentos} 
            disabled={loading || !dniFrente || !dniDorso || !fotoPerfil}
            className="w-full bg-orange-500 hover:bg-orange-600"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Subiendo Documentos...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                Completar Registro
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            * Los campos con asterisco son obligatorios
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
