
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { SolicitudCumpleanos, InvitadoCumpleanos } from '@/types';
import { solicitudCumpleanosSchema, MAX_INVITADOS_CUMPLEANOS, EstadoSolicitudCumpleanos } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, generateId } from '@/lib/helpers';
import { PlusCircle, Trash2, CalendarIcon, Users, Cake, Edit2, Eye, ListChecks } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';

const STORAGE_KEY = 'cumpleanosDB';

export function GestionCumpleanos() {
  const [solicitudes, setSolicitudes] = useState<SolicitudCumpleanos[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSolicitud, setEditingSolicitud] = useState<SolicitudCumpleanos | null>(null);
  const { toast } = useToast();
  const { loggedInUserNumeroSocio, userName } = useAuth();

  const loadSolicitudes = useCallback(() => {
    if (!loggedInUserNumeroSocio) return;
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
      const allSolicitudes: SolicitudCumpleanos[] = JSON.parse(storedData);
      const userSolicitudes = allSolicitudes
        .filter(s => s.idSocioTitular === loggedInUserNumeroSocio)
        .map(s => ({
          ...s,
          fechaEvento: new Date(s.fechaEvento), // Asegurar que sea Date
        }))
        .sort((a,b) => new Date(b.fechaEvento).getTime() - new Date(a.fechaEvento).getTime());
      setSolicitudes(userSolicitudes);
    }
  }, [loggedInUserNumeroSocio]);

  useEffect(() => {
    loadSolicitudes();
  }, [loadSolicitudes]);

  const form = useForm<SolicitudCumpleanos>({
    resolver: zodResolver(solicitudCumpleanosSchema),
    defaultValues: {
      id: generateId(),
      idSocioTitular: loggedInUserNumeroSocio || '',
      nombreSocioTitular: userName || '',
      fechaEvento: new Date(),
      listaInvitados: [{ nombre: '', apellido: '', dni: '', telefono: '', email: '', ingresado: false }],
      estado: EstadoSolicitudCumpleanos.APROBADA, // Por ahora se aprueba por defecto
      fechaSolicitud: new Date().toISOString(),
      titularIngresadoEvento: false,
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "listaInvitados",
  });

  useEffect(() => {
    if (loggedInUserNumeroSocio && userName) {
      form.setValue('idSocioTitular', loggedInUserNumeroSocio);
      form.setValue('nombreSocioTitular', userName);
    }
  }, [loggedInUserNumeroSocio, userName, form]);

  const onSubmit = (data: SolicitudCumpleanos) => {
    const allSolicitudes: SolicitudCumpleanos[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (editingSolicitud) {
      const index = allSolicitudes.findIndex(s => s.id === editingSolicitud.id);
      if (index > -1) {
        allSolicitudes[index] = { ...data, fechaEvento: data.fechaEvento };
      }
      toast({ title: "Solicitud Actualizada", description: "El festejo de cumpleaños ha sido actualizado." });
    } else {
      allSolicitudes.push({ ...data, fechaEvento: data.fechaEvento });
      toast({ title: "Solicitud Guardada", description: "Tu festejo de cumpleaños ha sido registrado." });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allSolicitudes));
    loadSolicitudes();
    setIsFormOpen(false);
    setEditingSolicitud(null);
    form.reset({
      id: generateId(),
      idSocioTitular: loggedInUserNumeroSocio || '',
      nombreSocioTitular: userName || '',
      fechaEvento: new Date(),
      listaInvitados: [{ nombre: '', apellido: '', dni: '', telefono: '', email: '', ingresado: false }],
      estado: EstadoSolicitudCumpleanos.APROBADA,
      fechaSolicitud: new Date().toISOString(),
      titularIngresadoEvento: false,
    });
  };

  const handleOpenForm = (solicitud?: SolicitudCumpleanos) => {
    if (solicitud) {
      setEditingSolicitud(solicitud);
      form.reset({
        ...solicitud,
        fechaEvento: new Date(solicitud.fechaEvento), // Asegurar que es Date
        listaInvitados: solicitud.listaInvitados.length > 0 ? solicitud.listaInvitados : [{ nombre: '', apellido: '', dni: ''}]
      });
    } else {
      setEditingSolicitud(null);
      form.reset({
        id: generateId(),
        idSocioTitular: loggedInUserNumeroSocio || '',
        nombreSocioTitular: userName || '',
        fechaEvento: new Date(),
        listaInvitados: [{ nombre: '', apellido: '', dni: '', telefono: '', email: '', ingresado: false }],
        estado: EstadoSolicitudCumpleanos.APROBADA,
        fechaSolicitud: new Date().toISOString(),
        titularIngresadoEvento: false,
      });
    }
    setIsFormOpen(true);
  };
  
  const getStatusBadge = (status: EstadoSolicitudCumpleanos) => {
    switch (status) {
      case EstadoSolicitudCumpleanos.APROBADA:
        return <Badge className="bg-green-500 hover:bg-green-600">Aprobada</Badge>;
      case EstadoSolicitudCumpleanos.PENDIENTE_APROBACION:
        return <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600">Pendiente</Badge>;
      case EstadoSolicitudCumpleanos.RECHAZADA:
        return <Badge variant="destructive">Rechazada</Badge>;
      case EstadoSolicitudCumpleanos.CANCELADA:
        return <Badge variant="outline" className="border-gray-500 text-gray-600">Cancelada</Badge>;
      case EstadoSolicitudCumpleanos.REALIZADO:
        return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Realizado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };


  return (
    <FormProvider {...form}>
      <Card className="w-full max-w-4xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="text-2xl flex items-center"><Cake className="mr-3 h-7 w-7 text-primary" />Mis Cumpleaños</CardTitle>
            <Button onClick={() => handleOpenForm()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Solicitar Festejo
            </Button>
          </div>
          <CardDescription>
            Aquí puedes solicitar el espacio para tu festejo de cumpleaños y gestionar tu lista de hasta {MAX_INVITADOS_CUMPLEANOS} invitados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {solicitudes.length === 0 ? (
            <div className="text-center py-10 px-6 border border-dashed rounded-md">
                <ListChecks className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl font-medium text-foreground">Aún no tienes festejos solicitados.</p>
                <p className="text-muted-foreground mt-1">Haz clic en "Solicitar Festejo" para empezar.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {solicitudes.map((solicitud) => (
                <Card key={solicitud.id} className="bg-card hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg">Festejo del {formatDate(solicitud.fechaEvento, "dd 'de' MMMM yyyy")}</CardTitle>
                            <CardDescription>
                                {solicitud.listaInvitados.length} invitado(s) - Solicitado el: {formatDate(solicitud.fechaSolicitud, "dd/MM/yy HH:mm")}
                            </CardDescription>
                        </div>
                        {getStatusBadge(solicitud.estado)}
                    </div>
                  </CardHeader>
                  <CardFooter className="flex justify-end gap-2 pt-2 pb-3 px-6">
                    <Button variant="outline" size="sm" onClick={() => handleOpenForm(solicitud)}>
                      <Edit2 className="mr-2 h-4 w-4" /> Ver / Editar
                    </Button>
                     {/* Agregar botón para cancelar o ver detalle si es necesario */}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        setIsFormOpen(isOpen);
        if (!isOpen) {
            setEditingSolicitud(null);
            form.reset({
                id: generateId(),
                idSocioTitular: loggedInUserNumeroSocio || '',
                nombreSocioTitular: userName || '',
                fechaEvento: new Date(),
                listaInvitados: [{ nombre: '', apellido: '', dni: '', telefono: '', email: '', ingresado: false }],
                estado: EstadoSolicitudCumpleanos.APROBADA,
                fechaSolicitud: new Date().toISOString(),
                titularIngresadoEvento: false,
            });
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingSolicitud ? 'Editar Solicitud de Cumpleaños' : 'Nueva Solicitud de Cumpleaños'}</DialogTitle>
            <DialogDescription>
              {editingSolicitud ? 'Modifica los detalles de tu festejo.' : `Completa la fecha y la lista de tus ${MAX_INVITADOS_CUMPLEANOS} invitados.`}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-200px)] p-1 -mx-1">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4 pr-6">
                <FormField
                  control={form.control}
                  name="fechaEvento"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha del Evento</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Seleccione una fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) || date < new Date("1900-01-01")}
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-1">Lista de Invitados ({fields.length}/{MAX_INVITADOS_CUMPLEANOS})</h3>
                  <p className="text-xs text-muted-foreground mb-3">DNI es obligatorio. Teléfono y email son opcionales.</p>
                  <ScrollArea className="max-h-[300px] pr-3">
                  <div className="space-y-4">
                    {fields.map((item, index) => (
                      <Card key={item.id} className="p-4 relative bg-muted/30">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => remove(index)}
                          disabled={fields.length <=1 && index === 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <p className="text-sm font-semibold mb-2">Invitado {index + 1}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                          <FormField
                            control={form.control}
                            name={`listaInvitados.${index}.nombre`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Nombre</FormLabel>
                                <FormControl><Input placeholder="Nombre" {...field} className="h-9 text-sm"/></FormControl>
                                <FormMessage className="text-xs"/>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`listaInvitados.${index}.apellido`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Apellido</FormLabel>
                                <FormControl><Input placeholder="Apellido" {...field} className="h-9 text-sm"/></FormControl>
                                <FormMessage className="text-xs"/>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`listaInvitados.${index}.dni`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">DNI</FormLabel>
                                <FormControl><Input type="number" placeholder="DNI (sin puntos)" {...field} className="h-9 text-sm"/></FormControl>
                                <FormMessage className="text-xs"/>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`listaInvitados.${index}.telefono`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Teléfono (Opcional)</FormLabel>
                                <FormControl><Input type="tel" placeholder="Teléfono" {...field} className="h-9 text-sm"/></FormControl>
                                <FormMessage className="text-xs"/>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`listaInvitados.${index}.email`}
                            render={({ field }) => (
                              <FormItem className="sm:col-span-2">
                                <FormLabel className="text-xs">Email (Opcional)</FormLabel>
                                <FormControl><Input type="email" placeholder="Email" {...field} className="h-9 text-sm"/></FormControl>
                                <FormMessage className="text-xs"/>
                              </FormItem>
                            )}
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                  </ScrollArea>
                   {form.formState.errors.listaInvitados && !form.formState.errors.listaInvitados.root && (
                        <FormMessage className="text-xs mt-1">
                            {form.formState.errors.listaInvitados.message}
                        </FormMessage>
                    )}
                    {form.formState.errors.listaInvitados?.root && (
                         <FormMessage className="text-xs mt-1">
                            {form.formState.errors.listaInvitados.root.message}
                        </FormMessage>
                    )}


                  {fields.length < MAX_INVITADOS_CUMPLEANOS && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => append({ nombre: '', apellido: '', dni: '', telefono: '', email: '', ingresado: false })}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> Agregar Invitado
                    </Button>
                  )}
                </div>
                <DialogFooter className="pt-4">
                  <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Guardando...' : (editingSolicitud ? 'Actualizar Solicitud' : 'Guardar Solicitud')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </FormProvider>
  );
}

