
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { SolicitudInvitadosDiarios, InvitadoDiario, Socio, MetodoPagoInvitado, RegistroAcceso } from '@/types';
import { invitadoDiarioSchema, EstadoSolicitudInvitados } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Download, CalendarDays, Users2, Search, CircleDollarSign, Gift, Baby, CreditCard, Banknote, Archive, UserPlus, X, Save } from 'lucide-react';
import { formatDate, generateId, normalizeText } from '@/lib/helpers';
import { format, parseISO, isValid, differenceInYears } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import BuscadorUniversal from '@/components/shared/BuscadorUniversal';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { addOrUpdateSolicitudInvitadosDiarios, getSolicitudInvitadosDiarios, getAllSolicitudesInvitadosDiarios as fetchAllSolicitudesInvitadosDiarios, getRegistrosAccesoPorFecha } from '@/lib/firebase/firestoreService';


interface StatsInvitadosDiarios {
  sociosConListas: number;
  invitadosTotales: number;
  invitadosIngresaronTotal: number;
  ingresaronCumpleanos: number;
  ingresaronPagaronEfectivo: number;
  ingresaronPagaronTransferencia: number;
  ingresaronPagaronCaja: number;
  ingresaronMenoresGratis: number;
}

interface InvitadoConIngreso extends InvitadoDiario {
  ingresado: boolean;
  datosIngreso?: RegistroAcceso;
}

interface SolicitudConInvitadosDeIngreso extends Omit<SolicitudInvitadosDiarios, 'listaInvitadosDiarios'> {
  listaInvitadosDiarios: InvitadoConIngreso[];
}

type InvitadoFormData = z.infer<typeof invitadoDiarioSchema>;

export function AdminInvitadosDiariosDashboard() {
  const [todasLasSolicitudes, setTodasLasSolicitudes] = useState<SolicitudInvitadosDiarios[]>([]);
  const [registrosDelDia, setRegistrosDelDia] = useState<RegistroAcceso[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // State for creating lists
  const [selectedSocio, setSelectedSocio] = useState<Socio | null>(null);
  const [listaNuevosInvitados, setListaNuevosInvitados] = useState<InvitadoDiario[]>([]);
  const [existingSolicitud, setExistingSolicitud] = useState<SolicitudInvitadosDiarios | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InvitadoFormData>({
    resolver: zodResolver(invitadoDiarioSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      dni: '',
      fechaNacimiento: undefined,
      esDeCumpleanos: false,
    },
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const allSolicitudes = await fetchAllSolicitudesInvitadosDiarios();
      setTodasLasSolicitudes(allSolicitudes);

      if (selectedDate) {
        const registros = await getRegistrosAccesoPorFecha(selectedDate);
        setRegistrosDelDia(registros.filter(r => r.personaTipo === 'invitado'));
      } else {
        setRegistrosDelDia([]);
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los datos de invitados.", variant: "destructive"});
      console.error("Error fetching daily guest data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate, toast]);

  const handleSocioSelected = async (socio: Socio | null) => {
    setSelectedSocio(socio);
    setListaNuevosInvitados([]);
    setExistingSolicitud(null);
    form.reset();

    if (socio) {
      const todayISO = format(new Date(), 'yyyy-MM-dd');
      const solicitud = await getSolicitudInvitadosDiarios(socio.id, todayISO);
      if (solicitud) {
        setListaNuevosInvitados(solicitud.listaInvitadosDiarios);
        setExistingSolicitud(solicitud);
        toast({ title: "Lista existente cargada", description: `Se cargaron ${solicitud.listaInvitadosDiarios.length} invitados para ${socio.nombre}. Puedes agregar más.` });
      } else {
        toast({ title: "Socio seleccionado", description: `Puedes comenzar a agregar invitados para ${socio.nombre}.` });
      }
    }
  };

  const handleAddInvitadoToList = (data: InvitadoFormData) => {
    if (listaNuevosInvitados.some(inv => inv.dni === data.dni)) {
      form.setError('dni', { message: 'Este DNI ya está en la lista.' });
      return;
    }
    
    const nuevoInvitado: InvitadoDiario = {
      ...data,
      id: generateId(),
      ingresado: false,
      metodoPago: null,
    };
    setListaNuevosInvitados(prev => [...prev, nuevoInvitado]);
    form.reset();
    toast({ title: "Invitado agregado a la lista", description: `${nuevoInvitado.nombre} ${nuevoInvitado.apellido} está listo para ser guardado.`});
  };

  const handleRemoveInvitadoFromList = (dni: string) => {
    setListaNuevosInvitados(prev => prev.filter(inv => inv.dni !== dni));
  };
  
  const handleSaveList = async () => {
    if (!selectedSocio) {
      toast({ title: "Error", description: "No hay un socio seleccionado.", variant: "destructive" });
      return;
    }
    if (listaNuevosInvitados.length === 0) {
      toast({ title: "Lista vacía", description: "Agrega al menos un invitado antes de guardar.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const today = new Date();
      const todayISO = format(today, 'yyyy-MM-dd');
      
      const solicitudParaGuardar: SolicitudInvitadosDiarios = existingSolicitud ? {
        ...existingSolicitud,
        listaInvitadosDiarios: listaNuevosInvitados,
        fechaUltimaModificacion: today,
      } : {
        id: `invd-${selectedSocio.id}-${todayISO}`,
        idSocioTitular: selectedSocio.id,
        nombreSocioTitular: `${selectedSocio.nombre} ${selectedSocio.apellido}`,
        numeroSocioTitular: selectedSocio.numeroSocio,
        fecha: todayISO,
        listaInvitadosDiarios: listaNuevosInvitados,
        estado: EstadoSolicitudInvitados.PROCESADA, // Creada por admin, se asume procesada
        fechaCreacion: today,
        fechaUltimaModificacion: today,
        titularIngresadoEvento: false,
      };

      await addOrUpdateSolicitudInvitadosDiarios(solicitudParaGuardar);

      toast({ title: "Lista de invitados guardada", description: `Se guardó la lista para ${selectedSocio.nombre} con ${listaNuevosInvitados.length} invitados.`});

      // Reset state and reload data
      setSelectedSocio(null);
      setListaNuevosInvitados([]);
      setExistingSolicitud(null);
      form.reset();
      await loadData();

    } catch (error) {
      console.error("Error saving guest list:", error);
      toast({ title: "Error al guardar", description: "No se pudo guardar la lista de invitados.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };


  const solicitudesFiltradas = useMemo(() => {
    if (!selectedDate) return [];
    const selectedDateISO = format(selectedDate, 'yyyy-MM-dd');
    return todasLasSolicitudes.filter(s => s.fecha === selectedDateISO);
  }, [selectedDate, todasLasSolicitudes]);

  const solicitudesConDatosDeIngreso = useMemo((): SolicitudConInvitadosDeIngreso[] => {
    return solicitudesFiltradas.map(solicitud => {
      const listaInvitadosDiarios = solicitud.listaInvitadosDiarios.map(invitado => {
        const registro = registrosDelDia.find(r => r.personaDNI === invitado.dni);
        return {
          ...invitado,
          ingresado: !!registro,
          datosIngreso: registro
        };
      });
      return {
        ...solicitud,
        listaInvitadosDiarios
      };
    });
  }, [solicitudesFiltradas, registrosDelDia]);

  const estadisticasDia = useMemo((): StatsInvitadosDiarios => {
    const stats: StatsInvitadosDiarios = {
      sociosConListas: solicitudesConDatosDeIngreso.length,
      invitadosTotales: 0,
      invitadosIngresaronTotal: 0,
      ingresaronCumpleanos: 0,
      ingresaronPagaronEfectivo: 0,
      ingresaronPagaronTransferencia: 0,
      ingresaronPagaronCaja: 0,
      ingresaronMenoresGratis: 0,
    };

    solicitudesConDatosDeIngreso.forEach(solicitud => {
      stats.invitadosTotales += solicitud.listaInvitadosDiarios.length;
      solicitud.listaInvitadosDiarios.forEach(invitado => {
        if (invitado.ingresado && invitado.datosIngreso) {
          stats.invitadosIngresaronTotal++;
          
          if (invitado.datosIngreso.esInvitadoCumpleanos) {
            stats.ingresaronCumpleanos++;
          } else {
            switch (invitado.datosIngreso.metodoPago) {
              case 'Efectivo':
                stats.ingresaronPagaronEfectivo++;
                break;
              case 'Transferencia':
                stats.ingresaronPagaronTransferencia++;
                break;
              case 'Caja':
                stats.ingresaronPagaronCaja++;
                break;
            }
          }
        }
      });
    });
    return stats;
  }, [solicitudesConDatosDeIngreso]);

  const handleDescargarListaInvitadosDiarios = () => {
    if (solicitudesConDatosDeIngreso.length === 0) {
      toast({ title: "Lista Vacía", description: `No hay invitados para el ${selectedDate ? formatDate(selectedDate, "dd/MM/yyyy") : ''}.`, variant: "default" });
      return;
    }

    let reportContent = `Reporte de Invitados Diarios - Fecha: ${selectedDate ? formatDate(selectedDate, "dd/MM/yyyy") : 'N/A'}\n\n`;
    reportContent += `Resumen del Día:\n`;
    reportContent += `- Socios con Listas: ${estadisticasDia.sociosConListas}\n`;
    reportContent += `- Invitados Totales Registrados: ${estadisticasDia.invitadosTotales}\n`;
    reportContent += `- Invitados que Ingresaron (Total): ${estadisticasDia.invitadosIngresaronTotal}\n`;
    reportContent += `  - Gratis (Cumpleaños): ${estadisticasDia.ingresaronCumpleanos}\n`;
    reportContent += `  - Pagaron Efectivo: ${estadisticasDia.ingresaronPagaronEfectivo}\n`;
    reportContent += `  - Pagaron Transferencia: ${estadisticasDia.ingresaronPagaronTransferencia}\n`;
    reportContent += `  - Pagaron Caja: ${estadisticasDia.ingresaronPagaronCaja}\n\n`;
    reportContent += "Detalle por Socio:\n";

    solicitudesConDatosDeIngreso.forEach(solicitud => {
      reportContent += `\nSocio: ${solicitud.nombreSocioTitular} (N°: ${solicitud.idSocioTitular})\n`;
      reportContent += "Invitados:\n";
      if (solicitud.listaInvitadosDiarios.length > 0) {
        solicitud.listaInvitadosDiarios.forEach(inv => {
          let detalleIngreso = "Pendiente de Ingreso";
          if (inv.ingresado && inv.datosIngreso) {
            detalleIngreso = `Ingresó (${inv.datosIngreso.metodoPago || 'Pago no especificado'})`;
          }
          reportContent += `- ${inv.nombre} ${inv.apellido} (DNI: ${inv.dni}) - ${detalleIngreso}\n`;
        });
      } else {
        reportContent += "- Sin invitados en esta lista.\n";
      }
    });

    console.log("Contenido del reporte para PDF:\n", reportContent);

    toast({ title: "Descarga (Simulada)", description: "El contenido del reporte se ha mostrado en la consola.", duration: 7000 });
  };


  const getInvitadoBadge = (invitado: InvitadoConIngreso) => {
    if (!invitado.ingresado || !invitado.datosIngreso) {
        return <Badge variant="outline" className="text-xs">Pendiente</Badge>;
    }
    
    const { metodoPago, esInvitadoCumpleanos } = invitado.datosIngreso;

    if (esInvitadoCumpleanos) {
        return <Badge variant="secondary" className="text-xs bg-pink-500 hover:bg-pink-600 text-white"><Gift className="mr-1 h-3 w-3" /> Gratis (Cumpleaños)</Badge>;
    }
    
    let icon = <CircleDollarSign className="mr-1 h-3 w-3" />;
    let color = "bg-gray-500 hover:bg-gray-600";
    if (metodoPago === 'Efectivo') { icon = <Banknote className="mr-1 h-3 w-3"/>; color = "bg-green-500 hover:bg-green-600"; }
    if (metodoPago === 'Transferencia') { icon = <CreditCard className="mr-1 h-3 w-3"/>; color = "bg-blue-500 hover:bg-blue-600"; }
    if (metodoPago === 'Caja') { icon = <Archive className="mr-1 h-3 w-3"/>; color = "bg-orange-500 hover:bg-orange-600"; }
    
    return <Badge variant="default" className={`text-xs ${color} text-white`}>{icon} {metodoPago}</Badge>;
  };


  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center">
        <Users2 className="mr-3 h-8 w-8 text-primary" /> Gestión de Invitados Diarios
      </h1>

      <Card className="shadow-lg border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center"><UserPlus className="mr-2 h-6 w-6 text-primary"/>Crear o Editar Lista de Invitados para Hoy</CardTitle>
          <CardDescription>Busca un socio para ver su lista de hoy o para crear una nueva.</CardDescription>
        </CardHeader>
        <CardContent>
          <BuscadorUniversal 
            onSelect={async (persona) => {
              // persona.rawData contiene el Socio completo si es Socio Titular
              if (persona.tipo === 'Socio Titular' && persona.rawData) {
                await handleSocioSelected(persona.rawData as Socio);
              } else {
                toast({ title: "Solo Socios Titulares", description: "Por favor busque un socio titular para crear listas de invitados.", variant: "default" });
              }
            }}
            onNotFound={() => {
              toast({ title: "No encontrado", description: "No se encontró ningún socio con ese criterio.", variant: "default" });
            }}
            onSearchStart={() => setLoading(true)}
            onSearchEnd={() => setLoading(false)}
          />
          
          {selectedSocio && (
            <div className="mt-6 space-y-6">
              <Alert>
                <AlertTitle className="font-bold">Socio Seleccionado: {selectedSocio.nombre} {selectedSocio.apellido}</AlertTitle>
                <AlertDescription>
                  Número de Socio: {selectedSocio.numeroSocio}
                  <Button variant="link" size="sm" className="ml-4 h-auto p-0 text-destructive" onClick={() => handleSocioSelected(null)}>Cambiar Socio</Button>
                </AlertDescription>
              </Alert>

              <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(handleAddInvitadoToList)} className="p-4 border rounded-md">
                   <h3 className="text-md font-semibold mb-4">Añadir Nuevo Invitado</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                      <FormField name="nombre" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField name="apellido" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField name="dni" control={form.control} render={({ field }) => ( <FormItem><FormLabel>DNI</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField name="fechaNacimiento" control={form.control} render={({ field }) => (<FormItem><FormLabel>Fecha de Nacimiento</FormLabel><FormControl><Input type="date" value={field.value && isValid(new Date(field.value)) ? format(new Date(field.value), 'yyyy-MM-dd') : ''}  onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)} /></FormControl><FormMessage /></FormItem>)} />
                   </div>
                   <div className="flex justify-end mt-4">
                     <Button type="submit"><UserPlus className="mr-2 h-4 w-4"/>Agregar a la Lista</Button>
                   </div>
                </form>
              </FormProvider>

              {listaNuevosInvitados.length > 0 && (
                <div className="mt-4">
                   <h3 className="text-md font-semibold mb-2">Lista de Invitados para {selectedSocio.nombre} ({listaNuevosInvitados.length} en total)</h3>
                   <ScrollArea className="h-[200px] border rounded-md">
                    <Table>
                      <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>DNI</TableHead><TableHead>Acción</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {listaNuevosInvitados.map(inv => (
                          <TableRow key={inv.dni}>
                            <TableCell>{inv.nombre} {inv.apellido}</TableCell>
                            <TableCell>{inv.dni}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemoveInvitadoFromList(inv.dni)}><X className="h-4 w-4 mr-1"/>Quitar</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                   </ScrollArea>
                </div>
              )}

            </div>
          )}
        </CardContent>
        {selectedSocio && (
          <CardFooter className="border-t pt-6">
            <Button onClick={handleSaveList} disabled={isSubmitting || listaNuevosInvitados.length === 0} className="w-full sm:w-auto ml-auto" size="lg">
              <Save className="mr-2 h-5 w-5"/>
              {isSubmitting ? 'Guardando...' : `Guardar Lista (${listaNuevosInvitados.length})`}
            </Button>
          </CardFooter>
        )}
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Listas de Invitados Diarios por Fecha</CardTitle>
          <CardDescription>
            Selecciona una fecha para ver y descargar la lista de invitados diarios registrados por los socios.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-grow">
              <Label htmlFor="date-picker-invitados-diarios">Seleccionar Fecha:</Label>
              <div className="relative mt-1">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="date-picker-invitados-diarios"
                  type="date"
                  value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => setSelectedDate(e.target.value ? parseISO(e.target.value) : undefined)}
                  className="w-full sm:w-[280px] pl-10"
                />
              </div>
            </div>
            <Button
              onClick={handleDescargarListaInvitadosDiarios}
              disabled={loading || !selectedDate || solicitudesConDatosDeIngreso.length === 0}
              className="w-full sm:w-auto mt-2 sm:mt-0 self-end sm:self-center"
            >
              <Download className="mr-2 h-4 w-4" />
              {loading ? 'Cargando...' : 'Descargar Lista (TXT)'}
            </Button>
          </div>

          {loading && <p className="text-center py-4">Cargando datos...</p>}

          {!loading && !selectedDate && (
            <div className="text-center py-10 px-6 border border-dashed rounded-md mt-6">
                <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl font-medium text-foreground">Seleccione una fecha</p>
                <p className="text-muted-foreground mt-1">Por favor, elija una fecha para ver los invitados.</p>
            </div>
          )}

          {!loading && selectedDate && solicitudesConDatosDeIngreso.length === 0 && (
            <div className="text-center py-10 px-6 border border-dashed rounded-md mt-6">
                <Users2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl font-medium text-foreground">No hay invitados registrados</p>
                <p className="text-muted-foreground mt-1">No se encontraron listas de invitados para el día {formatDate(selectedDate, "dd/MM/yyyy")}.</p>
            </div>
          )}

          {!loading && selectedDate && solicitudesConDatosDeIngreso.length > 0 && (
            <>
              <Card className="mt-6 bg-muted/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Resumen de Ingresos: {formatDate(selectedDate, "dd 'de' MMMM")}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3 text-sm">
                  <div><strong>Socios con Listas:</strong> {estadisticasDia.sociosConListas}</div>
                  <div><strong>Invitados en Listas:</strong> {estadisticasDia.invitadosTotales}</div>
                  <div><strong>Ingresaron (Total):</strong> {estadisticasDia.invitadosIngresaronTotal}</div>
                  <Separator className="col-span-full my-1" />
                  <div className="flex items-center"><Gift className="mr-1.5 h-4 w-4 text-pink-500"/><strong>Gratis (Cumpleaños):</strong> {estadisticasDia.ingresaronCumpleanos}</div>
                  <div className="flex items-center"><Banknote className="mr-1.5 h-4 w-4 text-green-500"/><strong>Pagaron Efectivo:</strong> {estadisticasDia.ingresaronPagaronEfectivo}</div>
                  <div className="flex items-center"><CreditCard className="mr-1.5 h-4 w-4 text-blue-500"/><strong>Pagaron Transfer.:</strong> {estadisticasDia.ingresaronPagaronTransferencia}</div>
                  <div className="flex items-center"><Archive className="mr-1.5 h-4 w-4 text-orange-500"/><strong>Pagaron Caja:</strong> {estadisticasDia.ingresaronPagaronCaja}</div>
                </CardContent>
              </Card>

              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-semibold">
                  Detalle de Invitados para el {formatDate(selectedDate, "dd 'de' MMMM 'de' yyyy")}
                </h3>
                <ScrollArea className="h-[500px] w-full border rounded-md overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30%]">Socio Titular (N° Socio)</TableHead>
                        <TableHead>Invitados</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {solicitudesConDatosDeIngreso.map(solicitud => (
                        <TableRow key={solicitud.id}>
                          <TableCell className="font-medium align-top">
                            {solicitud.nombreSocioTitular}
                            <span className="block text-xs text-muted-foreground">({solicitud.idSocioTitular})</span>
                          </TableCell>
                          <TableCell>
                            {solicitud.listaInvitadosDiarios.length > 0 ? (
                              <ul className="space-y-1.5">
                                {solicitud.listaInvitadosDiarios.map(inv => (
                                  <li key={inv.dni} className="text-xs border-b border-dashed pb-1 last:border-b-0 last:pb-0">
                                    <div className="flex justify-between items-center">
                                        <span>{inv.nombre} {inv.apellido} (DNI: {inv.dni})</span>
                                        {getInvitadoBadge(inv)}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-xs text-muted-foreground">Sin invitados en esta lista.</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
