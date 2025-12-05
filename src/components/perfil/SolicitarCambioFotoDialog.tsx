'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { crearSolicitudCambioFoto } from '@/lib/firebase/solicitudesService';
import { TipoFotoSolicitud } from '@/types';
import { Loader2, Camera, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query'; // Import useQuery
import { getPendingSolicitudCambioFoto } from '@/lib/firebase/solicitudesService'; // Import new function

interface SolicitarCambioFotoDialogProps {
  socioId: string;
  socioNombre: string;
  socioNumero: string;
  tipoPersona: 'Titular' | 'Familiar' | 'Adherente';
  familiarId?: string;
  fotoActualUrl?: string | null;
  tipoFotoInicial?: TipoFotoSolicitud;
  trigger?: React.ReactNode;
}

export function SolicitarCambioFotoDialog({
  socioId,
  socioNombre,
  socioNumero,
  tipoPersona,
  familiarId,
  fotoActualUrl,
  tipoFotoInicial,
  trigger,
}: SolicitarCambioFotoDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tipoFoto, setTipoFoto] = useState<TipoFotoSolicitud>(tipoFotoInicial || TipoFotoSolicitud.FOTO_PERFIL);
  const { toast } = useToast();

  // React Query para verificar solicitudes pendientes
  const { data: pendingRequest, isLoading: isLoadingPendingRequest } = useQuery({
    queryKey: ['pendingSolicitudCambioFoto', socioId, tipoFoto],
    queryFn: () => getPendingSolicitudCambioFoto(socioId, tipoFoto),
    enabled: !!socioId && !!tipoFoto && open, // Solo habilitar si hay socioId, tipo de foto seleccionado y el modal está abierto
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'Error', description: 'El archivo no debe superar 5MB', variant: 'destructive' });
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast({ title: 'Error', description: 'Debe seleccionar una foto', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await crearSolicitudCambioFoto(
        {
          socioId,
          socioNombre,
          socioNumero,
          tipoPersona,
          familiarId,
          tipoFoto,
          fotoActualUrl: fotoActualUrl || null,
        },
        selectedFile
      );

      toast({ title: 'Solicitud Enviada', description: 'Tu solicitud de cambio de foto será revisada por un administrador.' });
      setOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error al crear solicitud:', error);
      toast({ title: 'Error', description: 'No se pudo enviar la solicitud', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isLoadingPendingRequest ? (
          <Button variant="outline" size="sm" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...
          </Button>
        ) : pendingRequest ? (
          <Button variant="outline" size="sm" disabled>
            <AlertCircle className="mr-2 h-4 w-4" /> Solicitud pendiente
          </Button>
        ) : (
          trigger || (
            <Button variant="outline" size="sm">
              <Camera className="mr-2 h-4 w-4" />
              Solicitar cambio de foto
            </Button>
          )
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" aria-describedby="dialog-description">
        <DialogHeader>
          <DialogTitle>Solicitar Cambio de Foto</DialogTitle>
          <DialogDescription id="dialog-description">
            Selecciona el tipo de foto y sube la nueva imagen. Un administrador revisará tu solicitud.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="tipoFoto">Tipo de Foto</Label>
            <Select value={tipoFoto} onValueChange={(value) => setTipoFoto(value as TipoFotoSolicitud)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TipoFotoSolicitud.FOTO_PERFIL}>Foto de Perfil</SelectItem>
                <SelectItem value={TipoFotoSolicitud.FOTO_DNI_FRENTE}>DNI Frente</SelectItem>
                <SelectItem value={TipoFotoSolicitud.FOTO_DNI_DORSO}>DNI Dorso</SelectItem>
                <SelectItem value={TipoFotoSolicitud.FOTO_CARNET}>Foto Carnet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="foto">Nueva Foto</Label>
            <Input id="foto" type="file" accept="image/png,image/jpeg" onChange={handleFileChange} />
          </div>

          {previewUrl && (
            <div className="border rounded p-4">
              <Label>Vista Previa:</Label>
              <Image src={previewUrl} alt="Preview" width={200} height={200} className="mt-2 rounded object-cover" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedFile}>
            {loading ? 'Enviando...' : 'Enviar Solicitud'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
