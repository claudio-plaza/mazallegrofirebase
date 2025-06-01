
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { SolicitudCumpleanos } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Download, CalendarDays, ListChecks, Search } from 'lucide-react';
import { formatDate } from '@/lib/helpers';
import { format, parseISO, isValid, isSameDay } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const CUMPLEANOS_DB_KEY = 'cumpleanosDB';

export function AdminEventosDashboard() {
  const [todasLasSolicitudes, setTodasLasSolicitudes] = useState<SolicitudCumpleanos[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const storedData = localStorage.getItem(CUMPLEANOS_DB_KEY);
    if (storedData) {
      const allSolicitudesRaw: SolicitudCumpleanos[] = JSON.parse(storedData);
      const allSolicitudesProcessed = allSolicitudesRaw.map(s => ({
        ...s,
        fechaEvento: s.fechaEvento ? parseISO(s.fechaEvento as unknown as string) : new Date(0) 
      }));
      setTodasLasSolicitudes(allSolicitudesProcessed);
    }
    setLoading(false);
  }, []);

  const solicitudesFiltradas = useMemo(() => {
    if (!selectedDate) return todasLasSolicitudes; 
    return todasLasSolicitudes.filter(s => 
        s.fechaEvento && isValid(s.fechaEvento) && isSameDay(s.fechaEvento, selectedDate)
    );
  }, [selectedDate, todasLasSolicitudes]);

  const handleDescargarListaCumpleanos = () => {
    const targetSolicitudes = selectedDate ? solicitudesFiltradas : todasLasSolicitudes;
    if (targetSolicitudes.length === 0) {
      toast({
        title: "Lista de Cumpleaños Vacía",
        description: `No hay solicitudes de cumpleaños ${selectedDate ? `para el ${formatDate(selectedDate, "dd/MM/yyyy")}` : 'registradas'} para descargar.`,
        variant: "default",
      });
      return;
    }

    console.log(`Simulando generación de PDF para ${selectedDate ? `cumpleaños del ${formatDate(selectedDate, "dd/MM/yyyy")}` : 'todos los cumpleaños'}:`, targetSolicitudes);
    toast({
      title: "Descarga de Cumpleaños Iniciada (Simulada)",
      description: `Se está generando un PDF con ${targetSolicitudes.length} solicitud(es) de cumpleaños. (Ver consola para datos).`,
    });
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center">
        <CalendarDays className="mr-3 h-8 w-8 text-primary" /> Gestión de Eventos (Cumpleaños)
      </h1>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Lista de Cumpleaños Solicitados</CardTitle>
          <CardDescription>
            Selecciona una fecha para filtrar los cumpleaños o descarga la lista completa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-grow">
              <Label htmlFor="date-picker-cumpleanos">Filtrar por Fecha de Evento (Opcional):</Label>
              <div className="relative mt-1">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="date-picker-cumpleanos"
                  type="date"
                  value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => setSelectedDate(e.target.value ? parseISO(e.target.value) : undefined)}
                  className="w-full sm:w-[280px] pl-10"
                />
              </div>
               {selectedDate && (
                <Button variant="link" size="sm" onClick={() => setSelectedDate(undefined)} className="pl-2 text-xs">Limpiar filtro</Button>
              )}
            </div>
            <Button 
                onClick={handleDescargarListaCumpleanos} 
                disabled={loading || (selectedDate && solicitudesFiltradas.length === 0) || (!selectedDate && todasLasSolicitudes.length === 0) }
                className="w-full sm:w-auto mt-2 sm:mt-0 self-end sm:self-center"
            >
              <Download className="mr-2 h-4 w-4" /> 
              {loading ? 'Cargando...' : 'Descargar Lista de Cumpleaños (PDF)'}
            </Button>
          </div>

          {loading && <p className="text-center py-4">Cargando solicitudes...</p>}
          
          {!loading && solicitudesFiltradas.length === 0 && (
            <div className="text-center py-10 px-6 border border-dashed rounded-md mt-6">
                <ListChecks className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl font-medium text-foreground">No hay solicitudes de cumpleaños.</p>
                <p className="text-muted-foreground mt-1">
                  {selectedDate ? `No se encontraron cumpleaños para el ${formatDate(selectedDate, "dd/MM/yyyy")}.` : 'Cuando los socios creen solicitudes, aparecerán aquí.'}
                </p>
            </div>
          )}

          {!loading && solicitudesFiltradas.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-lg font-semibold">
                {selectedDate 
                    ? `Solicitudes para el ${formatDate(selectedDate, "dd 'de' MMMM 'de' yyyy")}` 
                    : `Todas las Solicitudes (${todasLasSolicitudes.length})`
                }
              </h3>
              <ScrollArea className="h-[500px] w-full border rounded-md">
                 <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha Evento</TableHead>
                      <TableHead>Cumpleañero/a</TableHead>
                      <TableHead>Socio Titular</TableHead>
                      <TableHead>N° Invitados</TableHead>
                      <TableHead>Estado Solicitud</TableHead>
                      <TableHead>Titular Ingresó</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {solicitudesFiltradas.map(solicitud => (
                      <TableRow key={solicitud.id}>
                        <TableCell>{formatDate(solicitud.fechaEvento, "dd/MM/yy")}</TableCell>
                        <TableCell className="font-medium">{solicitud.nombreCumpleanero}</TableCell>
                        <TableCell>{solicitud.nombreSocioTitular} (N°: {solicitud.idSocioTitular})</TableCell>
                        <TableCell className="text-center">{solicitud.listaInvitados.length}</TableCell>
                        <TableCell><Badge variant={solicitud.estado === 'Aprobada' ? 'default' : 'secondary'} className={solicitud.estado === 'Aprobada' ? 'bg-green-500' : ''}>{solicitud.estado}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={solicitud.titularIngresadoEvento ? 'default' : 'outline'} className={solicitud.titularIngresadoEvento ? 'bg-green-600' : ''}>
                            {solicitud.titularIngresadoEvento ? 'Sí' : 'No'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
