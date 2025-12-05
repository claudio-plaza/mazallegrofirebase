'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getAllSolicitudes } from '@/lib/firebase/solicitudesService';
import { SolicitudCambioFoto, EstadoSolicitudCambioFoto } from '@/types';
import { FileImage, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RevisarSolicitudDialog } from './RevisarSolicitudDialog';
import { Skeleton } from '@/components/ui/skeleton';

export function RevisarSolicitudesDashboard() {
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudCambioFoto | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: solicitudes = [], isLoading } = useQuery<SolicitudCambioFoto[]>({
    queryKey: ['solicitudesCambioFoto'],
    queryFn: () => getAllSolicitudes(),
  });

  const pendientes = solicitudes.filter(s => s.estado === EstadoSolicitudCambioFoto.PENDIENTE);
  const aprobadas = solicitudes.filter(s => s.estado === EstadoSolicitudCambioFoto.APROBADA);
  const rechazadas = solicitudes.filter(s => s.estado === EstadoSolicitudCambioFoto.RECHAZADA);

  const renderSolicitud = (solicitud: SolicitudCambioFoto) => (
    <Card key={solicitud.id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              {solicitud.socioNombre} (N° {solicitud.socioNumero})
            </CardTitle>
            <CardDescription>
              {solicitud.tipoPersona} - {solicitud.tipoFoto.replace('foto', '').replace(/([A-Z])/g, ' $1').trim()}
            </CardDescription>
          </div>
          <Badge variant={
            solicitud.estado === EstadoSolicitudCambioFoto.PENDIENTE ? 'default' :
            solicitud.estado === EstadoSolicitudCambioFoto.APROBADA ? 'success' : 'destructive'
          }>
            {solicitud.estado}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <Clock className="inline h-3 w-3 mr-1" />
            Solicitado: {format(solicitud.fechaSolicitud, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
          </p>
          {solicitud.fechaRespuesta && (
            <p className="text-sm text-muted-foreground">
              Respondido: {format(solicitud.fechaRespuesta, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
            </p>
          )}
          {solicitud.motivoRechazo && (
            <p className="text-sm text-destructive">
              Motivo de rechazo: {solicitud.motivoRechazo}
            </p>
          )}
          <Button
            onClick={() => setSolicitudSeleccionada(solicitud)}
            variant={solicitud.estado === EstadoSolicitudCambioFoto.PENDIENTE ? 'default' : 'outline'}
            className="w-full mt-2"
          >
            <FileImage className="mr-2 h-4 w-4" />
            {solicitud.estado === EstadoSolicitudCambioFoto.PENDIENTE ? 'Revisar Solicitud' : 'Ver Detalles'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

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
                  <Badge className="ml-2 h-5 w-5 flex items-center justify-center p-0" variant="destructive">
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
                  {pendientes.map(renderSolicitud)}
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
                  {aprobadas.map(renderSolicitud)}
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
                  {rechazadas.map(renderSolicitud)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {solicitudSeleccionada && (
        <RevisarSolicitudDialog
          solicitud={solicitudSeleccionada}
          open={!!solicitudSeleccionada}
          onClose={() => setSolicitudSeleccionada(null)}
        />
      )}
    </>
  );
}
