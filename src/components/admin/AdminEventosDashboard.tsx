
'use client';

import { useState, useEffect } from 'react';
import type { SolicitudCumpleanos } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Download, CalendarDays, ListChecks } from 'lucide-react';
import { formatDate } from '@/lib/helpers';

const CUMPLEANOS_DB_KEY = 'cumpleanosDB';

export function AdminEventosDashboard() {
  const [solicitudes, setSolicitudes] = useState<SolicitudCumpleanos[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const storedData = localStorage.getItem(CUMPLEANOS_DB_KEY);
    if (storedData) {
      const allSolicitudes: SolicitudCumpleanos[] = JSON.parse(storedData);
      setSolicitudes(allSolicitudes.map(s => ({ ...s, fechaEvento: new Date(s.fechaEvento)})));
    }
    setLoading(false);
  }, []);

  const handleDescargarListaCumpleanos = () => {
    if (solicitudes.length === 0) {
      toast({
        title: "Lista de Cumpleaños Vacía",
        description: "No hay solicitudes de cumpleaños registradas para descargar.",
        variant: "default",
      });
      return;
    }

    console.log("Simulando generación de PDF para las siguientes solicitudes de cumpleaños:", solicitudes);
    toast({
      title: "Descarga de Cumpleaños Iniciada (Simulada)",
      description: `Se está generando un PDF con ${solicitudes.length} solicitud(es) de cumpleaños. (Ver consola para datos).`,
    });
    // In a real scenario, you would use a library like jsPDF or react-pdf here.
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center">
        <CalendarDays className="mr-3 h-8 w-8 text-primary" /> Gestión de Eventos del Club
      </h1>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Lista de Cumpleaños Solicitados</CardTitle>
          <CardDescription>
            Aquí puedes ver un resumen y descargar la lista completa de todas las solicitudes de cumpleaños.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button onClick={handleDescargarListaCumpleanos} disabled={loading || solicitudes.length === 0}>
            <Download className="mr-2 h-4 w-4" /> 
            {loading ? 'Cargando...' : 'Descargar Lista de Cumpleaños (PDF)'}
          </Button>

          {loading && <p>Cargando solicitudes...</p>}
          
          {!loading && solicitudes.length === 0 && (
            <div className="text-center py-10 px-6 border border-dashed rounded-md mt-6">
                <ListChecks className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl font-medium text-foreground">No hay solicitudes de cumpleaños.</p>
                <p className="text-muted-foreground mt-1">Cuando los socios creen solicitudes, aparecerán aquí.</p>
            </div>
          )}

          {!loading && solicitudes.length > 0 && (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-muted-foreground">Se encontraron {solicitudes.length} solicitudes de cumpleaños.</p>
              {/* Podríamos mostrar un resumen aquí si fuera necesario, pero el foco es la descarga */}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
