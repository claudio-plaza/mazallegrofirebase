'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAllSolicitudes } from '@/lib/firebase/solicitudesService';
import { SolicitudCambioFoto, EstadoSolicitudCambioFoto } from '@/types';
import { CheckCircle, FileImage } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PhotoChangeCard } from './PhotoChangeCard';
import { useAdminPhotoActions } from '@/hooks/useAdminPhotoActions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';

export function RevisarSolicitudesDashboard() {
  const { data: solicitudes = [], isLoading } = useQuery<SolicitudCambioFoto[]>({
    queryKey: ['solicitudesCambioFoto'],
    queryFn: () => getAllSolicitudes(),
  });

  const { handleApprove, handleReject, isProcessing } = useAdminPhotoActions();

  // Estado para el diálogo de rechazo
  const [solicitudToReject, setSolicitudToReject] = useState<SolicitudCambioFoto | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const pendientes = solicitudes.filter(s => s.estado === EstadoSolicitudCambioFoto.PENDIENTE);
  const aprobadas = solicitudes.filter(s => s.estado === EstadoSolicitudCambioFoto.APROBADA);
  const rechazadas = solicitudes.filter(s => s.estado === EstadoSolicitudCambioFoto.RECHAZADA);

  const onConfirmReject = () => {
    if (solicitudToReject && rejectionReason) {
      handleReject(solicitudToReject, rejectionReason);
      setSolicitudToReject(null);
      setRejectionReason('');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <FileImage className="mr-3 h-6 w-6 text-primary" />
            Solicitudes de Cambio de Foto
          </CardTitle>
          <CardDescription>
            Revisa y aprueba las solicitudes de cambio de fotos de los socios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pendientes">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pendientes" className="relative">
                Pendientes
                {pendientes.length > 0 && (
                  <Badge className="ml-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white">
                    {pendientes.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="aprobadas">Aprobadas ({aprobadas.length})</TabsTrigger>
              <TabsTrigger value="rechazadas">Rechazadas ({rechazadas.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pendientes" className="mt-6">
              {pendientes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No hay solicitudes pendientes</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pendientes.map(solicitud => (
                    <PhotoChangeCard 
                      key={solicitud.id} 
                      solicitud={solicitud} 
                      onApprove={handleApprove}
                      onReject={(s) => setSolicitudToReject(s)}
                      isProcessing={isProcessing}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="aprobadas" className="mt-6">
              {aprobadas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No hay solicitudes aprobadas</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {aprobadas.map(solicitud => (
                    <PhotoChangeCard 
                      key={solicitud.id} 
                      solicitud={solicitud} 
                      onApprove={() => {}} // Ya aprobadas
                      onReject={() => {}}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="rechazadas" className="mt-6">
              {rechazadas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No hay solicitudes rechazadas</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                   {rechazadas.map(solicitud => (
                    <PhotoChangeCard 
                      key={solicitud.id} 
                      solicitud={solicitud} 
                      onApprove={() => {}}
                      onReject={() => {}} 
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AlertDialog open={!!solicitudToReject} onOpenChange={(open) => !open && setSolicitudToReject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar Solicitud</AlertDialogTitle>
            <AlertDialogDescription>
              Por favor indica el motivo del rechazo para que el socio pueda corregirlo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
             <Textarea 
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ej: Foto borrosa, rostro no visible..."
             />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmReject} disabled={!rejectionReason.trim() || isProcessing}>
              {isProcessing ? 'Procesando...' : 'Confirmar Rechazo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
