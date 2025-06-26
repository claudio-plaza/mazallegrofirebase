
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
import { PlusCircle, Trash2, Users, Info, CalendarDays, Send, Edit, ListChecks, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, formatISO, parseISO, isValid, addDays, isBefore, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getSolicitudInvitadosDiarios, addOrUpdateSolicitudInvitadosDiarios } from '@/lib/firebase/firestoreService';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionAlertDialog, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';


const createDefaultInvitado = (): InvitadoDiario => ({
  id: generateId(),
  nombre: '',
  apellido: '',
  dni: '',
  fechaNacimiento: new Date(),
  ingresado: false,
  metodoPago: null,
});

export function GestionInvitadosDiarios() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { toast } = useToast();
  const { loggedInUserNumeroSocio, userName, isLoading: authIsLoading } = useAuth();
  const [maxBirthDate, setMaxBirthDate] = useState<string>('');
  const [minSelectableDate, setMinSelectableDate] = useState<string>('');
  const [maxSelectableDate, setMaxSelectableDate] = useState<string>('');
  const queryClient = useQueryClient();

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
      queryKey: ['solicitudInvitados', loggedInUserNumeroSocio, selectedDateISO],
      queryFn: () => getSolicitudInvitadosDiarios(loggedInUserNumeroSocio!, selectedDateISO),
      enabled: !!loggedInUserNumeroSocio && !authIsLoading,
  });

  const { mutate: saveSolicitud, isPending: isSaving } = useMutation({
    mutationFn: (data: SolicitudInvitadosDiarios) => addOrUpdateSolicitudInvitadosDiarios(data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['solicitudInvitados', loggedInUserNumeroSocio, selectedDateISO] });
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
      idSocioTitular: loggedInUserNumeroSocio || '',
      nombreSocioTitular: userName || '',
      fecha: selectedDateISO,
      listaInvitadosDiarios: [createDefaultInvitado()],
      estado: EstadoSolicitudInvitados.BORRADOR,
      fechaCreacion: new Date(),
      fechaUltimaModificacion: new Date(),
      titularIngresadoEvento: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "listaInvitadosDiarios",
  });
  
  useEffect(() => {
    if (loading || authIsLoading) return;
    
    if (solicitudActual) {
      form.reset({
        ...solicitudActual,
        fecha: selectedDateISO,
        listaInvitadosDiarios: solicitudActual.listaInvitadosDiarios.length > 0 
          ? solicitudActual.listaInvitadosDiarios.map(inv => ({
              ...inv,
              id: inv.id || generateId(),
              fechaNacimiento: inv.fechaNacimiento,
            }))
          : [createDefaultInvitado()],
      });
    } else {
      form.reset({
          id: generateId(),
          idSocioTitular: loggedInUserNumeroSocio || '',
          nombreSocioTitular: userName || '',
          fecha: selectedDateISO,
          listaInvitadosDiarios: [createDefaultInvitado()],
          estado: EstadoSolicitudInvitados.BORRADOR,
          fechaCreacion: new Date(),
          fechaUltimaModificacion: new Date(),
          titularIngresadoEvento: false,
      });
    }
  }, [solicitudActual, loading, authIsLoading, form, selectedDateISO, loggedInUserNumeroSocio, userName]);


  const onSubmit = (data: SolicitudInvitadosDiarios) => {
    if (!loggedInUserNumeroSocio) {
        toast({ title: "Error", description: "Usuario no identificado.", variant: "destructive"});
        return;
    }

    const dataToSave: SolicitudInvitadosDiarios = {
        ...data,
        idSocioTitular: loggedInUserNumeroSocio,
        nombreSocioTitular: userName || 'Socio',
        fecha: selectedDateISO, 
        id: solicitudActual?.id || data.id || generateId(),
        estado: solicitudActual?.estado || EstadoSolicitudInvitados.BORRADOR,
        fechaCreacion: solicitudActual?.fechaCreacion || new Date(),
        fechaUltimaModificacion: new Date(),
        listaInvitadosDiarios: data.listaInvitadosDiarios.map(inv => ({
          ...inv,
          id: inv.id || generateId(),
        }))
    };
    saveSolicitud(dataToSave);
  };

  const handleConfirmarYEnviar = () => {
    const currentData = form.getValues();
     if (currentData.listaInvitadosDiarios.length === 0 || currentData.listaInvitadosDiarios.every(inv => !inv.nombre && !inv.apellido && !inv.dni)) {
      toast({ title: "Lista Vacía", description: "Debe agregar al menos un invitado para enviar la lista.", variant: "destructive" });
      return;
    }
    const dataToSave: SolicitudInvitadosDiarios = {
      ...currentData,
      idSocioTitular: loggedInUserNumeroSocio!,
      nombreSocioTitular: userName!,
      fecha: selectedDateISO,
      id: solicitudActual?.id || currentData.id,
      estado: EstadoSolicitudInvitados.ENVIADA,
      fechaCreacion: solicitudActual?.fechaCreacion || new Date(),
      fechaUltimaModificacion: new Date(),
    };
    saveSolicitud(dataToSave);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = parseISO(e.target.value);
    if (isValid(newDate)) {
        setSelectedDate(newDate);
    }
  };

  const isEditable = useMemo(() => {
    const esFechaValidaParaEdicion = !isBefore(selectedDate, today) || isSameDay(selectedDate, today);
    if (!esFechaValidaParaEdicion) return false; 

    if (!solicitudActual) return true; 

    const estadosBloqueados: EstadoSolicitudInvitados[] = [
        EstadoSolicitudInvitados.PROCESADA,
        EstadoSolicitudInvitados.VENCIDA,
        EstadoSolicitudInvitados.CANCELADA_ADMIN,
        EstadoSolicitudInvitados.CANCELADA_SOCIO,
    ];

    if (solicitudActual.estado === EstadoSolicitudInvitados.ENVIADA) return true;

    return !estadosBloqueados.includes(solicitudActual.estado);
  }, [solicitudActual, selectedDate, today]);
  
  const puedeEnviar = useMemo(() => {
    if (!isEditable) return false;
    
    const isTodayOrFutureWithinLimit = !isBefore(selectedDate, today) && isBefore(selectedDate, addDays(today,6));
    
    return (solicitudActual?.estado === EstadoSolicitudInvitados.BORRADOR || !solicitudActual) && 
           isTodayOrFutureWithinLimit &&
           (isSameDay(selectedDate, today) || isBefore(today,selectedDate));
  }, [solicitudActual, selectedDate, today, isEditable]);


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
    if (solicitudActual?.estado === EstadoSolicitudInvitados.ENVIADA && isEditable) return 'Agregar Más Invitados a Lista';
    return solicitudActual ? 'Actualizar Borrador' : 'Guardar Borrador';
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
          <form onSubmit={form.handleSubmit(onSubmit)}>
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
                

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Importante</AlertTitle>
                  <AlertDescription>
                    Para que se habilite el ingreso de los invitados de esta lista, un socio responsable del grupo familiar (titular o familiar directo) debe registrar su ingreso en portería primero. Adicionalmente, los invitados deben abonar la entrada correspondiente y realizar la revisión médica si fuera necesario.
                  </AlertDescription>
                </Alert>

                <Separator/>

                <div>
                  <h3 className="text-lg font-medium mb-1">Lista de Invitados ({fields.length})</h3>
                  <p className="text-xs text-muted-foreground mb-3">Nombre, Apellido, DNI y Fecha de Nacimiento son obligatorios.</p>
                  
                  <ScrollArea className="max-h-[500px]"> 
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
                                      value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
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
              <Button 
                type="submit" 
                disabled={isSaving || !loggedInUserNumeroSocio || authIsLoading || !isEditable}
              >
                {submitButtonText()}
              </Button>
              {puedeEnviar && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="default" className="bg-green-600 hover:bg-green-700">
                      <Send className="mr-2 h-4 w-4" /> Confirmar y Enviar Lista
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Confirmar y Enviar Lista de Invitados?</AlertDialogTitle>
                      <AlertDialogDescriptionAlertDialog>
                        Una vez enviada, la lista para el <strong>{formatDate(selectedDateISO)}</strong> estará confirmada. Podrás seguir agregando invitados si es necesario.
                        Asegúrate de que todos los datos sean correctos.
                      </AlertDialogDescriptionAlertDialog>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleConfirmarYEnviar} className="bg-green-600 hover:bg-green-700">Confirmar y Enviar</AlertDialogAction>
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
