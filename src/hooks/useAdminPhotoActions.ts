'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { aprobarSolicitud, rechazarSolicitud } from '@/lib/firebase/solicitudesService';
import { updateSocio, getSocio } from '@/lib/firebase/firestoreService';
import { uploadFile } from '@/lib/firebase/storageService';
import { SolicitudCambioFoto } from '@/types';

export function useAdminPhotoActions() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleApprove = async (solicitud: SolicitudCambioFoto) => {
    setIsProcessing(true);
    try {
      // 1. Aprobar la solicitud (estado)
      await aprobarSolicitud(solicitud.id);

      // 2. Descargar la nueva foto desde la URL temporal
      if (!solicitud.fotoNuevaUrl) throw new Error("No hay URL de foto nueva");
      
      const response = await fetch(solicitud.fotoNuevaUrl);
      const blob = await response.blob();
      const file = new File([blob], `${solicitud.tipoFoto}.jpg`, { type: blob.type });

      // 3. Determinar la ruta de destino según el tipo de persona y foto
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
      
      // Invalidar queries para refrescar UI
      queryClient.invalidateQueries({ queryKey: ['solicitudesCambioFoto'] });
      queryClient.invalidateQueries({ queryKey: ['socios'] });
      queryClient.invalidateQueries({ queryKey: ['socio', solicitud.socioId] });

    } catch (error) {
      console.error('Error al aprobar solicitud:', error);
      toast({ title: 'Error', description: 'No se pudo aprobar la solicitud.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (solicitud: SolicitudCambioFoto, motivo: string) => {
    if (!motivo.trim()) {
      toast({ title: 'Error', description: 'Debe especificar un motivo de rechazo.', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    try {
      await rechazarSolicitud(solicitud.id, motivo);
      toast({ title: 'Solicitud Rechazada', description: 'El socio será notificado.' });
      queryClient.invalidateQueries({ queryKey: ['solicitudesCambioFoto'] });
    } catch (error) {
      console.error('Error al rechazar solicitud:', error);
      toast({ title: 'Error', description: 'No se pudo rechazar la solicitud.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    handleApprove,
    handleReject,
    isProcessing
  };
}
