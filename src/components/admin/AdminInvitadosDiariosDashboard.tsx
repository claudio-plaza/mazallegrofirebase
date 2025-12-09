
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { SolicitudInvitadosDiarios, InvitadoDiario, MetodoPagoInvitado, RegistroAcceso } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Download, CalendarDays, Users2, Search, CircleDollarSign, Gift, Baby, CreditCard, Banknote, Archive } from 'lucide-react';
import { formatDate } from '@/lib/helpers';
import { format, parseISO, isValid, differenceInYears } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { getAllSolicitudesInvitadosDiarios as fetchAllSolicitudesInvitadosDiarios, getRegistrosAccesoPorFecha } from '@/lib/firebase/firestoreService';


interface StatsInvitadosDiarios {
  sociosConListas: number;
  invitadosTotales: number;
  invitadosIngresaronTotal: number;
  ingresaronCumpleanos: number;
  ingresaronPagaronEfectivo: number;
  ingresaronPagaronTransferencia: number;
  ingresaronPagaronCaja: number;
  ingresaronMenoresGratis: number; // Se mantiene por si se quiere usar en el futuro
}

interface InvitadoConIngreso extends InvitadoDiario {
  ingresado: boolean;
  datosIngreso?: RegistroAcceso;
}

interface SolicitudConInvitadosDeIngreso extends Omit<SolicitudInvitadosDiarios, 'listaInvitadosDiarios'> {
  listaInvitadosDiarios: InvitadoConIngreso[];
}

export function AdminInvitadosDiariosDashboard() {
  const [todasLasSolicitudes, setTodasLasSolicitudes] = useState<SolicitudInvitadosDiarios[]>([]);
  const [registrosDelDia, setRegistrosDelDia] = useState<RegistroAcceso[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
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
    loadData();
  }, [selectedDate, toast]);

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
