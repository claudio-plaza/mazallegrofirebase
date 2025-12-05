'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllSocios, updateSocio } from '@/lib/firebase/firestoreService';
import type { Socio, Adherente } from '@/types';
import { EstadoSolicitudAdherente, EstadoAdherente } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Inbox, UserCheck, UserX, CheckCircle2, XCircle, Loader2, FileText, ImageOff } from 'lucide-react';
import Image from 'next/image';
import { formatDate } from '@/lib/helpers';

interface SolicitudAdherente {
  socio: Socio;
  adherente: Adherente;
}

export default function GestionSolicitudesAdherentesDashboard() {
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState('');
  const [viewingAdherente, setViewingAdherente] = useState<SolicitudAdherente | null>(null);

  const { data: socios, isLoading, isError } = useQuery<Socio[]>({
    queryKey: ['allSociosForAdherentes'],
    queryFn: getAllSocios,
  });

  const updateAdherenteMutation = useMutation({
    mutationFn: ({ socioId, updatedAdherentes }: { socioId: string; updatedAdherentes: Adherente[] }) => 
      updateSocio(socioId, { adherentes: updatedAdherentes }),
    onSuccess: () => {
      toast.success("Estado del adherente actualizado con éxito.");
      queryClient.invalidateQueries({ queryKey: ['allSociosForAdherentes'] });
    },
    onError: (error) => {
      toast.error("Error al actualizar el adherente.", { description: error.message });
    },
    onSettled: () => {
      setRejectionReason('');
    }
  });

  const allSolicitudes = useMemo((): SolicitudAdherente[] => {
    if (!socios) return [];
    const solicitudes: SolicitudAdherente[] = [];
    socios.forEach(socio => {
      socio.adherentes?.forEach(adherente => {
        solicitudes.push({ socio, adherente });
      });
    });
    return solicitudes;
  }, [socios]);

  const pendientes = allSolicitudes.filter(s => s.adherente.estadoSolicitud === EstadoSolicitudAdherente.PENDIENTE);
  const aprobadas = allSolicitudes.filter(s => s.adherente.estadoSolicitud === EstadoSolicitudAdherente.APROBADO);
  const rechazadas = allSolicitudes.filter(s => s.adherente.estadoSolicitud === EstadoSolicitudAdherente.RECHAZADO);

  const handleUpdateAdherenteStatus = (
    socio: Socio,
    adherenteId: string,
    newStatus: EstadoSolicitudAdherente,
    reason: string | null = null
  ) => {
    const adherenteToUpdate = socio.adherentes?.find(a => a.id === adherenteId);
    if (!adherenteToUpdate) return;

    const updatedAdherente: Adherente = {
      ...adherenteToUpdate,
      estadoSolicitud: newStatus,
      estadoAdherente: newStatus === EstadoSolicitudAdherente.APROBADO ? EstadoAdherente.ACTIVO : EstadoAdherente.INACTIVO,
      motivoRechazo: reason,
      ...(newStatus === EstadoSolicitudAdherente.APROBADO && { aptoMedico: adherenteToUpdate.aptoMedico || { valido: false, razonInvalidez: 'Pendiente de revisión médica inicial' } }),
    };

    const updatedAdherentesList = socio.adherentes?.map(a => a.id === adherenteId ? updatedAdherente : a) || [];
    
    updateAdherenteMutation.mutate({ socioId: socio.id, updatedAdherentes: updatedAdherentesList });
  };

  const renderSolicitudCard = (item: SolicitudAdherente, actions: 'pending' | 'none' = 'none') => {
    const { socio, adherente } = item;
    return (
      <Card key={adherente.id} className="flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border">
                <AvatarImage src={adherente.fotoPerfil as string | undefined} alt={adherente.nombre} />
                <AvatarFallback>{adherente.nombre[0]}{adherente.apellido[0]}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{adherente.nombre} {adherente.apellido}</CardTitle>
                <CardDescription>DNI: {adherente.dni}</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-grow space-y-2">
          <p className="text-sm text-muted-foreground">
            Solicitado por: <span className="font-medium text-foreground">{socio.nombre} {socio.apellido}</span> (Socio N°: {socio.numeroSocio})
          </p>
          {adherente.motivoRechazo && (
            <p className="text-sm text-destructive">
              <span className="font-semibold">Motivo:</span> {adherente.motivoRechazo}
            </p>
          )}
        </CardContent>
        {actions === 'pending' && (
          <CardFooter className="border-t pt-4 flex-wrap gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewingAdherente(item)}>
              <FileText className="mr-1.5 h-4 w-4" /> Ver Documentos
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <XCircle className="mr-1.5 h-4 w-4" /> Rechazar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Rechazar Solicitud</AlertDialogTitle>
                  <AlertDialogDescription>Especifique un motivo claro para el rechazo.</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-2">
                  <Label htmlFor={`rejection-reason-${adherente.id}`} className="sr-only">Motivo</Label>
                  <Textarea id={`rejection-reason-${adherente.id}`} placeholder="Ej: La foto de perfil no es clara..." onChange={(e) => setRejectionReason(e.target.value)} className="min-h-[80px]" />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setRejectionReason('')}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleUpdateAdherenteStatus(socio, adherente.id!, EstadoSolicitudAdherente.RECHAZADO, rejectionReason)} disabled={!rejectionReason.trim() || updateAdherenteMutation.isPending}>
                    {updateAdherenteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleUpdateAdherenteStatus(socio, adherente.id!, EstadoSolicitudAdherente.APROBADO)} disabled={updateAdherenteMutation.isPending}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Aprobar
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>No se pudieron cargar las solicitudes.</AlertDescription></Alert>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <UserPlus className="mr-3 h-6 w-6 text-primary" />
            Solicitudes de Adherentes
          </CardTitle>
          <CardDescription>
            Gestiona las solicitudes de nuevos adherentes propuestas por los socios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pendientes">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pendientes">
                Pendientes <Badge className="ml-2">{pendientes.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="aprobadas">Aprobadas</TabsTrigger>
              <TabsTrigger value="rechazadas">Rechazadas</TabsTrigger>
            </TabsList>

            <TabsContent value="pendientes" className="mt-6">
              {pendientes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><Inbox className="mx-auto h-12 w-12 mb-4 opacity-50" /><p>No hay solicitudes pendientes.</p></div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{pendientes.map(item => renderSolicitudCard(item, 'pending'))}</div>
              )}
            </TabsContent>

            <TabsContent value="aprobadas" className="mt-6">
              {aprobadas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><p>No hay solicitudes aprobadas.</p></div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{aprobadas.map(item => renderSolicitudCard(item))}</div>
              )}
            </TabsContent>

            <TabsContent value="rechazadas" className="mt-6">
              {rechazadas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><p>No hay solicitudes rechazadas.</p></div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{rechazadas.map(item => renderSolicitudCard(item))}</div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!viewingAdherente} onOpenChange={(open) => !open && setViewingAdherente(null)}>
        <DialogContent className="sm:max-w-5xl">
          {viewingAdherente && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">Verificar Datos y Documentos</DialogTitle>
                <DialogDescription>
                  Verifica que los datos cargados coincidan con los documentos del adherente.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50">
                    <div><p className="text-sm font-semibold">Nombre Completo</p><p>{viewingAdherente.adherente.nombre} {viewingAdherente.adherente.apellido}</p></div>
                    <div><p className="text-sm font-semibold">DNI</p><p>{viewingAdherente.adherente.dni}</p></div>
                    <div><p className="text-sm font-semibold">Fecha de Nacimiento</p><p>{formatDate(viewingAdherente.adherente.fechaNacimiento)}</p></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-center">Foto de Perfil</h4>
                    {viewingAdherente.adherente.fotoPerfil ? (
                      <Image src={viewingAdherente.adherente.fotoPerfil as string} alt="Foto de Perfil" width={300} height={300} className="rounded-lg border object-contain w-full" />
                    ) : (
                      <div className="h-48 flex items-center justify-center bg-muted rounded-lg text-muted-foreground"><ImageOff className="h-8 w-8 mr-2" />No disponible</div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-center">DNI Frente</h4>
                    {viewingAdherente.adherente.fotoDniFrente ? (
                      <Image src={viewingAdherente.adherente.fotoDniFrente as string} alt="DNI Frente" width={400} height={250} className="rounded-lg border object-contain w-full" />
                    ) : (
                      <div className="h-48 flex items-center justify-center bg-muted rounded-lg text-muted-foreground"><ImageOff className="h-8 w-8 mr-2" />No disponible</div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-center">DNI Dorso</h4>
                    {viewingAdherente.adherente.fotoDniDorso ? (
                      <Image src={viewingAdherente.adherente.fotoDniDorso as string} alt="DNI Dorso" width={400} height={250} className="rounded-lg border object-contain w-full" />
                    ) : (
                      <div className="h-48 flex items-center justify-center bg-muted rounded-lg text-muted-foreground"><ImageOff className="h-8 w-8 mr-2" />No disponible</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}