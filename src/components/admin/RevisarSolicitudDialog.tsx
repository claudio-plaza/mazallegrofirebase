'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { aprobarSolicitud, rechazarSolicitud } from '@/lib/firebase/solicitudesService';
import { updateSocio, getSocio } from '@/lib/firebase/firestoreService';
import { uploadFile } from '@/lib/firebase/storageService';
import { SolicitudCambioFoto, EstadoSolicitudCambioFoto } from '@/types';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RevisarSolicitudDialogProps {
  solicitud: SolicitudCambioFoto;
  open: boolean;
  onClose: () => void;
}

export function RevisarSolicitudDialog({ solicitud, open, onClose }: RevisarSolicitudDialogProps) {
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAprobar = async () => {
    setLoading(true);
    try {
      // 1. Aprobar la solicitud
      await aprobarSolicitud(solicitud.id);

      // 2. Descargar la nueva foto desde la URL temporal
      const response = await fetch(solicitud.fotoNuevaUrl!);
      const blob = await response.blob();
      const file = new File([blob], `${solicitud.tipoFoto}.jpg`, { type: blob.type });

      // 3. Determinar la ruta de destino según el tipo de persona
      let uploadPath = '';
      if (solicitud.tipoPersona === 'Titular') {
        uploadPath = `socios/${solicitud.socioId}/${solicitud.tipoFoto}.jpg`;
      } else if (solicitud.tipoPersona === 'Familiar') {
        uploadPath = `socios/${solicitud.socioId}/familiares/${solicitud.familiarId}_${solicitud.tipoFoto.replace('foto', '').toLowerCase()}.jpg`;
      } else if (solicitud.tipoPersona === 'Adherente') {
        uploadPath = `socios/${solicitud.socioId}/adherentes/${solicitud.familiarId}_${solicitud.tipoFoto.replace('foto', '').toLowerCase()}.jpg`;
      }

      // 4. Subir la foto a la ubicación final
      const newPhotoUrl = await uploadFile(file, uploadPath);

      // 5. Actualizar el documento del socio en Firestore
      const socio = await getSocio(solicitud.socioId);
      if (!socio) throw new Error('Socio no encontrado');

      const updateData: any = {};

      if (solicitud.tipoPersona === 'Titular') {
        updateData[solicitud.tipoFoto] = newPhotoUrl;
        if (solicitud.tipoFoto === 'fotoPerfil') {
          updateData.fotoUrl = newPhotoUrl;
        }
      } else if (solicitud.tipoPersona === 'Familiar' && socio.familiares) {
        const familiarIndex = socio.familiares.findIndex(f => f.id === solicitud.familiarId);
        if (familiarIndex !== -1) {
          const updatedFamiliares = [...socio.familiares];
          updatedFamiliares[familiarIndex] = {
            ...updatedFamiliares[familiarIndex],
            [solicitud.tipoFoto]: newPhotoUrl,
          };
          updateData.familiares = updatedFamiliares;
        }
      } else if (solicitud.tipoPersona === 'Adherente' && socio.adherentes) {
        const adherenteIndex = socio.adherentes.findIndex(a => a.id === solicitud.familiarId);
        if (adherenteIndex !== -1) {
          const updatedAdherentes = [...socio.adherentes];
          updatedAdherentes[adherenteIndex] = {
            ...updatedAdherentes[adherenteIndex],
            [solicitud.tipoFoto]: newPhotoUrl,
          };
          updateData.adherentes = updatedAdherentes;
        }
      }

      await updateSocio(solicitud.socioId, updateData);

      toast({ title: 'Solicitud Aprobada', description: 'La foto ha sido actualizada correctamente.' });
      queryClient.invalidateQueries({ queryKey: ['solicitudesCambioFoto'] });
      queryClient.invalidateQueries({ queryKey: ['socios'] });
      queryClient.invalidateQueries({ queryKey: ['socio', solicitud.socioId] });

      // Refetch inmediato si existe
      queryClient.refetchQueries({ queryKey: ['socio', solicitud.socioId] });
      onClose();

      // Invalidar cache de Next.js para forzar recarga
      if (typeof window !== 'undefined') {
        // Recargar la página después de 500ms para que se vean los cambios
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      console.error('Error al aprobar solicitud:', error);
      toast({ title: 'Error', description: 'No se pudo aprobar la solicitud', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRechazar = async () => {
    if (!motivoRechazo.trim()) {
      toast({ title: 'Error', description: 'Debe especificar un motivo de rechazo', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await rechazarSolicitud(solicitud.id, motivoRechazo);
      toast({ title: 'Solicitud Rechazada', description: 'El socio será notificado.' });
      queryClient.invalidateQueries({ queryKey: ['solicitudesCambioFoto'] });
      onClose();
    } catch (error) {
      console.error('Error al rechazar solicitud:', error);
      toast({ title: 'Error', description: 'No se pudo rechazar la solicitud', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const esPendiente = solicitud.estado === EstadoSolicitudCambioFoto.PENDIENTE;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {esPendiente ? 'Revisar Solicitud' : 'Detalle de Solicitud'} - {solicitud.socioNombre}
          </DialogTitle>
          <DialogDescription>
            {solicitud.tipoPersona} - {solicitud.tipoFoto.replace('foto', '').replace(/([A-Z])/g, ' $1').trim()}
          </DialogDescription>
        </DialogHeader>

        {!esPendiente && (
          <Alert variant={solicitud.estado === EstadoSolicitudCambioFoto.APROBADA ? 'default' : 'destructive'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Esta solicitud ya fue {solicitud.estado.toLowerCase()}
              {solicitud.motivoRechazo && `: ${solicitud.motivoRechazo}`}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label className="text-lg font-semibold">Foto Actual</Label>
            <div className="mt-2 border rounded-lg overflow-hidden bg-muted">
              {solicitud.fotoActualUrl ? (
                <Image
                  src={solicitud.fotoActualUrl}
                  alt="Foto actual"
                  width={400}
                  height={400}
                  className="w-full h-auto object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  Sin foto previa
                </div>
              )}
            </div>
          </div>

          <div>
            <Label className="text-lg font-semibold">Foto Nueva (Solicitada)</Label>
            <div className="mt-2 border rounded-lg overflow-hidden bg-muted">
              {solicitud.fotoNuevaUrl ? (
                <Image
                  src={solicitud.fotoNuevaUrl}
                  alt="Foto nueva"
                  width={400}
                  height={400}
                  className="w-full h-auto object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-destructive">
                  Error: Sin foto nueva
                </div>
              )}
            </div>
          </div>
        </div>

        {esPendiente && (
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="motivo">Motivo de Rechazo (opcional)</Label>
              <Textarea
                id="motivo"
                placeholder="Ej: La foto está borrosa, no se ve el rostro completo..."
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {esPendiente ? 'Cancelar' : 'Cerrar'}
          </Button>
          {esPendiente && (
            <>
              <Button variant="destructive" onClick={handleRechazar} disabled={loading}>
                <XCircle className="mr-2 h-4 w-4" />
                {loading ? 'Rechazando...' : 'Rechazar'}
              </Button>
              <Button onClick={handleAprobar} disabled={loading}>
                <CheckCircle className="mr-2 h-4 w-4" />
                {loading ? 'Aprobando...' : 'Aprobar y Actualizar Foto'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
