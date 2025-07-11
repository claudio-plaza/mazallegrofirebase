
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Socio, RevisionMedica, SolicitudInvitadosDiarios, InvitadoDiario, TipoPersona, AptoMedicoInfo as AptoMedicoInfoType } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NuevaRevisionDialog, type SearchedPerson } from './NuevaRevisionDialog';
import { formatDate, getAptoMedicoStatus, normalizeText } from '@/lib/helpers';
import { parseISO, isToday, isSameMonth, differenceInDays, formatISO, isValid, differenceInYears } from 'date-fns';
import { Activity, AlertTriangle, CalendarCheck, CalendarClock, Eye, Users, FileSpreadsheet, Search, UserCircle, ShieldCheck, ShieldAlert, Stethoscope, UserRound, FileEdit, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '../ui/separator';
import { getAllSolicitudesInvitadosDiarios, getSocios as fetchSociosFromService, getRevisionesMedicas as fetchRevisionesFromService } from '@/lib/firebase/firestoreService';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';


interface Stats {
  revisionesHoy: number;
  aptosPendientesVencidos: number;
  vencimientosProximos: number;
  revisionesEsteMes: number;
}

export interface SearchedPersonForPanel {
  id: string;
  nombreCompleto: string;
  dni?: string;
  numeroSocio?: string;
  fechaNacimiento?: string | Date;
  fotoUrl?: string;
  aptoMedico?: AptoMedicoInfoType;
  tipo: TipoPersona;
  socioAnfitrionNombre?: string;
  socioAnfitrionNumero?: string;
}


export function PanelMedicoDashboard() {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedInvitadoParaRevision, setSelectedInvitadoParaRevision] = useState<SearchedPerson | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchedPersonDisplay, setSearchedPersonDisplay] = useState<SearchedPersonForPanel | null>(null);
  const [searchMessage, setSearchMessage] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // --- Data Fetching with React Query ---
  const { data: socios = [], isLoading: isLoadingSocios } = useQuery<Socio[]>({
    queryKey: ['socios'],
    queryFn: fetchSociosFromService,
  });

  const { data: revisiones = [], isLoading: isLoadingRevisiones } = useQuery<RevisionMedica[]>({
    queryKey: ['revisiones'],
    queryFn: fetchRevisionesFromService,
  });
  
  const { data: todasSolicitudesInvitados = [], isLoading: isLoadingInvitados } = useQuery<SolicitudInvitadosDiarios[]>({
    queryKey: ['todasSolicitudesInvitados'],
    queryFn: getAllSolicitudesInvitadosDiarios,
  });

  const loading = isLoadingSocios || isLoadingRevisiones || isLoadingInvitados;

  // --- Derived State with useMemo ---
  const mapaSociosAnfitriones = useMemo(() => {
    const anfitrionesMap: Record<string, {nombre: string, numeroSocio: string}> = {};
    socios.forEach(s => {
        anfitrionesMap[s.numeroSocio] = { nombre: `${s.nombre} ${s.apellido}`, numeroSocio: s.numeroSocio};
    });
    return anfitrionesMap;
  }, [socios]);

  const invitadosDiariosHoy = useMemo(() => {
    const todayISO = formatISO(new Date(), { representation: 'date' });
    return todasSolicitudesInvitados
        .filter(sol => sol.fecha === todayISO)
        .flatMap(sol => sol.listaInvitadosDiarios.map(inv => ({...inv, idSocioAnfitrion: sol.idSocioTitular})));
  }, [todasSolicitudesInvitados]);

  const invitadosIngresadosSinAptoHoy = useMemo(() => {
    return invitadosDiariosHoy
      .filter(inv => inv.ingresado) 
      .map(inv => {
          const anfitrion = mapaSociosAnfitriones[inv.idSocioAnfitrion!];
          const aptoStatus = getAptoMedicoStatus(inv.aptoMedico, inv.fechaNacimiento);
          if (aptoStatus.status !== 'Válido') {
            return {
                id: inv.id!, 
                nombreCompleto: `${inv.nombre} ${inv.apellido}`,
                dni: inv.dni,
                fechaNacimiento: inv.fechaNacimiento,
                aptoMedico: inv.aptoMedico,
                tipo: 'Invitado Diario' as TipoPersona,
                socioAnfitrionNombre: anfitrion?.nombre || 'Desconocido',
                socioAnfitrionNumero: anfitrion?.numeroSocio || inv.idSocioAnfitrion,
            };
          }
          return null;
      }).filter(Boolean) as SearchedPersonForPanel[];
  }, [invitadosDiariosHoy, mapaSociosAnfitriones]);

  const stats = useMemo((): Stats => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const revHoy = revisiones.filter(r => {
      if (!r.fechaRevision || !(r.fechaRevision instanceof Date) || !isValid(r.fechaRevision)) return false;
      return isToday(r.fechaRevision);
    }).length;

    let aptosPendVenc = 0;
    let vencProximos = 0;

    const allPeopleForStats = [
      ...socios.map(s => ({ ...s, tipo: 'Socio Titular' as TipoPersona, aptoMedico: s.aptoMedico, fechaNacimiento: s.fechaNacimiento })),
      ...socios.flatMap(s => s.grupoFamiliar?.map(f => ({ ...f, tipo: 'Familiar' as TipoPersona, socioTitularId: s.numeroSocio, aptoMedico: f.aptoMedico, fechaNacimiento: f.fechaNacimiento })) || []),
      ...socios.flatMap(s => s.adherentes?.map(a => ({ ...a, tipo: 'Adherente' as TipoPersona, socioTitularId: s.numeroSocio, aptoMedico: a.aptoMedico, fechaNacimiento: a.fechaNacimiento })) || []),
      ...invitadosDiariosHoy.map(i => ({ ...i, tipo: 'Invitado Diario' as TipoPersona, aptoMedico: i.aptoMedico, fechaNacimiento: i.fechaNacimiento }))
    ];

    allPeopleForStats.forEach(p => {
      const status = getAptoMedicoStatus(p.aptoMedico, p.fechaNacimiento as string | Date);
      if (status.status === 'Vencido' || status.status === 'Inválido' || status.status === 'Pendiente') {
        aptosPendVenc++;
      }
      if (p.aptoMedico?.valido && p.aptoMedico.fechaVencimiento) {
        let fechaVenc: Date;
        if (p.aptoMedico.fechaVencimiento instanceof Date && isValid(p.aptoMedico.fechaVencimiento)) {
          fechaVenc = p.aptoMedico.fechaVencimiento;
        } else if (typeof p.aptoMedico.fechaVencimiento === 'string' && isValid(parseISO(p.aptoMedico.fechaVencimiento as string))) {
          fechaVenc = parseISO(p.aptoMedico.fechaVencimiento as string);
        } else {
          return;
        }
        if (!isValid(fechaVenc)) return;

        const diff = differenceInDays(fechaVenc, today);
        if (diff >= 0 && diff <= 7) {
          vencProximos++;
        }
      }
    });

    const revMes = revisiones.filter(r => {
      if (!r.fechaRevision || !(r.fechaRevision instanceof Date) || !isValid(r.fechaRevision)) return false;
      return isSameMonth(r.fechaRevision, today);
    }).length;

    return {
      revisionesHoy: revHoy,
      aptosPendientesVencidos: aptosPendVenc,
      vencimientosProximos: vencProximos,
      revisionesEsteMes: revMes,
    };
  }, [revisiones, socios, invitadosDiariosHoy]);


  const handleSearchPersona = useCallback(async () => {
    if (!searchTerm.trim()) {
      setSearchMessage('Por favor, ingrese N° Socio, DNI o Nombre.');
      setSearchedPersonDisplay(null);
      return;
    }
    setSearchLoading(true);
    setSearchedPersonDisplay(null);
    
    const normalizedTerm = normalizeText(searchTerm);
    let found: SearchedPersonForPanel | null = null;

    for (const socio of socios) {
      if (normalizeText(socio.numeroSocio).includes(normalizedTerm) || normalizeText(socio.dni).includes(normalizedTerm) || normalizeText(`${socio.nombre} ${socio.apellido}`).includes(normalizedTerm)) {
        found = {
          id: socio.numeroSocio,
          nombreCompleto: `${socio.nombre} ${socio.apellido}`,
          dni: socio.dni,
          numeroSocio: socio.numeroSocio,
          fechaNacimiento: socio.fechaNacimiento,
          fotoUrl: socio.fotoUrl || undefined,
          aptoMedico: socio.aptoMedico,
          tipo: 'Socio Titular'
        };
        break;
      }
      const familiar = socio.grupoFamiliar?.find(f => normalizeText(f.dni).includes(normalizedTerm) || normalizeText(`${f.nombre} ${f.apellido}`).includes(normalizedTerm));
      if (familiar) {
        found = {
          id: familiar.dni,
          nombreCompleto: `${familiar.nombre} ${familiar.apellido}`,
          dni: familiar.dni,
          fechaNacimiento: familiar.fechaNacimiento,
          fotoUrl: familiar.fotoPerfil || undefined,
          aptoMedico: familiar.aptoMedico,
          tipo: 'Familiar',
          socioAnfitrionNombre: `${socio.nombre} ${socio.apellido}`,
          socioAnfitrionNumero: socio.numeroSocio
        };
        break;
      }
      const adherente = socio.adherentes?.find(a => normalizeText(a.dni).includes(normalizedTerm) || normalizeText(`${a.nombre} ${a.apellido}`).includes(normalizedTerm));
      if (adherente) {
        found = {
          id: adherente.dni,
          nombreCompleto: `${adherente.nombre} ${adherente.apellido}`,
          dni: adherente.dni,
          fechaNacimiento: adherente.fechaNacimiento,
          fotoUrl: (adherente.fotoPerfil instanceof FileList ? undefined : adherente.fotoPerfil) || undefined,
          aptoMedico: adherente.aptoMedico,
          tipo: 'Adherente',
          socioAnfitrionNombre: `${socio.nombre} ${socio.apellido}`,
          socioAnfitrionNumero: socio.numeroSocio
        };
        break;
      }
    }

    if (!found) {
        const invitado = invitadosDiariosHoy.find(inv => normalizeText(inv.dni).includes(normalizedTerm) || normalizeText(`${inv.nombre} ${inv.apellido}`).includes(normalizedTerm));
        if (invitado) {
            const anfitrion = mapaSociosAnfitriones[invitado.idSocioAnfitrion!];
            found = {
                id: invitado.id!,
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
      setSearchedPersonDisplay(null);
      setSearchMessage('Persona no encontrada.');
    }
    setSearchLoading(false);
  }, [searchTerm, socios, invitadosDiariosHoy, mapaSociosAnfitriones]);


  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearchPersona();
    }
  };

  const handleViewRevision = (revisionId: string) => {
    toast({
      title: 'Función no implementada',
      description: `Ver detalles de revisión ${revisionId} (simulado).`,
    });
  };

  const handleOpenRevisionDialogParaInvitado = (invitado: SearchedPersonForPanel) => {
    const personaParaDialog: SearchedPerson = {
      id: invitado.dni || invitado.id, 
      nombreCompleto: invitado.nombreCompleto,
      fechaNacimiento: invitado.fechaNacimiento as Date,
      tipo: invitado.tipo,
      socioTitularId: invitado.socioAnfitrionNumero,
      aptoMedicoActual: invitado.aptoMedico,
      fechaVisitaInvitado: invitado.tipo === 'Invitado Diario' ? new Date() : undefined,
    };
    setSelectedInvitadoParaRevision(personaParaDialog);
    setIsDialogOpen(true);
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/2" /> {/* Title */}
        {userRole === 'administrador' && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        )}
        <Skeleton className="h-12 w-full" /> {/* Search bar area */}
        <Skeleton className="h-48 w-full" /> {/* Searched person card area */}
        <Skeleton className="h-96 w-full" /> {/* Table area */}
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
        <NuevaRevisionDialog
            onRevisionGuardada={() => {
              queryClient.invalidateQueries({ queryKey: ['socios'] });
              queryClient.invalidateQueries({ queryKey: ['revisiones'] });
              queryClient.invalidateQueries({ queryKey: ['todasSolicitudesInvitados'] });
            }}
            open={isDialogOpen}
            onOpenChange={(openState) => {
                setIsDialogOpen(openState);
                if (!openState) setSelectedInvitadoParaRevision(null);
            }}
            personaPreseleccionada={selectedInvitadoParaRevision}
            bloquearBusqueda={!!selectedInvitadoParaRevision}
        />
      </div>

      {userRole === 'administrador' && (
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
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Search className="mr-2 h-6 w-6 text-primary"/>Buscar Persona (General)</CardTitle>
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
                  {searchedPersonDisplay.tipo === 'Socio Titular' && (searchedPersonDisplay as unknown as Socio).ultimaRevisionMedica && (
                     <p className="text-xs text-muted-foreground mt-1">Última Revisión Médica Registrada: {formatDate(((searchedPersonDisplay as unknown as Socio).ultimaRevisionMedica!))} </p>
                   )}
              </div>
            </Card>
          </CardContent>
        )}
      </Card>

      {userRole === 'administrador' && (
        <>
          <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center"><UserRound className="mr-2 h-6 w-6 text-primary"/>Invitados del Día Ingresados (Hoy)</CardTitle>
                <CardDescription>Lista de invitados que han registrado su ingreso hoy. Puede registrar o actualizar su revisión médica desde aquí.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[300px] w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invitado</TableHead>
                                <TableHead>DNI</TableHead>
                                <TableHead>Anfitrión</TableHead>
                                <TableHead>Apto Médico (Hoy)</TableHead>
                                <TableHead className="text-right">Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invitadosIngresadosSinAptoHoy.length === 0 && (
                                <TableRow key="no-invitados-row"><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No hay invitados que hayan ingresado hoy o todos tienen apto médico válido.</TableCell></TableRow>
                            )}
                            {invitadosIngresadosSinAptoHoy.map((invitado, index) => {
                                const aptoStatusInvitado = getAptoMedicoStatus(invitado.aptoMedico, invitado.fechaNacimiento);
                                const key = `invitado-${invitado.id || 'no-id'}-${invitado.dni || 'no-dni'}-${index}`;
                                return (
                                    <TableRow key={key}>
                                        <TableCell className="font-medium">{invitado.nombreCompleto}</TableCell>
                                        <TableCell>{invitado.dni}</TableCell>
                                        <TableCell>{invitado.socioAnfitrionNombre} (N°{invitado.socioAnfitrionNumero})</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`${aptoStatusInvitado.colorClass} border-current font-medium`}>
                                                {aptoStatusInvitado.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleOpenRevisionDialogParaInvitado(invitado)}>
                                                <FileEdit className="mr-1.5 h-4 w-4"/>
                                                Revisión
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><FileSpreadsheet className="mr-2 h-6 w-6 text-primary"/> Últimas Revisiones Registradas</CardTitle>
              <CardDescription>Mostrando las últimas 10 revisiones. El apto es válido por 15 días desde la fecha de revisión (incluida) para todas las personas (socios, familiares, adherentes e invitados).</CardDescription>
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
        </>
      )}
    </div>
  );
}
