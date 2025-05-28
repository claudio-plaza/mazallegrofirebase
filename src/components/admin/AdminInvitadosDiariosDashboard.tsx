
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { SolicitudInvitadosDiarios, InvitadoDiario } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Download, CalendarDays, Users2, Search } from 'lucide-react';
import { formatDate, generateId } from '@/lib/helpers';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label'; // Added import for Label

const INVITADOS_DIARIOS_DB_KEY = 'invitadosDiariosDB';

export function AdminInvitadosDiariosDashboard() {
  const [todasLasSolicitudes, setTodasLasSolicitudes] = useState<SolicitudInvitadosDiarios[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const storedData = localStorage.getItem(INVITADOS_DIARIOS_DB_KEY);
    if (storedData) {
      const allSolicitudes: SolicitudInvitadosDiarios[] = JSON.parse(storedData);
      setTodasLasSolicitudes(allSolicitudes);
    }
    setLoading(false);
  }, []);

  const solicitudesFiltradas = useMemo(() => {
    if (!selectedDate) return [];
    const selectedDateISO = format(selectedDate, 'yyyy-MM-dd');
    return todasLasSolicitudes.filter(s => s.fecha === selectedDateISO);
  }, [selectedDate, todasLasSolicitudes]);

  const handleDescargarListaInvitadosDiarios = () => {
    if (solicitudesFiltradas.length === 0) {
      toast({
        title: "Lista de Invitados Diarios Vacía",
        description: `No hay invitados registrados para el ${selectedDate ? formatDate(selectedDate, "dd/MM/yyyy") : 'día seleccionado'}.`,
        variant: "default",
      });
      return;
    }

    console.log(`Simulando generación de PDF para invitados diarios del ${selectedDate ? formatDate(selectedDate, "dd/MM/yyyy") : ''}:`, solicitudesFiltradas);
    toast({
      title: "Descarga de Invitados Diarios Iniciada (Simulada)",
      description: `Se está generando un PDF con las listas de invitados del ${selectedDate ? formatDate(selectedDate, "dd/MM/yyyy") : ''}. (Ver consola para datos).`,
    });
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
              <Label htmlFor="date-picker-invitados-diarios">Seleccionar Fecha:</Label> {/* Changed FormLabel to Label and added htmlFor */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-picker-invitados-diarios" // Added id for the Label
                    variant={"outline"}
                    className={cn(
                      "w-full sm:w-[280px] justify-start text-left font-normal mt-1",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button 
              onClick={handleDescargarListaInvitadosDiarios} 
              disabled={loading || solicitudesFiltradas.length === 0}
              className="w-full sm:w-auto mt-2 sm:mt-0 self-end sm:self-center"
            >
              <Download className="mr-2 h-4 w-4" /> 
              {loading ? 'Cargando...' : 'Descargar Lista de Invitados (PDF)'}
            </Button>
          </div>

          {loading && <p className="text-center py-4">Cargando listas de invitados...</p>}
          
          {!loading && !selectedDate && (
            <div className="text-center py-10 px-6 border border-dashed rounded-md mt-6">
                <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl font-medium text-foreground">Seleccione una fecha</p>
                <p className="text-muted-foreground mt-1">Por favor, elija una fecha para ver los invitados.</p>
            </div>
          )}

          {!loading && selectedDate && solicitudesFiltradas.length === 0 && (
            <div className="text-center py-10 px-6 border border-dashed rounded-md mt-6">
                <Users2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl font-medium text-foreground">No hay invitados registrados</p>
                <p className="text-muted-foreground mt-1">No se encontraron listas de invitados para el día {formatDate(selectedDate, "dd/MM/yyyy")}.</p>
            </div>
          )}

          {!loading && solicitudesFiltradas.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold">
                Invitados para el {formatDate(selectedDate, "dd 'de' MMMM 'de' yyyy")} ({solicitudesFiltradas.length} socio(s) con invitados):
              </h3>
              <ScrollArea className="h-[500px] w-full border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Socio Titular</TableHead>
                      <TableHead>N° Socio</TableHead>
                      <TableHead>Invitados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {solicitudesFiltradas.map(solicitud => (
                      <TableRow key={solicitud.id}>
                        <TableCell className="font-medium">{solicitud.nombreSocioTitular}</TableCell>
                        <TableCell>{solicitud.idSocioTitular}</TableCell>
                        <TableCell>
                          {solicitud.listaInvitadosDiarios.length > 0 ? (
                            <ul className="list-disc list-inside text-xs">
                              {solicitud.listaInvitadosDiarios.map(inv => (
                                <li key={inv.dni}>
                                  {inv.nombre} {inv.apellido} (DNI: {inv.dni})
                                  {inv.ingresado && <Badge variant="default" className="ml-2 bg-green-500 text-xs">Ingresó</Badge>}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
