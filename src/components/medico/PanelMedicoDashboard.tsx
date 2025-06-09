
'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Socio, RevisionMedica, SolicitudInvitadosDiarios, InvitadoDiario } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NuevaRevisionDialog } from './NuevaRevisionDialog';
import { formatDate, getAptoMedicoStatus } from '@/lib/helpers';
import { parseISO, isToday, isSameMonth, differenceInDays, formatISO } from 'date-fns';
import { Activity, AlertTriangle, CalendarCheck, CalendarClock, Eye, Users, FileSpreadsheet, Search, UserCircle, ShieldCheck, ShieldAlert, Stethoscope, UserRound } from 'lucide-react';
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

interface SearchedPersonForPanel {
  id: string;
  nombreCompleto: string;
  dni?: string;
  numeroSocio?: string;
  fechaNacimiento?: string | Date;
  fotoUrl?: string;
  aptoMedico?: any; // Podría ser AptoMedicoInfo o el aptoMedico de InvitadoDiario
  tipo: 'Socio Titular' | 'Familiar' | 'Adherente' | 'Invitado Diario';
  socioAnfitrionNombre?: string;
  socioAnfitrionNumero?: string;
}


export function PanelMedicoDashboard() {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [revisiones, setRevisiones] = useState<RevisionMedica[]>([]);
  const [invitadosDiariosHoy, setInvitadosDiariosHoy] = useState<InvitadoDiario[]>([]);
  const [mapaSociosAnfitriones, setMapaSociosAnfitriones] = useState<Record<string, {nombre: string, numeroSocio: string}>>({});

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
  const [searchedPersonDisplay, setSearchedPersonDisplay] = useState<SearchedPersonForPanel | null>(null);
  const [searchMessage, setSearchMessage] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);


  const loadData = useCallback(async () => {
    setLoading(true);
    const storedSocios = localStorage.getItem('sociosDB');
    const sociosData: Socio[] = storedSocios ? JSON.parse(storedSocios) : [];
    setSocios(sociosData);

    const anfitrionesMap: Record<string, {nombre: string, numeroSocio: string}> = {};
    sociosData.forEach(s => {
        anfitrionesMap[s.numeroSocio] = { nombre: `${s.nombre} ${s.apellido}`, numeroSocio: s.numeroSocio};
    });
    setMapaSociosAnfitriones(anfitrionesMap);

    const storedRevisiones = localStorage.getItem('revisionesDB');
    const revisionesData: RevisionMedica[] = storedRevisiones ? JSON.parse(storedRevisiones) : [];
    revisionesData.sort((a, b) => parseISO(b.fechaRevision as string).getTime() - parseISO(a.fechaRevision as string).getTime());
    setRevisiones(revisionesData);
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayISO = formatISO(today, { representation: 'date' });

    const storedInvitados = localStorage.getItem('invitadosDiariosDB');
    const todasSolicitudesInvitados: SolicitudInvitadosDiarios[] = storedInvitados ? JSON.parse(storedInvitados) : [];
    const invitadosDeHoy = todasSolicitudesInvitados
        .filter(sol => sol.fecha === todayISO)
        .flatMap(sol => sol.listaInvitadosDiarios.map(inv => ({...inv, idSocioAnfitrion: sol.idSocioTitular})));
    setInvitadosDiariosHoy(invitadosDeHoy);
    
    const revHoy = revisionesData.filter(r => isToday(parseISO(r.fechaRevision as string))).length;
    
    let aptosPendVenc = 0;
    let vencProximos = 0;

    const allPeople = [
        ...sociosData.map(s => ({...s, tipo: 'Socio Titular'})),
        ...sociosData.flatMap(s => s.grupoFamiliar?.map(f => ({...f, tipo: 'Familiar', socioTitularId: s.id })) || []),
        ...sociosData.flatMap(s => s.adherentes?.map(a => ({...a, tipo: 'Adherente', socioTitularId: s.id })) || []),
        ...invitadosDeHoy.map(i => ({...i, tipo: 'Invitado Diario'}))
    ];

    allPeople.forEach(p => {
      const status = getAptoMedicoStatus(p.aptoMedico, p.fechaNacimiento as string | Date);
      if (status.status === 'Vencido' || status.status === 'Inválido' || status.status === 'Pendiente') {
        aptosPendVenc++;
      }
      if (p.aptoMedico?.valido && p.aptoMedico.fechaVencimiento) {
        const fechaVenc = parseISO(p.aptoMedico.fechaVencimiento as string);
        const diff = differenceInDays(fechaVenc, today);
        if (diff >= 0 && diff <= 7) {
          vencProximos++;
        }
      }
    });

    const revMes = revisionesData.filter(r => isSameMonth(parseISO(r.fechaRevision as string), today)).length;

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
    const handleDbUpdates = () => loadData();
    window.addEventListener('sociosDBUpdated', handleDbUpdates);
    window.addEventListener('revisionesDBUpdated', handleDbUpdates);
    window.addEventListener('invitadosDiariosDBUpdated', handleDbUpdates);
    return () => {
      window.removeEventListener('sociosDBUpdated', handleDbUpdates);
      window.removeEventListener('revisionesDBUpdated', handleDbUpdates);
      window.removeEventListener('invitadosDiariosDBUpdated', handleDbUpdates);
    };
  }, [loadData]);

  const handleSearchPersona = useCallback(() => {
    if (!searchTerm.trim()) {
      setSearchMessage('Por favor, ingrese N° Socio, DNI o Nombre.');
      setSearchedPersonDisplay(null);
      return;
    }
    setSearchLoading(true);
    setSearchedPersonDisplay(null);
    
    const term = searchTerm.trim().toLowerCase();
    let found: SearchedPersonForPanel | null = null;

    for (const socio of socios) {
      if (socio.numeroSocio.toLowerCase() === term || socio.dni.toLowerCase() === term || `${socio.nombre.toLowerCase()} ${socio.apellido.toLowerCase()}`.includes(term)) {
        found = {
          id: socio.id,
          nombreCompleto: `${socio.nombre} ${socio.apellido}`,
          dni: socio.dni,
          numeroSocio: socio.numeroSocio,
          fechaNacimiento: socio.fechaNacimiento,
          fotoUrl: socio.fotoUrl,
          aptoMedico: socio.aptoMedico,
          tipo: 'Socio Titular'
        };
        break;
      }
      const familiar = socio.grupoFamiliar?.find(f => f.dni.toLowerCase() === term || `${f.nombre.toLowerCase()} ${f.apellido.toLowerCase()}`.includes(term));
      if (familiar) {
        found = {
          id: familiar.dni,
          nombreCompleto: `${familiar.nombre} ${familiar.apellido}`,
          dni: familiar.dni,
          fechaNacimiento: familiar.fechaNacimiento,
          fotoUrl: (familiar.fotoPerfil instanceof FileList ? undefined : familiar.fotoPerfil as string | undefined),
          aptoMedico: familiar.aptoMedico,
          tipo: 'Familiar',
          socioAnfitrionNombre: `${socio.nombre} ${socio.apellido}`,
          socioAnfitrionNumero: socio.numeroSocio
        };
        break;
      }
      const adherente = socio.adherentes?.find(a => a.dni.toLowerCase() === term || `${a.nombre.toLowerCase()} ${a.apellido.toLowerCase()}`.includes(term));
      if (adherente) {
        found = {
          id: adherente.dni,
          nombreCompleto: `${adherente.nombre} ${adherente.apellido}`,
          dni: adherente.dni,
          fechaNacimiento: adherente.fechaNacimiento,
          fotoUrl: (adherente.fotoPerfil instanceof FileList ? undefined : adherente.fotoPerfil as string | undefined),
          aptoMedico: adherente.aptoMedico,
          tipo: 'Adherente',
          socioAnfitrionNombre: `${socio.nombre} ${socio.apellido}`,
          socioAnfitrionNumero: socio.numeroSocio
        };
        break;
      }
    }

    if (!found) {
        const invitado = invitadosDiariosHoy.find(inv => inv.dni.toLowerCase() === term || `${inv.nombre.toLowerCase()} ${inv.apellido.toLowerCase()}`.includes(term));
        if (invitado) {
            const anfitrion = mapaSociosAnfitriones[invitado.idSocioAnfitrion!];
            found = {
                id: invitado.dni,
                nombreCompleto: `${invitado.nombre} ${invitado.apellido}`,
                dni: invitado.dni,
                fechaNacimiento: invitado.fechaNacimiento,
                aptoMedico: invitado.aptoMedico,
                tipo: 'Invitado Diario',
                socioAnfitrionNombre: anfitrion?.nombre || 'Desconocido',
                socioAnfitrionNumero: anfitrion?.numeroSocio || invitado.idSocioAnfitrion
            };
        }
    }

    if (found) {
      setSearchedPersonDisplay(found);
      setSearchMessage('');
    } else {
      setSearchMessage('Persona no encontrada.');
    }
    setSearchLoading(false);
  }, [searchTerm, socios, invitadosDiariosHoy, mapaSociosAnfitriones]);

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearchPersona();
    }
  };

  useEffect(() => {
    if (searchedPersonDisplay) {
       handleSearchPersona(); // Re-search to refresh data if socio list changed
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socios, invitadosDiariosHoy]);


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
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
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

  const searchedPersonAptoStatus = searchedPersonDisplay ? getAptoMedicoStatus(searchedPersonDisplay.aptoMedico, searchedPersonDisplay.fechaNacimiento) : null;

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
          <CardTitle className="flex items-center"><Search className="mr-2 h-6 w-6 text-primary"/>Buscar Persona</CardTitle>
          <CardDescription>Ingrese N° Socio, DNI o Nombre para verificar su apto médico (socios, familiares, adherentes o invitados de hoy).</CardDescription>
          <div className="flex space-x-2 pt-4">
            <Input
              type="text"
              placeholder="Buscar por N° Socio, DNI, Nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-grow"
            />
            <Button onClick={handleSearchPersona} disabled={searchLoading}>
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

        {searchedPersonDisplay && !searchLoading && searchedPersonAptoStatus && (
          <CardContent className="pt-4">
            <Card className="bg-muted/30 p-6 shadow-md">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Avatar className="h-24 w-24 border-2 border-primary">
                  <AvatarImage src={searchedPersonDisplay.fotoUrl || `https://placehold.co/96x96.png?text=${searchedPersonDisplay.nombreCompleto[0]}${searchedPersonDisplay.nombreCompleto.split(' ')[1]?.[0] || ''}`} alt={searchedPersonDisplay.nombreCompleto} data-ai-hint="person photo" />
                  <AvatarFallback className="text-3xl">{searchedPersonDisplay.nombreCompleto[0]}{searchedPersonDisplay.nombreCompleto.split(' ')[1]?.[0] || ''}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1 text-center sm:text-left">
                  <h3 className="text-2xl font-semibold text-primary">{searchedPersonDisplay.nombreCompleto}</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchedPersonDisplay.tipo} {searchedPersonDisplay.dni && `| DNI: ${searchedPersonDisplay.dni}`}
                    {searchedPersonDisplay.numeroSocio && ` | N° Socio: ${searchedPersonDisplay.numeroSocio}`}
                  </p>
                  {searchedPersonDisplay.fechaNacimiento && (
                    <p className="text-sm text-muted-foreground">
                        Nacimiento: {formatDate(searchedPersonDisplay.fechaNacimiento)}
                    </p>
                  )}
                  {searchedPersonDisplay.tipo === 'Invitado Diario' && searchedPersonDisplay.socioAnfitrionNombre && (
                    <p className="text-sm text-muted-foreground">Invitado por: {searchedPersonDisplay.socioAnfitrionNombre} (Socio N°: {searchedPersonDisplay.socioAnfitrionNumero})</p>
                  )}
                   {searchedPersonDisplay.tipo === 'Familiar' && searchedPersonDisplay.socioAnfitrionNombre && (
                    <p className="text-sm text-muted-foreground">Familiar de: {searchedPersonDisplay.socioAnfitrionNombre} (Socio N°: {searchedPersonDisplay.socioAnfitrionNumero})</p>
                  )}
                   {searchedPersonDisplay.tipo === 'Adherente' && searchedPersonDisplay.socioAnfitrionNombre && (
                    <p className="text-sm text-muted-foreground">Adherente de: {searchedPersonDisplay.socioAnfitrionNombre} (Socio N°: {searchedPersonDisplay.socioAnfitrionNumero})</p>
                  )}
                </div>
              </div>
              <Separator className="my-4" />
              <div className={`p-4 rounded-lg border ${searchedPersonAptoStatus.colorClass.replace('text-', 'text-').replace('bg-', 'bg-opacity-10 border-')}`}>
                  <div className="flex items-center mb-2">
                    {searchedPersonAptoStatus.status === 'Válido' && <ShieldCheck className={`h-7 w-7 mr-2 ${searchedPersonAptoStatus.colorClass.replace('bg-', 'text-').replace('-100', '-500')}`} />}
                    {(searchedPersonAptoStatus.status === 'Vencido' || searchedPersonAptoStatus.status === 'Inválido') && <ShieldAlert className={`h-7 w-7 mr-2 ${searchedPersonAptoStatus.colorClass.replace('bg-', 'text-').replace('-100', '-500')}`} />}
                    {searchedPersonAptoStatus.status === 'Pendiente' && <CalendarClock className={`h-7 w-7 mr-2 ${searchedPersonAptoStatus.colorClass.replace('bg-', 'text-').replace('-100', '-500')}`} />}
                    <h4 className={`text-xl font-semibold ${searchedPersonAptoStatus.colorClass.replace('bg-', 'text-').replace('-100', '-600')}`}>
                      Apto Médico: {searchedPersonAptoStatus.status}
                    </h4>
                  </div>
                  <p className={`text-sm ${searchedPersonAptoStatus.colorClass.replace('bg-', 'text-').replace('-100', '-500')} mb-1`}>{searchedPersonAptoStatus.message}</p>
                  {searchedPersonDisplay.aptoMedico?.fechaEmision && (
                    <p className="text-xs text-muted-foreground">Emitido: {formatDate(searchedPersonDisplay.aptoMedico.fechaEmision)}</p>
                  )}
                  {searchedPersonDisplay.aptoMedico?.observaciones && (
                    <p className="text-xs text-muted-foreground mt-1">Observaciones: {searchedPersonDisplay.aptoMedico.observaciones}</p>
                  )}
                  {searchedPersonDisplay.tipo === 'Socio Titular' && (searchedPersonDisplay as Socio).ultimaRevisionMedica && (
                     <p className="text-xs text-muted-foreground mt-1">Última Revisión Médica Registrada: {formatDate((searchedPersonDisplay as Socio).ultimaRevisionMedica!)}</p>
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
                  <TableHead>Persona (Nombre y DNI/ID)</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Vencimiento Apto</TableHead>
                  <TableHead>Observaciones</TableHead>
                  <TableHead>Médico</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revisiones.slice(0, 10).map((revision) => {
                  let iconType = <UserCircle className="mr-1 h-3.5 w-3.5" />;
                  if (revision.tipoPersona === 'Invitado Diario') iconType = <UserRound className="mr-1 h-3.5 w-3.5" />;
                  
                  return (
                    <TableRow key={revision.id}>
                      <TableCell>{formatDate(revision.fechaRevision)}</TableCell>
                      <TableCell>{revision.socioNombre} ({revision.socioId})</TableCell>
                      <TableCell><Badge variant="outline" className="flex items-center">{iconType}{revision.tipoPersona}</Badge></TableCell>
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
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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

