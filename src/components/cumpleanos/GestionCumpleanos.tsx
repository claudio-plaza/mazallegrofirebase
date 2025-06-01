
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { SolicitudCumpleanos, InvitadoCumpleanos, Socio } from '@/types';
import { solicitudCumpleanosSchema, MAX_INVITADOS_CUMPLEANOS, EstadoSolicitudCumpleanos } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, generateId } from '@/lib/helpers';
import { PlusCircle, Trash2, Users, Cake, Edit2, Eye, ListChecks, UserCheck, CalendarDays } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const STORAGE_KEY = 'cumpleanosDB';
const SOCIO_DB_KEY = 'sociosDB';

interface BirthdayPersonOption {
  value: string; // DNI of the person
  label: string; // Name and relation
  fullName: string; // Full name for nombreCumpleanero
}

export function GestionCumpleanos() {
  const [solicitudes, setSolicitudes] = useState<SolicitudCumpleanos[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSolicitud, setEditingSolicitud] = useState<SolicitudCumpleanos | null>(null);
  const [birthdayPeopleOptions, setBirthdayPeopleOptions] = useState<BirthdayPersonOption[]>([]);
  const [currentTitular, setCurrentTitular] = useState<Socio | null>(null);

  const { toast } = useToast();
  const { loggedInUserNumeroSocio, userName } = useAuth();

  const loadTitularData = useCallback(() => {
    if (!loggedInUserNumeroSocio) return;
    const storedSocios = localStorage.getItem(SOCIO_DB_KEY);
    if (storedSocios) {
      const socios: Socio[] = JSON.parse(storedSocios);
      const titular = socios.find(s => s.numeroSocio === loggedInUserNumeroSocio);
      if (titular) {
        setCurrentTitular(titular);
        const options: BirthdayPersonOption[] = [
          { value: titular.dni, label: `${titular.nombre} ${titular.apellido} (Titular)`, fullName: `${titular.nombre} ${titular.apellido}` },
          ...(titular.grupoFamiliar?.map(fam => ({
            value: fam.dni,
            label: `${fam.nombre} ${fam.apellido} (${fam.relacion})`,
            fullName: `${fam.nombre} ${fam.apellido}`
          })) || [])
        ];
        setBirthdayPeopleOptions(options);
      }
    }
  }, [loggedInUserNumeroSocio]);

  useEffect(() => {
    loadTitularData();
  }, [loadTitularData]);


  const loadSolicitudes = useCallback(() => {
    if (!loggedInUserNumeroSocio) return;
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
      const allSolicitudes: SolicitudCumpleanos[] = JSON.parse(storedData);
      const userSolicitudes = allSolicitudes
        .filter(s => s.idSocioTitular === loggedInUserNumeroSocio)
        .map(s => ({
          ...s,
          fechaEvento: new Date(s.fechaEvento), 
        }))
        .sort((a,b) => new Date(b.fechaEvento).getTime() - new Date(a.fechaEvento).getTime());
      setSolicitudes(userSolicitudes);
    }
  }, [loggedInUserNumeroSocio]);

  useEffect(() => {
    loadSolicitudes();
    window.addEventListener('cumpleanosDBUpdated', loadSolicitudes);
    return () => {
      window.removeEventListener('cumpleanosDBUpdated', loadSolicitudes);
    }
  }, [loadSolicitudes]);

  const form = useForm<SolicitudCumpleanos>({
    resolver: zodResolver(solicitudCumpleanosSchema),
    defaultValues: {
      id: generateId(),
      idSocioTitular: loggedInUserNumeroSocio || '',
      nombreSocioTitular: userName || '',
      idCumpleanero: '',
      nombreCumpleanero: '',
      fechaEvento: new Date(),
      listaInvitados: [{ nombre: '', apellido: '', dni: '', telefono: '', email: '', ingresado: false }],
      estado: EstadoSolicitudCumpleanos.APROBADA, 
      fechaSolicitud: new Date().toISOString(),
      titularIngresadoEvento: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "listaInvitados",
  });

  useEffect(() => {
    if (loggedInUserNumeroSocio && userName) {
      form.setValue('idSocioTitular', loggedInUserNumeroSocio);
      form.setValue('nombreSocioTitular', userName);
      if (!editingSolicitud && birthdayPeopleOptions.length > 0 && currentTitular) {
        form.setValue('idCumpleanero', currentTitular.dni); // Default to titular
        form.setValue('nombreCumpleanero', `${currentTitular.nombre} ${currentTitular.apellido}`);
      }
    }
  }, [loggedInUserNumeroSocio, userName, form, editingSolicitud, birthdayPeopleOptions, currentTitular]);

  const onSubmit = (data: SolicitudCumpleanos) => {
    const allSolicitudesFromStorage: SolicitudCumpleanos[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    
    const yearOfEvent = new Date(data.fechaEvento).getFullYear();
    const existingRequestForPersonInYear = allSolicitudesFromStorage.find(req => 
      req.idCumpleanero === data.idCumpleanero &&
      new Date(req.fechaEvento).getFullYear() === yearOfEvent &&
      (!editingSolicitud || req.id !== editingSolicitud.id) 
    );

    if (existingRequestForPersonInYear) {
      toast({
        title: "Solicitud Duplicada",
        description: `${data.nombreCumpleanero} ya tiene un festejo solicitado para el año ${yearOfEvent}. Solo se permite un festejo por persona al año.`,
        variant: "destructive",
        duration: 7000,
      });
      return;
    }

    if (editingSolicitud) {
      const index = allSolicitudesFromStorage.findIndex(s => s.id === editingSolicitud.id);
      if (index > -1) {
        allSolicitudesFromStorage[index] = { ...data, fechaEvento: data.fechaEvento };
      }
      toast({ title: "Solicitud Actualizada", description: "El festejo de cumpleaños ha sido actualizado." });
    } else {
      allSolicitudesFromStorage.push({ ...data, fechaEvento: data.fechaEvento });
      toast({ title: "Solicitud Guardada", description: "Tu festejo de cumpleaños ha sido registrado." });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allSolicitudesFromStorage));
    window.dispatchEvent(new Event('cumpleanosDBUpdated'));
    loadSolicitudes();
    setIsFormOpen(false);
    setEditingSolicitud(null);
    form.reset({
      id: generateId(),
      idSocioTitular: loggedInUserNumeroSocio || '',
      nombreSocioTitular: userName || '',
      idCumpleanero: currentTitular?.dni || '',
      nombreCumpleanero: currentTitular ? `${currentTitular.nombre} ${currentTitular.apellido}`: '',
      fechaEvento: new Date(),
      listaInvitados: [{ nombre: '', apellido: '', dni: '', telefono: '', email: '', ingresado: false }],
      estado: EstadoSolicitudCumpleanos.APROBADA,
      fechaSolicitud: new Date().toISOString(),
      titularIngresadoEvento: false,
    });
  };

  const handleOpenForm = (solicitud?: SolicitudCumpleanos) => {
    loadTitularData(); 
    if (solicitud) {
      setEditingSolicitud(solicitud);
      form.reset({
        ...solicitud,
        fechaEvento: new Date(solicitud.fechaEvento),
        listaInvitados: solicitud.listaInvitados.length > 0 ? solicitud.listaInvitados : [{ nombre: '', apellido: '', dni: ''}]
      });
    } else {
      setEditingSolicitud(null);
      form.reset({
        id: generateId(),
        idSocioTitular: loggedInUserNumeroSocio || '',
        nombreSocioTitular: userName || '',
        idCumpleanero: currentTitular?.dni || '',
        nombreCumpleanero: currentTitular ? `${currentTitular.nombre} ${currentTitular.apellido}` : '',
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

  const selectedIdCumpleanero = form.watch('idCumpleanero');
  const selectedFechaEvento = form.watch('fechaEvento');
  const yearOfSelectedEvent = selectedFechaEvento ? new Date(selectedFechaEvento).getFullYear() : null;

  const hasExistingRequestForYear = useMemo(() => {
    if (!selectedIdCumpleanero || !yearOfSelectedEvent) return false;
    const allSolicitudesFromStorage: SolicitudCumpleanos[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return allSolicitudesFromStorage.some(req => 
      req.idCumpleanero === selectedIdCumpleanero &&
      new Date(req.fechaEvento).getFullYear() === yearOfSelectedEvent &&
      (!editingSolicitud || req.id !== editingSolicitud.id)
    );
  }, [selectedIdCumpleanero, yearOfSelectedEvent, editingSolicitud]);


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
            Aquí puedes solicitar el espacio para tu festejo de cumpleaños (uno por persona del grupo familiar al año) y gestionar tu lista de hasta {MAX_INVITADOS_CUMPLEANOS} invitados.
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
                            <CardTitle className="text-lg">Festejo de {solicitud.nombreCumpleanero} el {formatDate(solicitud.fechaEvento, "dd 'de' MMMM yyyy")}</CardTitle>
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
                idCumpleanero: currentTitular?.dni || '',
                nombreCumpleanero: currentTitular ? `${currentTitular.nombre} ${currentTitular.apellido}`: '',
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
            <DialogTitle className="text-xl">{editingSolicitud ? `Editar Festejo de ${editingSolicitud.nombreCumpleanero}` : 'Nueva Solicitud de Cumpleaños'}</DialogTitle>
            <DialogDescription>
              {editingSolicitud ? 'Modifica los detalles de tu festejo.' : `Completa los datos del festejo. Recuerda: un festejo por persona del grupo familiar al año.`}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-200px)] p-1 -mx-1">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4 pr-6">
                {!editingSolicitud ? (
                  <FormField
                    control={form.control}
                    name="idCumpleanero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center"><UserCheck className="mr-2 h-4 w-4 text-primary"/>¿Quién cumple años?</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            const selectedPerson = birthdayPeopleOptions.find(p => p.value === value);
                            if (selectedPerson) {
                              form.setValue('nombreCumpleanero', selectedPerson.fullName);
                            }
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione quién cumple años" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {birthdayPeopleOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <p className="text-sm"><strong>Cumpleañero/a:</strong> {form.getValues('nombreCumpleanero')}</p>
                )}

                <FormField
                  control={form.control}
                  name="fechaEvento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha del Evento</FormLabel>
                      <FormControl>
                        <div className="relative">
                           <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                           <Input
                              type="date"
                              value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                              onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)}
                              min={format(new Date(), 'yyyy-MM-dd')}
                              className="w-full pl-10"
                            />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {hasExistingRequestForYear && !editingSolicitud && (
                  <Alert variant="destructive">
                    <AlertTitle>Advertencia</AlertTitle>
                    <AlertDescription>
                      {form.getValues('nombreCumpleanero')} ya tiene un festejo solicitado para el año {yearOfSelectedEvent}. Solo se permite un festejo por persona al año.
                    </AlertDescription>
                  </Alert>
                )}

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
                  <Button type="submit" disabled={form.formState.isSubmitting || (hasExistingRequestForYear && !editingSolicitud)}>
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
