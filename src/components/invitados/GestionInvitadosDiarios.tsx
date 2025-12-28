
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { SolicitudInvitadosDiarios, InvitadoDiario } from '@/types';
import { solicitudInvitadosDiariosSchema, EstadoSolicitudInvitados } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, generateId } from '@/lib/helpers';
import { PlusCircle, Trash2, Users, Info, CalendarDays, Send, Edit, ListChecks, Clock, ChevronUp, ChevronDown, Plus, X, UserPlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, formatISO, parseISO, isValid, addDays, isBefore, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getSolicitudInvitadosDiarios, addOrUpdateSolicitudInvitadosDiarios } from '@/lib/firebase/firestoreService';
import { db } from '@/lib/firebase/config';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionAlertDialog, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { collection, getDocs, doc, getDoc, deleteDoc, writeBatch, Timestamp, increment } from 'firebase/firestore';

interface InvitadoFrecuente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: Date;
  ultimoUso?: Date;
  vecesUsado: number;
}

const createDefaultInvitado = (): InvitadoDiario => ({
  id: generateId(),
  nombre: '',
  apellido: '',
  dni: '',
  fechaNacimiento: new Date(),
  ingresado: false,
  metodoPago: null,
  aptoMedico: null
});

export function GestionInvitadosDiarios() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { toast } = useToast();
  const { loggedInUserNumeroSocio, userName, isLoading: authIsLoading, user } = useAuth();
  const [maxBirthDate, setMaxBirthDate] = useState<string>('');
  const [minSelectableDate, setMinSelectableDate] = useState<string>('');
  const [maxSelectableDate, setMaxSelectableDate] = useState<string>('');
  const queryClient = useQueryClient();
  const [invitadosFrecuentes, setInvitadosFrecuentes] = useState<InvitadoFrecuente[]>([]);
  const [mostrarFrecuentes, setMostrarFrecuentes] = useState(true);

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  useEffect(() => {
    setMaxBirthDate(format(new Date(), 'yyyy-MM-dd'));
    setMinSelectableDate(format(today, 'yyyy-MM-dd'));
    setMaxSelectableDate(format(addDays(today, 5), 'yyyy-MM-dd'));
  }, [today]);

  const selectedDateISO = useMemo(() => formatISO(selectedDate, { representation: 'date' }), [selectedDate]);
  
  const { data: solicitudActual, isLoading: loading } = useQuery({
      queryKey: ['solicitudInvitados', user?.uid, selectedDateISO],
      queryFn: () => getSolicitudInvitadosDiarios(user!.uid, selectedDateISO),
      enabled: !!user && !authIsLoading,
  });

  useEffect(() => {
    const cargarInvitadosFrecuentes = async () => {
      if (!user) return;
      try {
        const frecuentesRef = collection(db, 'socios', user.uid, 'invitados_frecuentes');
        const frecuentesSnap = await getDocs(frecuentesRef);
        const frecuentes = frecuentesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          fechaNacimiento: doc.data().fechaNacimiento.toDate(),
          ultimoUso: doc.data().ultimoUso?.toDate()
        })) as InvitadoFrecuente[];
        frecuentes.sort((a, b) => b.vecesUsado - a.vecesUsado);
        setInvitadosFrecuentes(frecuentes);
      } catch (error) {
        console.error('Error al cargar invitados frecuentes:', error);
      }
    };
    if (user) {
      cargarInvitadosFrecuentes();
    }
  }, [user]);

  const { mutate: saveSolicitud, isPending: isSaving } = useMutation({
    mutationFn: (data: SolicitudInvitadosDiarios) => addOrUpdateSolicitudInvitadosDiarios(data),
    onSuccess: (data, variables) => {
      const queryKey = ['solicitudInvitados', user?.uid, selectedDateISO];
      queryClient.setQueryData(queryKey, variables);

      toast({
        title: variables.estado === EstadoSolicitudInvitados.ENVIADA ? 'Lista Enviada' : (variables.id ? 'Lista Actualizada' : 'Borrador Guardado'),
        description: `Tu lista de invitados para el ${formatDate(selectedDateISO)} ha sido actualizada.`,
      });
    },
    onError: (error) => {
        toast({ title: "Error", description: `No se pudo guardar la lista de invitados: ${error.message}`, variant: "destructive"});
    }
  });


  const form = useForm<SolicitudInvitadosDiarios>({
    resolver: zodResolver(solicitudInvitadosDiariosSchema),
    defaultValues: {
      id: generateId(),
      idSocioTitular: user?.uid || '',
      nombreSocioTitular: userName || '',
      fecha: selectedDateISO,
      listaInvitadosDiarios: [createDefaultInvitado()],
      estado: EstadoSolicitudInvitados.BORRADOR,
      fechaCreacion: new Date(),
      fechaUltimaModificacion: new Date(),
      titularIngresadoEvento: false,
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "listaInvitadosDiarios",
  });
  
  useEffect(() => {
    if (loading || authIsLoading) {
      return;
    }

    if (solicitudActual) {
      form.reset({
        ...solicitudActual,
        fecha: selectedDateISO,
        listaInvitadosDiarios: solicitudActual.listaInvitadosDiarios.length > 0
          ? solicitudActual.listaInvitadosDiarios.map(inv => {
              const rawDate = inv.fechaNacimiento as any;
              let finalDate = new Date();
              if (rawDate) {
                if (typeof rawDate.seconds === 'number') {
                  finalDate = new Date(rawDate.seconds * 1000);
                } else {
                  finalDate = new Date(rawDate);
                }
              }
              return {
                ...inv,
                id: inv.id || generateId(),
                fechaNacimiento: finalDate,
              };
            })
          : [createDefaultInvitado()],
      });
    } else {
      form.reset({
        id: generateId(),
        idSocioTitular: user?.uid || '',
        nombreSocioTitular: userName || '',
        fecha: selectedDateISO,
        listaInvitadosDiarios: [createDefaultInvitado()],
        estado: EstadoSolicitudInvitados.BORRADOR,
        fechaCreacion: new Date(),
        fechaUltimaModificacion: new Date(),
        titularIngresadoEvento: false,
      });
    }
  }, [solicitudActual, loading, authIsLoading, selectedDateISO, user, userName, form]);

  const guardarComoFrecuentes = async (invitados: InvitadoDiario[]) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      for (const invitado of invitados) {
        const invitadoId = `inv-${invitado.dni}`;
        const invitadoRef = doc(db, 'socios', user.uid, 'invitados_frecuentes', invitadoId);
        const invitadoDoc = await getDoc(invitadoRef);
        if (invitadoDoc.exists()) {
          batch.update(invitadoRef, {
            ultimoUso: Timestamp.now(),
            vecesUsado: increment(1),
            nombre: invitado.nombre,
            apellido: invitado.apellido,
            fechaNacimiento: Timestamp.fromDate(invitado.fechaNacimiento)
          });
        } else {
          batch.set(invitadoRef, {
            nombre: invitado.nombre,
            apellido: invitado.apellido,
            dni: invitado.dni,
            fechaNacimiento: Timestamp.fromDate(invitado.fechaNacimiento),
            fechaCreacion: Timestamp.now(),
            ultimoUso: Timestamp.now(),
            vecesUsado: 1
          });
        }
      }
      await batch.commit();
      console.log('✅ Invitados guardados como frecuentes');
    } catch (error) {
      console.error('Error al guardar invitados frecuentes:', error);
    }
  };

  const handleSave = async (targetState: EstadoSolicitudInvitados) => {
    if (!user) {
      toast({ title: "Error", description: "Usuario no identificado.", variant: "destructive"});
      return;
    }

    const data = form.getValues();

    const invitadosValidos = data.listaInvitadosDiarios.filter(invitado => {
        const tieneNombre = invitado.nombre && invitado.nombre.trim() !== '';
        const tieneApellido = invitado.apellido && invitado.apellido.trim() !== '';
        const tieneDNI = invitado.dni && invitado.dni.trim() !== '';
        return tieneNombre && tieneApellido && tieneDNI;
    });

    if (targetState === EstadoSolicitudInvitados.ENVIADA && invitadosValidos.length === 0) {
      toast({ title: "Lista Vacía", description: "Debe agregar al menos un invitado con nombre, apellido y DNI para enviar la lista.", variant: "destructive" });
      return;
    }

    const finalState = solicitudActual?.estado === EstadoSolicitudInvitados.ENVIADA ? EstadoSolicitudInvitados.ENVIADA : targetState;

    const dataToSave: SolicitudInvitadosDiarios = {
        ...data,
        idSocioTitular: user.uid,
        numeroSocioTitular: loggedInUserNumeroSocio || '',
        nombreSocioTitular: userName || 'Socio',
        fecha: selectedDateISO, 
        id: solicitudActual?.id || data.id,
        estado: finalState,
        fechaCreacion: solicitudActual?.fechaCreacion || new Date(),
        fechaUltimaModificacion: new Date(),
        listaInvitadosDiarios: invitadosValidos,
    };
    
    console.log('🔍 Usuario actual:', user);
    console.log('🆔 UID del usuario:', user?.uid);
    console.log('📋 Datos a enviar:', dataToSave);

    saveSolicitud(dataToSave);

    if (targetState === EstadoSolicitudInvitados.ENVIADA) {
      await guardarComoFrecuentes(invitadosValidos);
    }
  };

  const onFormSubmit = () => {
    handleSave(EstadoSolicitudInvitados.BORRADOR);
  };

  const handleConfirmarYEnviar = () => {
    handleSave(EstadoSolicitudInvitados.ENVIADA);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month, day] = e.target.value.split('-').map(Number);
    const newDate = new Date(year, month - 1, day);
    if (isValid(newDate)) {
        setSelectedDate(newDate);
    }
  };

  const isEditable = useMemo(() => {
    const esFechaValidaParaEdicion = !isBefore(selectedDate, today) || isSameDay(selectedDate, today);

    if (!solicitudActual) {
      return esFechaValidaParaEdicion;
    }

    if (!esFechaValidaParaEdicion) {
      return false;
    }

    const estadosBloqueados: EstadoSolicitudInvitados[] = [
        EstadoSolicitudInvitados.VENCIDA,
        EstadoSolicitudInvitados.CANCELADA_ADMIN,
        EstadoSolicitudInvitados.CANCELADA_SOCIO,
    ];

    return !estadosBloqueados.includes(solicitudActual.estado);
  }, [solicitudActual, selectedDate, today]);
  
  const puedeEnviar = useMemo(() => {
    if (!isEditable) return false;

    if (solicitudActual?.estado === EstadoSolicitudInvitados.ENVIADA) {
      return true;
    }

    const isTodayOrFutureWithinLimit = !isBefore(selectedDate, today) && isBefore(selectedDate, addDays(today,6));
    
    return (solicitudActual?.estado === EstadoSolicitudInvitados.BORRADOR || !solicitudActual) && 
           isTodayOrFutureWithinLimit;
  }, [solicitudActual, isEditable, selectedDate, today]);

  const agregarInvitadoFrecuente = (inv: InvitadoFrecuente) => {
    const currentInvitados = form.getValues('listaInvitadosDiarios');
    const existe = currentInvitados.some(i => i.dni === inv.dni);
    if (existe) {
      toast({ title: 'Info', description: 'Este invitado ya está en la lista.' });
      return;
    }
    const newInvitado = { ...createDefaultInvitado(), ...inv };
    // Check if the first field is empty and replace it, otherwise append
    if (fields.length === 1 && !fields[0].nombre && !fields[0].apellido && !fields[0].dni) {
      replace([newInvitado]);
    } else {
      append(newInvitado);
    }
    toast({ title: 'Invitado Agregado', description: `${inv.nombre} ${inv.apellido} agregado a la lista.` });
  };

  const cargarTodosLosFrecuentes = () => {
    const currentInvitados = form.getValues('listaInvitadosDiarios');
    const nuevosInvitados = invitadosFrecuentes
      .filter(inv => !currentInvitados.some(i => i.dni === inv.dni))
      .map(inv => ({ ...createDefaultInvitado(), ...inv }));
    if (nuevosInvitados.length > 0) {
      append(nuevosInvitados);
      toast({ title: 'Invitados Cargados', description: `${nuevosInvitados.length} invitados cargados.` });
    } else {
      toast({ title: 'Info', description: 'Todos los invitados frecuentes ya están en la lista.' });
    }
  };

  const eliminarInvitadoFrecuente = async (invitadoId: string) => {
    if (!user) return;
    if (confirm('¿Eliminar este invitado de tus frecuentes?')) {
      try {
        await deleteDoc(doc(db, 'socios', user.uid, 'invitados_frecuentes', invitadoId));
        setInvitadosFrecuentes(invitadosFrecuentes.filter(inv => inv.id !== invitadoId));
        toast({ title: 'Éxito', description: 'Invitado eliminado de frecuentes.' });
      } catch (error) {
        console.error('Error al eliminar:', error);
        toast({ title: 'Error', description: 'Error al eliminar invitado frecuente.', variant: 'destructive' });
      }
    }
  };

  const limpiarInvitadosActuales = () => {
    if (fields.length === 0) return;
    if (confirm('¿Limpiar la lista actual de invitados?')) {
      replace([createDefaultInvitado()]);
      toast({ title: 'Info', description: 'Lista limpiada.' });
    }
  };

  if (authIsLoading || (loading && !solicitudActual)) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-4">
        <p className="text-muted-foreground">Cargando información de invitados...</p>
        <Skeleton className="h-10 w-full max-w-xs" />
        <Skeleton className="h-20 w-full max-w-2xl" />
        <Skeleton className="h-64 w-full max-w-2xl" />
        <Skeleton className="h-10 w-1/3" />
      </div>
    );
  }
  
  const getEstadoBadge = (estado?: EstadoSolicitudInvitados) => {
    if (!estado) return null;
    switch(estado) {
        case EstadoSolicitudInvitados.BORRADOR: return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Edit className="mr-1 h-3 w-3" /> Borrador</Badge>;
        case EstadoSolicitudInvitados.ENVIADA: return <Badge className="bg-green-500 text-white"><Send className="mr-1 h-3 w-3" /> Enviada</Badge>;
        case EstadoSolicitudInvitados.PROCESADA: return <Badge className="bg-blue-500 text-white"><ListChecks className="mr-1 h-3 w-3" /> Procesada</Badge>;
        case EstadoSolicitudInvitados.VENCIDA: return <Badge variant="destructive" className="bg-gray-500"><Clock className="mr-1 h-3 w-3" /> Vencida</Badge>;
        default: return <Badge variant="secondary">{estado}</Badge>;
    }
  }

  const submitButtonText = () => {
    if (isSaving) return 'Guardando...';
    return solicitudActual?.id ? 'Actualizar Borrador' : 'Guardar Borrador';
  };

  return (
    <FormProvider {...form}>
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="text-2xl flex items-center"><Users className="mr-3 h-7 w-7 text-primary" />Carga de Invitados</CardTitle>
          </div>
          <CardDescription>
            Crea y gestiona tu lista de invitados para el día {format(selectedDate, "dd 'de' MMMM yyyy", { locale: es })}.
            Puedes cargar la lista hasta 5 días antes. Las listas enviadas pueden ser actualizadas con más invitados si la fecha lo permite.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onFormSubmit)}>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="space-y-2">
                    <FormLabel htmlFor="selected-event-date" className="text-sm font-medium flex items-center">
                        <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/>
                        Seleccionar Fecha para la Lista de Invitados
                    </FormLabel>
                    <Input
                        id="selected-event-date"
                        type="date"
                        value={format(selectedDate, 'yyyy-MM-dd')}
                        onChange={handleDateChange}
                        min={minSelectableDate}
                        max={maxSelectableDate}
                        className="w-full sm:w-[280px]"
                        disabled={!minSelectableDate || !maxSelectableDate || (solicitudActual?.estado === EstadoSolicitudInvitados.ENVIADA && !isEditable)}
                    />
                    <FormMessage>{form.formState.errors.fecha?.message}</FormMessage>
                </div>

                {solicitudActual && (
                    <Card className="p-4 bg-muted/10 border-dashed">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                            <div>
                                <h4 className="text-sm font-semibold mb-0.5">Estado de la Lista:</h4>
                                {getEstadoBadge(solicitudActual.estado)}
                            </div>
                            <div className="text-xs text-muted-foreground text-left sm:text-right">
                                <p>Creada: {formatDate(solicitudActual.fechaCreacion, "dd/MM/yy HH:mm")}</p>
                                <p>Últ. Modif.: {formatDate(solicitudActual.fechaUltimaModificacion, "dd/MM/yy HH:mm")}</p>
                            </div>
                        </div>
                         {solicitudActual?.estado === EstadoSolicitudInvitados.ENVIADA && isEditable && (
                            <Alert variant="default" className="mt-3 bg-blue-500/10 border-blue-500/30 text-blue-700">
                                <Info className="h-4 w-4" />
                                <AlertTitle>Lista Enviada - Aún Editable</AlertTitle>
                                <AlertDescription>
                                Esta lista ya fue enviada, pero aún puedes agregar más invitados para el día {formatDate(selectedDateISO)}. Los nuevos invitados se añadirán a la lista existente.
                                </AlertDescription>
                            </Alert>
                        )}
                        {solicitudActual?.estado === EstadoSolicitudInvitados.ENVIADA && !isEditable && (
                             <Alert variant="default" className="mt-3 bg-green-500/10 border-green-500/30 text-green-700">
                                <Send className="h-4 w-4" />
                                <AlertTitle>Lista Enviada y Cerrada</AlertTitle>
                                <AlertDescription>
                                Esta lista ya fue enviada y no puede ser modificada (probablemente porque la fecha ya pasó o está fuera del límite de edición).
                                </AlertDescription>
                            </Alert>
                        )}
                    </Card>
                )}

                <Card className="mb-6">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-orange-500" />
                        Invitados Frecuentes
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setMostrarFrecuentes(!mostrarFrecuentes)}>
                        {mostrarFrecuentes ? <ChevronUp /> : <ChevronDown />}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 pt-2">Tus invitados más comunes. Haz clic para agregarlos a la lista de hoy.</p>
                  </CardHeader>
                  {mostrarFrecuentes && (
                    <CardContent>
                      {invitadosFrecuentes.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">No tienes invitados frecuentes aún. Se guardarán automáticamente al enviar listas.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {invitadosFrecuentes.map((inv) => (
                            <Card key={inv.id} className="p-3 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-semibold">{inv.nombre} {inv.apellido}</p>
                                  <p className="text-sm text-gray-600">DNI: {inv.dni}</p>
                                  <p className="text-xs text-gray-500">Usado {inv.vecesUsado} {inv.vecesUsado === 1 ? 'vez' : 'veces'}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => agregarInvitadoFrecuente(inv)} title="Agregar a la lista de hoy">
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => eliminarInvitadoFrecuente(inv.id)} title="Eliminar de frecuentes">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                      {invitadosFrecuentes.length > 0 && (
                        <div className="mt-4 flex flex-col sm:flex-row gap-2">
                          <Button onClick={cargarTodosLosFrecuentes} className="flex-1" variant="outline">
                            <UserPlus className="w-4 h-4 mr-2" />
                            Cargar Todos los Frecuentes
                          </Button>
                          <Button onClick={limpiarInvitadosActuales} variant="ghost">
                            <X className="w-4 h-4 mr-2" />
                            Limpiar Lista
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
                
                <Separator/>

                <div>
                  <h3 className="text-lg font-medium mb-1">Lista de Invitados ({fields.length})</h3>
                  <p className="text-xs text-muted-foreground mb-3">Nombre, Apellido, DNI y Fecha de Nacimiento son obligatorios.</p>
                  
                  <ScrollArea className="max-h-[auto]"> 
                    <div className="space-y-4 pr-3">
                      {fields.map((item, index) => (
                        <Card key={item.id} className="p-4 relative bg-muted/30">
                          {isEditable && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => remove(index)}
                              disabled={fields.length <= 1 && !item.nombre && !item.apellido && !item.dni}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          <p className="text-sm font-semibold mb-2">Invitado {index + 1}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                            <FormField
                              control={form.control}
                              name={`listaInvitadosDiarios.${index}.nombre`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Nombre</FormLabel>
                                  <FormControl><Input placeholder="Nombre" {...field} className="h-9 text-sm" disabled={!isEditable} /></FormControl>
                                  <FormMessage className="text-xs"/>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`listaInvitadosDiarios.${index}.apellido`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Apellido</FormLabel>
                                  <FormControl><Input placeholder="Apellido" {...field} className="h-9 text-sm" disabled={!isEditable}/></FormControl>
                                  <FormMessage className="text-xs"/>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`listaInvitadosDiarios.${index}.dni`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">DNI</FormLabel>
                                  <FormControl><Input type="number" placeholder="DNI (sin puntos)" {...field} className="h-9 text-sm" disabled={!isEditable}/></FormControl>
                                  <FormMessage className="text-xs"/>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`listaInvitadosDiarios.${index}.fechaNacimiento`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Fecha de Nacimiento</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="date"
                                      value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                      onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)}
                                      max={maxBirthDate}
                                      min="1900-01-01"
                                      className="w-full h-9 text-sm"
                                      disabled={!maxBirthDate || !isEditable}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs"/>
                                </FormItem>
                              )}
                            />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                  {form.formState.errors.listaInvitadosDiarios && !form.formState.errors.listaInvitadosDiarios.root && (
                      <FormMessage className="text-xs mt-1">
                          {form.formState.errors.listaInvitadosDiarios.message}
                      </FormMessage>
                  )}
                  {form.formState.errors.listaInvitadosDiarios?.root && (
                       <FormMessage className="text-xs mt-1">
                          {form.formState.errors.listaInvitadosDiarios.root.message}
                      </FormMessage>
                  )}

                  {isEditable && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => append(createDefaultInvitado())}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> Agregar Invitado
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
  

              {puedeEnviar && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="default" className="bg-green-600 hover:bg-green-700">
                      <Send className="mr-2 h-4 w-4" /> 
                      {solicitudActual?.estado === EstadoSolicitudInvitados.ENVIADA ? 'Actualizar Lista Enviada' : 'Confirmar y Enviar Lista'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {solicitudActual?.estado === EstadoSolicitudInvitados.ENVIADA ? '¿Actualizar la Lista Enviada?' : '¿Confirmar y Enviar Lista de Invitados?'}
                      </AlertDialogTitle>
                      <AlertDialogDescriptionAlertDialog>
                        {solicitudActual?.estado === EstadoSolicitudInvitados.ENVIADA
                          ? 'Se guardarán los cambios en la lista ya enviada. Asegúrate de que todos los datos son correctos.'
                          : <>Una vez enviada, la lista para el <strong>{formatDate(selectedDateISO)}</strong> estará confirmada. Podrás seguir agregando invitados si es necesario. Asegúrate de que todos los datos sean correctos.</>
                        }
                      </AlertDialogDescriptionAlertDialog>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleConfirmarYEnviar} className="bg-green-600 hover:bg-green-700">
                        {solicitudActual?.estado === EstadoSolicitudInvitados.ENVIADA ? 'Confirmar y Actualizar' : 'Confirmar y Enviar'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>
    </FormProvider>
  );
}
