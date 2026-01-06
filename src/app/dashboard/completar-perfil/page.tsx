'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, Loader2 } from 'lucide-react';
import Image from 'next/image';

import { compressImage } from '@/lib/imageUtils';

function FileInput({ label, setFile, preview, setPreview, name }: any) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    }
  };

  return (
    <div>
      <Label className="text-sm font-medium">{label}</Label>
      <label className="relative block w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 overflow-hidden mt-2 transition-colors">
        {preview ? (
          <Image src={preview} alt="preview" fill className="object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Upload className="h-8 w-8" />
            <span className="text-xs mt-1">Subir imagen</span>
          </div>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={handleChange} />
      </label>
    </div>
  );
}

export default function CompletarPerfilPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  const [dniFrente, setDniFrente] = useState<File | null>(null);
  const [dniDorso, setDniDorso] = useState<File | null>(null);
  const [fotoPerfil, setFotoPerfil] = useState<File | null>(null);
  
  const [previewDniFrente, setPreviewDniFrente] = useState('');
  const [previewDniDorso, setPreviewDniDorso] = useState('');
  const [previewFotoPerfil, setPreviewFotoPerfil] = useState('');

  const handleSubirDocumentos = async () => {
    if (!dniFrente || !dniDorso || !fotoPerfil) {
      toast.error('Por favor, sube todos los documentos requeridos.');
      return;
    }

    if (!user?.uid) {
        toast.error('Error de autenticación. Por favor, inicia sesión de nuevo.');
        return;
    }

    setLoading(true);

    try {
      const procesarYSubir = async (file: File, path: string, label: string) => {
        setStatusMessage(`Optimizando ${label}...`);
        const compressed = await compressImage(file);
        
        setStatusMessage(`Subiendo ${label}...`);
        const storageRef = ref(storage, path);
        const metadata = {
          cacheControl: 'public,max-age=31536000',
          contentType: 'image/jpeg'
        };
        await uploadBytes(storageRef, compressed, metadata);
        return await getDownloadURL(storageRef);
      };

      // Procesamiento CUATRO SECUENCIAL para no saturar memoria en móviles
      const dniFrenteUrl = await procesarYSubir(dniFrente, `socios/${user.uid}/dni-frente.jpg`, 'DNI Frente');
      const dniDorsoUrl = await procesarYSubir(dniDorso, `socios/${user.uid}/dni-dorso.jpg`, 'DNI Dorso');
      const fotoPerfilUrl = await procesarYSubir(fotoPerfil, `socios/${user.uid}/foto-perfil.jpg`, 'Foto Perfil');

      setStatusMessage('Guardando cambios...');
      await setDoc(doc(db, 'socios', user.uid), {
        fotoPerfil: fotoPerfilUrl,
        fotoUrl: fotoPerfilUrl,
        fotoDniFrente: dniFrenteUrl,
        fotoDniDorso: dniDorsoUrl,
        imagenesSubidas: true,
        imagenesPendientes: false,
        updatedAt: Timestamp.now()
      }, { merge: true });

      toast.success('¡Documentos subidos exitosamente!');
      router.push('/dashboard');

    } catch (error) {
      console.error('Error subiendo documentos manualmente:', error);
      toast.error('Ocurrió un error al subir los documentos. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Completa tu Perfil</CardTitle>
          <CardDescription className="text-center text-muted-foreground pt-2">
            Hubo un problema durante el registro inicial. Por favor, sube tus documentos nuevamente para activar todas las funcionalidades de tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FileInput 
              label="Foto para tu Perfil frente a la camara rostro descubierto, sin gafas y sin sombrero (tipo selfie) *"
              setFile={setFotoPerfil}
              preview={previewFotoPerfil}
              setPreview={setPreviewFotoPerfil}
            />
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

          </div>

          <Button 
            onClick={handleSubirDocumentos} 
            disabled={loading || !dniFrente || !dniDorso || !fotoPerfil}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {statusMessage || 'Subiendo...'}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Finalizar y Subir Documentos
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
