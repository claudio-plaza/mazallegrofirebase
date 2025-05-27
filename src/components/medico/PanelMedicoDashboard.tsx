
'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Socio, RevisionMedica } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NuevaRevisionDialog } from './NuevaRevisionDialog';
import { formatDate, getAptoMedicoStatus } from '@/lib/helpers';
import { parseISO, isToday, isSameMonth, differenceInDays } from 'date-fns';
import { Activity, AlertTriangle, CalendarCheck, CalendarClock, Eye, Users, FileSpreadsheet, Search, UserCircle, ShieldCheck, ShieldAlert, Stethoscope } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '../ui/separator';

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

  const [searchTerm, setSearchTerm] = useState('');
  const [searchedSocio, setSearchedSocio] = useState<Socio | null>(null);
  const [searchMessage, setSearchMessage] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);


  const loadData = useCallback(() => {
    setLoading(true);
    const storedSocios = localStorage.getItem('sociosDB');
    const sociosData: Socio[] = storedSocios ? JSON.parse(storedSocios) : [];
    setSocios(sociosData);

    const storedRevisiones = localStorage.getItem('revisionesDB');
    const revisionesData: RevisionMedica[] = storedRevisiones ? JSON.parse(storedRevisiones) : [];
    revisionesData.sort((a, b) => parseISO(b.fechaRevision).getTime() - parseISO(a.fechaRevision).getTime());
    setRevisiones(revisionesData);
    
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
        if (diff >= 0 && diff <= 7) { 
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
    window.addEventListener('sociosDBUpdated', loadData); // Listen for updates from NuevaRevisionDialog or other components
    return () => {
      window.removeEventListener('sociosDBUpdated', loadData);
    };
  }, [loadData]);

  const handleSearchSocio = useCallback(() => {
    if (!searchTerm.trim()) {
      setSearchMessage('Por favor, ingrese N° Socio, DNI o Nombre.');
      setSearchedSocio(null);
      return;
    }
    setSearchLoading(true);
    setSearchedSocio(null);
    
    const searchTermLower = searchTerm.trim().toLowerCase();
    const socio = socios.find(s =>
      s.numeroSocio === searchTerm.trim() ||
      s.dni === searchTerm.trim() ||
      `${s.nombre.toLowerCase()} ${s.apellido.toLowerCase()}`.includes(searchTermLower) ||
      s.nombre.toLowerCase().includes(searchTermLower) ||
      s.apellido.toLowerCase().includes(searchTermLower)
    );

    if (socio) {
      setSearchedSocio(socio);
      setSearchMessage('');
    } else {
      setSearchMessage('Socio no encontrado.');
    }
    setSearchLoading(false);
  }, [searchTerm, socios]);

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearchSocio();
    }
  };

  // Effect to re-search if socio data updates (e.g., after a new revision)
  useEffect(() => {
    if (searchedSocio) {
      const updatedSocio = socios.find(s => s.id === searchedSocio.id);
      if (updatedSocio) {
        setSearchedSocio(updatedSocio);
      } else {
        // If the previously searched socio is no longer in the list (e.g., deleted by admin), clear the search
        setSearchedSocio(null);
        setSearchMessage('El socio buscado ya no se encuentra en los registros.');
      }
    }
  }, [socios, searchedSocio?.id]);


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
        <Skeleton className="h-12 w-full" /> {/* For search bar area */}
        <Skeleton className="h-48 w-full" /> {/* For search result area */}
        <Skeleton className="h-96 w-full" /> {/* For table area */}
      </div>
    );
  }

  const statCards = [
    { title: "Revisiones Hoy", value: stats.revisionesHoy, icon: Activity, color: "text-blue-500" },
    { title: "Aptos Pendientes/Vencidos", value: stats.aptosPendientesVencidos, icon: AlertTriangle, color: "text-red-500" },
    { title: "Vencimientos Próximos (≤7d)", value: stats.vencimientosProximos, icon: CalendarClock, color: "text-orange-500" },
    { title: "Revisiones Este Mes", value: stats.revisionesEsteMes, icon: CalendarCheck, color: "text-green-500" },
  ];

  const searchedSocioAptoStatus = searchedSocio ? getAptoMedicoStatus(searchedSocio.aptoMedico) : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center"><Stethoscope className="mr-3 h-8 w-8 text-primary"/>Panel Médico</h1>
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
          <CardTitle className="flex items-center"><Search className="mr-2 h-6 w-6 text-primary"/>Buscar Socio</CardTitle>
          <CardDescription>Ingrese N° Socio, DNI o Nombre para verificar su apto médico.</CardDescription>
          <div className="flex space-x-2 pt-4">
            <Input
              type="text"
              placeholder="Buscar por N° Socio, DNI, Nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-grow"
            />
            <Button onClick={handleSearchSocio} disabled={searchLoading}>
              <Search className="mr-2 h-4 w-4" /> {searchLoading ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
        </CardHeader>
        {searchMessage && <CardContent><p className="text-sm text-center text-muted-foreground pt-2">{searchMessage}</p></CardContent>}
        
        {searchLoading && (
            <CardContent className="pt-4 space-y-3">
                <Skeleton className="h-24 w-24 rounded-full mx-auto" />
                <Skeleton className="h-6 w-3/4 mx-auto" />
                <Skeleton className="h-4 w-1/2 mx-auto" />
            </CardContent>
        )}

        {searchedSocio && !searchLoading && searchedSocioAptoStatus && (
          <CardContent className="pt-4">
            <Card className="bg-muted/30 p-6 shadow-md">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Avatar className="h-24 w-24 border-2 border-primary">
                  <AvatarImage src={searchedSocio.fotoUrl || `https://placehold.co/96x96.png?text=${searchedSocio.nombre[0]}${searchedSocio.apellido[0]}`} alt={`${searchedSocio.nombre} ${searchedSocio.apellido}`} data-ai-hint="member photo" />
                  <AvatarFallback className="text-3xl">{searchedSocio.nombre[0]}{searchedSocio.apellido[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1 text-center sm:text-left">
                  <h3 className="text-2xl font-semibold text-primary">{searchedSocio.nombre} {searchedSocio.apellido}</h3>
                  <p className="text-sm text-muted-foreground">
                    N° Socio: <span className="font-medium text-foreground">{searchedSocio.numeroSocio}</span> | DNI: <span className="font-medium text-foreground">{searchedSocio.dni}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Fecha de Nacimiento: {formatDate(searchedSocio.fechaNacimiento)}
                  </p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className={`p-4 rounded-lg border ${searchedSocioAptoStatus.colorClass.replace('text-', 'text-').replace('bg-', 'bg-opacity-10 border-')}`}>
                  <div className="flex items-center mb-2">
                    {searchedSocioAptoStatus.status === 'Válido' && <ShieldCheck className={`h-7 w-7 mr-2 ${searchedSocioAptoStatus.colorClass.replace('bg-', 'text-').replace('-100', '-500')}`} />}
                    {(searchedSocioAptoStatus.status === 'Vencido' || searchedSocioAptoStatus.status === 'Inválido') && <ShieldAlert className={`h-7 w-7 mr-2 ${searchedSocioAptoStatus.colorClass.replace('bg-', 'text-').replace('-100', '-500')}`} />}
                    {searchedSocioAptoStatus.status === 'Pendiente' && <CalendarClock className={`h-7 w-7 mr-2 ${searchedSocioAptoStatus.colorClass.replace('bg-', 'text-').replace('-100', '-500')}`} />}
                    <h4 className={`text-xl font-semibold ${searchedSocioAptoStatus.colorClass.replace('bg-', 'text-').replace('-100', '-600')}`}>
                      Apto Médico: {searchedSocioAptoStatus.status}
                    </h4>
                  </div>
                  <p className={`text-sm ${searchedSocioAptoStatus.colorClass.replace('bg-', 'text-').replace('-100', '-500')} mb-1`}>{searchedSocioAptoStatus.message}</p>
                  {searchedSocio.aptoMedico?.fechaEmision && (
                    <p className="text-xs text-muted-foreground">Emitido: {formatDate(searchedSocio.aptoMedico.fechaEmision)}</p>
                  )}
                  {searchedSocio.aptoMedico?.observaciones && (
                    <p className="text-xs text-muted-foreground mt-1">Observaciones: {searchedSocio.aptoMedico.observaciones}</p>
                  )}
                   {searchedSocio.ultimaRevisionMedica && (
                     <p className="text-xs text-muted-foreground mt-1">Última Revisión Médica Registrada: {formatDate(searchedSocio.ultimaRevisionMedica)}</p>
                   )}
              </div>
            </Card>
          </CardContent>
        )}
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><FileSpreadsheet className="mr-2 h-6 w-6 text-primary"/> Últimas Revisiones Registradas</CardTitle>
          <CardDescription>Mostrando las últimas 10 revisiones. El apto es válido por 15 días desde la fecha de revisión (incluida).</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha Revisión</TableHead>
                  <TableHead>Socio (Nombre y N°)</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Vencimiento Apto</TableHead>
                  <TableHead>Observaciones</TableHead>
                  <TableHead>Médico</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revisiones.slice(0, 10).map((revision) => {
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
                      <TableCell className="max-w-[200px] truncate" title={revision.observaciones}>{revision.observaciones || '-'}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={revision.medicoResponsable}>{revision.medicoResponsable || 'No especificado'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleViewRevision(revision.id)} title="Ver detalles de la revisión">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {revisiones.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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

