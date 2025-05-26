'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Socio, RevisionMedica } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NuevaRevisionDialog } from './NuevaRevisionDialog';
import { formatDate, getAptoMedicoStatus } from '@/lib/helpers';
import { parseISO, isToday, isSameMonth, isBefore, addDays, differenceInDays } from 'date-fns';
import { Activity, AlertTriangle, CalendarCheck, CalendarClock, Eye, Users, FileSpreadsheet } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface Stats {
  revisionesHoy: number;
  aptosPendientesVencidos: number;
  vencimientosProximos: number;
  revisionesEsteMes: number;
}

export function PanelMedicoDashboard() {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [revisiones, setRevisiones] = useState<RevisionMedica[]>([]);
  const [stats, setStats] = useState<Stats>({
    revisionesHoy: 0,
    aptosPendientesVencidos: 0,
    vencimientosProximos: 0,
    revisionesEsteMes: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    const storedSocios = localStorage.getItem('sociosDB');
    const sociosData: Socio[] = storedSocios ? JSON.parse(storedSocios) : [];
    setSocios(sociosData);

    const storedRevisiones = localStorage.getItem('revisionesDB');
    const revisionesData: RevisionMedica[] = storedRevisiones ? JSON.parse(storedRevisiones) : [];
    // Sort revisiones by date descending
    revisionesData.sort((a, b) => parseISO(b.fechaRevision).getTime() - parseISO(a.fechaRevision).getTime());
    setRevisiones(revisionesData);
    
    // Calculate stats
    const today = new Date();
    today.setHours(0,0,0,0);

    const revHoy = revisionesData.filter(r => isToday(parseISO(r.fechaRevision))).length;
    
    let aptosPendVenc = 0;
    let vencProximos = 0;
    sociosData.forEach(s => {
      const status = getAptoMedicoStatus(s.aptoMedico);
      if (status.status === 'Vencido' || status.status === 'Inválido' || status.status === 'Pendiente') {
        aptosPendVenc++;
      }
      if (s.aptoMedico?.valido && s.aptoMedico.fechaVencimiento) {
        const fechaVenc = parseISO(s.aptoMedico.fechaVencimiento);
        const diff = differenceInDays(fechaVenc, today);
        if (diff >= 0 && diff <= 7) { // Vence en 7 días o menos (incluyendo hoy)
          vencProximos++;
        }
      }
    });

    const revMes = revisionesData.filter(r => isSameMonth(parseISO(r.fechaRevision), today)).length;

    setStats({
      revisionesHoy: revHoy,
      aptosPendientesVencidos: aptosPendVenc,
      vencimientosProximos: vencProximos,
      revisionesEsteMes: revMes,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('sociosDBUpdated', loadData);
    return () => {
      window.removeEventListener('sociosDBUpdated', loadData);
    };
  }, [loadData]);

  const handleViewRevision = (revisionId: string) => {
    toast({
      title: 'Función no implementada',
      description: `Ver detalles de revisión ${revisionId} (simulado).`,
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const statCards = [
    { title: "Revisiones Hoy", value: stats.revisionesHoy, icon: Activity, color: "text-blue-500" },
    { title: "Aptos Pendientes/Vencidos", value: stats.aptosPendientesVencidos, icon: AlertTriangle, color: "text-red-500" },
    { title: "Vencimientos Próximos (≤7d)", value: stats.vencimientosProximos, icon: CalendarClock, color: "text-orange-500" },
    { title: "Revisiones Este Mes", value: stats.revisionesEsteMes, icon: CalendarCheck, color: "text-green-500" },
  ];


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Panel Médico</h1>
        <NuevaRevisionDialog onRevisionGuardada={loadData} open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map(stat => (
          <Card key={stat.title} className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><FileSpreadsheet className="mr-2 h-6 w-6 text-primary"/> Últimas Revisiones Registradas</CardTitle>
          <CardDescription>Mostrando las últimas 10 revisiones.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha Revisión</TableHead>
                  <TableHead>Socio</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Vencimiento Apto</TableHead>
                  <TableHead>Observaciones</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revisiones.slice(0, 10).map((revision) => {
                  const aptoStatus = getAptoMedicoStatus({
                    valido: revision.resultado === 'Apto',
                    fechaVencimiento: revision.fechaVencimientoApto,
                    // razonInvalidez and observaciones could be derived or set if needed for this display
                  });
                  return (
                    <TableRow key={revision.id}>
                      <TableCell>{formatDate(revision.fechaRevision)}</TableCell>
                      <TableCell>{revision.socioNombre} ({revision.socioId})</TableCell>
                      <TableCell>
                        <Badge variant={revision.resultado === 'Apto' ? 'default' : 'destructive'} className={revision.resultado === 'Apto' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}>
                          {revision.resultado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {revision.resultado === 'Apto' && revision.fechaVencimientoApto 
                          ? formatDate(revision.fechaVencimientoApto) 
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{revision.observaciones || '-'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleViewRevision(revision.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {revisiones.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No hay revisiones registradas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
