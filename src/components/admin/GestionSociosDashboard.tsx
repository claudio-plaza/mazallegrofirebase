'use client';

import { useEffect, useState, useMemo, useCallback, Fragment } from 'react';
import type { Socio, AptoMedicoInfo, EstadoCambioGrupoFamiliar, Adherente, MiembroFamiliar } from '@/types';
import { EstadoSolicitudAdherente } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { formatDate, getAptoMedicoStatus, generateId, esCumpleanosHoy, normalizeText } from '@/lib/helpers';
import { parseISO, addDays, formatISO, subDays } from 'date-fns';
import { MoreVertical, UserPlus, Search, Filter, Users, UserCheck, UserX, ShieldCheck, ShieldAlert, Edit3, Trash2, CheckCircle2, XCircle, CalendarDays, FileSpreadsheet, Users2, MailQuestion, Edit, Contact2, Info, ChevronRight, ChevronDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { getSocios as fetchSocios, updateSocio as updateSocioInDb, deleteSocio as deleteSocioInDb } from '@/lib/firebase/firestoreService';
import { GestionAdherentesDialog } from './GestionAdherentesDialog';
import { RevisarCambiosGrupoFamiliarDialog } from './RevisarCambiosGrupoFamiliarDialog';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


type EstadoSocioFiltro = 'Todos' | 'Activo' | 'Inactivo' | 'Pendiente Validacion';

export function GestionSociosDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoSocioFiltro>('Todos');
  const [selectedSocioForAdherentes, setSelectedSocioForAdherentes] = useState<Socio | null>(null);
  const [isAdherentesDialogOpen, setIsAdherentesDialogOpen] = useState(false);
  const [selectedSocioForRevision, setSelectedSocioForRevision] = useState<Socio | null>(null);
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);


  // --- Data Fetching with React Query ---
  const { data: socios = [], isLoading: loading, isError } = useQuery<Socio[]>({
    queryKey: ['socios'],
    queryFn: fetchSocios,
  });

  // --- Mutations ---
  const { mutate: updateSocioMutation } = useMutation({
    mutationFn: (updatedSocio: Socio) => updateSocioInDb(updatedSocio),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socios'] });
    },
    onError: (error) => {
      toast({ title: "Error", description: `No se pudo actualizar el socio: ${error.message}`, variant: "destructive" });
    },
  });

  const { mutate: deleteSocioMutation } = useMutation({
    mutationFn: (socioId: string) => deleteSocioInDb(socioId),
    onSuccess: (success, socioId) => {
      if (success) {
        toast({ title: 'Socio Eliminado', description: `El socio ha sido eliminado.`, variant: 'destructive' });
        queryClient.invalidateQueries({ queryKey: ['socios'] });
      } else {
        toast({ title: "Error", description: "No se pudo eliminar el socio.", variant: "destructive" });
      }
    },
    onError: (error) => {
       toast({ title: "Error", description: `No se pudo eliminar el socio: ${error.message}`, variant: "destructive" });
    },
  });

  // --- Handlers ---
  const toggleRow = (socioId: string) => {
    setExpandedRows(currentExpanded =>
      currentExpanded.includes(socioId)
        ? currentExpanded.filter(id => id !== socioId)
        : [...currentExpanded, socioId]
    );
  };

  const handleToggleEstadoSocio = async (socioId: string) => {
    const socio = socios.find(s => s.id === socioId);
    if (socio) {
      const nuevoEstado = socio.estadoSocio === 'Activo' ? 'Inactivo' : 'Activo';
      updateSocioMutation({ ...socio, estadoSocio: nuevoEstado }, {
        onSuccess: () => {
          toast({ title: 'Estado Actualizado', description: `Socio ${socio.nombre} ${socio.apellido} ahora está ${nuevoEstado.toLowerCase()}.` });
        }
      });
    }
  };

  const handleMarcarApto = async (socioId: string, esValido: boolean) => {
    const socio = socios.find(s => s.id === socioId);
    if (socio) {
      const hoy = new Date();
      const nuevaInfoApto: AptoMedicoInfo = esValido
        ? { valido: true, fechaEmision: hoy, fechaVencimiento: addDays(hoy, 14), observaciones: 'Apto marcado manualmente por admin.' }
        : { valido: false, razonInvalidez: 'Marcado como no apto/vencido por admin.', fechaEmision: socio.aptoMedico?.fechaEmision || subDays(hoy, 15), fechaVencimiento: subDays(hoy,1) };

      updateSocioMutation({ ...socio, aptoMedico: nuevaInfoApto, ultimaRevisionMedica: hoy }, {
        onSuccess: () => {
          toast({ title: 'Apto Médico Actualizado', description: `El apto médico de ${socio.nombre} ${socio.apellido} fue actualizado.` });
        }
      });
    }
  };

  const handleEliminarSocio = (socioId: string) => {
    deleteSocioMutation(socioId);
  };

  const handleNuevoMiembro = () => {
     router.push('/admin/socios/nuevo');
  };

  const handleVerEditarPerfil = (socioId: string) => {
     router.push(`/admin/socios/${socioId}/editar`);
  };

  const openAdherentesDialog = (socio: Socio) => {
    setSelectedSocioForAdherentes(socio);
    setIsAdherentesDialogOpen(true);
  };

  const openRevisionDialog = (socio: Socio) => {
    setSelectedSocioForRevision(socio);
    setIsRevisionDialogOpen(true);
  };

  // --- Memos & Filters ---
  const filteredSocios = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);
    return socios.filter(socio => {
      const matchesSearch =
        normalizeText(socio.nombre).includes(normalizedSearch) ||
        normalizeText(socio.apellido).includes(normalizedSearch) ||
        normalizeText(socio.numeroSocio).includes(normalizedSearch) ||
        normalizeText(socio.dni).includes(normalizedSearch);

      const matchesEstado =
        filtroEstado === 'Todos' || socio.estadoSocio === filtroEstado;

      return matchesSearch && matchesEstado;
    });
  }, [socios, searchTerm, filtroEstado]);

  const handleDescargarListaPdf = () => {
    if (filteredSocios.length === 0) {
      toast({
        title: "Lista Vacía",
        description: "No hay socios que coincidan con los filtros actuales para descargar.",
        variant: "default",
      });
      return;
    }

    const doc = new jsPDF();
    doc.text("Lista de Socios", 14, 16);

    const tableColumn = ["N° Socio", "Nombre Completo", "Estado", "Apto Médico"];
    const tableRows: any[] = [];

    filteredSocios.forEach(socio => {
      const aptoStatus = getAptoMedicoStatus(socio.aptoMedico, socio.fechaNacimiento);
      const socioData = [
        socio.numeroSocio,
        `${socio.nombre} ${socio.apellido}`,
        socio.estadoSocio,
        aptoStatus.status
      ];
      tableRows.push(socioData);
    });

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    doc.save('lista_socios.pdf');

    toast({
      title: "Descarga Iniciada",
      description: `Se ha generado un PDF con ${filteredSocios.length} socio(s).`,
    });
  };

  const stats = useMemo(() => {
    const total = socios.length;
    const activos = socios.filter(s => s.estadoSocio === 'Activo').length;
    const inactivos = socios.filter(s => s.estadoSocio === 'Inactivo').length;
    const aptosVigentes = socios.filter(s => getAptoMedicoStatus(s.aptoMedico, s.fechaNacimiento).status === 'Válido').length;
    const cambiosPendientesGF = socios.filter(s => s.estadoCambioGrupoFamiliar === 'Pendiente').length;
    const solicitudesAdherentesPendientes = socios.reduce((count, socio) => {
        return count + (socio.adherentes?.filter(a => a.estadoSolicitud === EstadoSolicitudAdherente.PENDIENTE).length || 0);
    }, 0);
    return { total, activos, inactivos, aptosVigentes, cambiosPendientesGF, solicitudesAdherentesPendientes };
  }, [socios]);

  if (loading) {
     return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  
  if (isError) {
      return (
          <div className="text-center py-10 text-destructive">
              <p>Error al cargar los datos de los socios. Por favor, intente recargar la página.</p>
          </div>
      );
  }


  const statCards = [
    { title: "Total Socios", value: stats.total, icon: Users, color: "text-blue-500" },
    { title: "Socios Activos", value: stats.activos, icon: UserCheck, color: "text-green-500" },
    { title: "Aptos Médicos Vigentes", value: stats.aptosVigentes, icon: ShieldCheck, color: "text-teal-500" },
    { title: "Cambios GF Pendientes", value: stats.cambiosPendientesGF, icon: MailQuestion, color: "text-purple-500" },
    { title: "Solic. Adherentes Pend.", value: stats.solicitudesAdherentesPendientes, icon: Contact2, color: "text-orange-500" },
  ];

  const renderDetailRow = (socio: Socio) => (
    <TableRow className="bg-muted/30 hover:bg-muted/30">
        <TableCell colSpan={9} className="p-0">
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <section>
                    <h4 className="font-semibold mb-2 text-sm text-primary">Grupo Familiar</h4>
                    {socio.grupoFamiliar && socio.grupoFamiliar.length > 0 ? (
                        <div className="space-y-2">
                            {socio.grupoFamiliar.map((f: MiembroFamiliar) => {
                                const aptoStatus = getAptoMedicoStatus(f.aptoMedico, f.fechaNacimiento);
                                return (
                                    <div key={f.id || f.dni} className="p-2 border rounded-md bg-background text-xs">
                                        <p className="font-semibold">{f.nombre} {f.apellido} <span className="text-muted-foreground font-normal">({f.relacion})</span></p>
                                        <p>DNI: {f.dni}</p>
                                        <div className="flex items-center gap-1 mt-1">
                                          <span>Apto:</span>
                                          <Badge variant="outline" className={`text-xs ${aptoStatus.colorClass} border-current`}>{aptoStatus.status}</Badge>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : <p className="text-xs text-muted-foreground">No hay familiares registrados.</p>}
                </section>
                <section>
                    <h4 className="font-semibold mb-2 text-sm text-primary">Adherentes</h4>
                    {socio.adherentes && socio.adherentes.length > 0 ? (
                        <div className="space-y-2">
                            {socio.adherentes.map((a: Adherente) => {
                                const aptoStatus = getAptoMedicoStatus(a.aptoMedico, a.fechaNacimiento);
                                return (
                                    <div key={a.id || a.dni} className="p-2 border rounded-md bg-background text-xs">
                                        <div className="flex justify-between items-start">
                                            <div>
                                              <p className="font-semibold">{a.nombre} {a.apellido}</p>
                                              <p>DNI: {a.dni}</p>
                                            </div>
                                            <Badge variant={a.estadoAdherente === 'Activo' ? 'default' : 'secondary'} className={a.estadoAdherente === 'Activo' ? 'bg-green-600' : 'bg-slate-500'}>{a.estadoAdherente}</Badge>
                                        </div>
                                        <div className="flex items-center gap-1 mt-1">
                                          <span>Apto:</span>
                                          <Badge variant="outline" className={`text-xs ${aptoStatus.colorClass} border-current`}>{aptoStatus.status}</Badge>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : <p className="text-xs text-muted-foreground">No hay adherentes registrados.</p>}
                </section>
            </div>
        </TableCell>
    </TableRow>
  );

  const renderMobileSocioCard = (socio: Socio) => {
    const isExpanded = expandedRows.includes(socio.id);
    const aptoStatus = getAptoMedicoStatus(socio.aptoMedico, socio.fechaNacimiento);
    const fotoSocio = socio.fotoUrl || `https://placehold.co/40x40.png?text=${socio.nombre[0]}${socio.apellido[0]}`;
    const activeAdherentsCount = socio.adherentes?.filter(a => a.estadoAdherente === 'Activo').length || 0;
    const adherentesPendientesCount = socio.adherentes?.filter(a => a.estadoSolicitud === EstadoSolicitudAdherente.PENDIENTE).length || 0;

    return (
      <Fragment key={socio.id}>
        <Card className="p-3 shadow-md">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 border-2 border-muted">
              <AvatarImage src={fotoSocio} alt={`${socio.nombre} ${socio.apellido}`} />
              <AvatarFallback>{socio.nombre[0]}{socio.apellido[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-grow">
              <div className="flex justify-between items-center">
                <p className="font-bold text-base leading-tight">{socio.nombre} {socio.apellido} {esCumpleanosHoy(socio.fechaNacimiento) && '🎂'}</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones Socio</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleVerEditarPerfil(socio.id)}><Edit3 className="mr-2 h-4 w-4" /> Ver/Editar Perfil</DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleToggleEstadoSocio(socio.id)}
                      className={cn(
                        socio.estadoSocio !== 'Activo' && "text-green-600 focus:text-green-700 focus:bg-green-50",
                        socio.estadoSocio === 'Activo' && "text-orange-600 focus:text-orange-700 focus:bg-orange-50"
                      )}
                    >
                      {socio.estadoSocio === 'Activo' ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                      {socio.estadoSocio === 'Activo' ? 'Desactivar' : 'Activar'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openRevisionDialog(socio)} disabled={socio.estadoCambioGrupoFamiliar !== 'Pendiente'}>
                      <MailQuestion className="mr-2 h-4 w-4" /> Revisar Cambios GF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openAdherentesDialog(socio)}>
                      <Contact2 className="mr-2 h-4 w-4" /> Adherentes
                      {adherentesPendientesCount > 0 && <Badge variant="default" className="ml-auto bg-orange-500 text-white text-xs px-1">{adherentesPendientesCount}</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleMarcarApto(socio.id, true)} className="text-green-600 focus:text-green-700 focus:bg-green-50"><ShieldCheck className="mr-2 h-4 w-4" /> Marcar Apto Válido</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMarcarApto(socio.id, false)} className="text-orange-600 focus:text-orange-700 focus:bg-orange-50"><ShieldAlert className="mr-2 h-4 w-4" /> Marcar Apto Inválido</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive-foreground focus:bg-destructive/90"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>¿Está seguro?</AlertDialogTitle><AlertDialogDescription>Se eliminará permanentemente al socio.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleEliminarSocio(socio.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Eliminar</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-xs text-muted-foreground">Socio: {socio.numeroSocio} | DNI: {socio.dni}</p>
              <div className="mt-2 flex flex-wrap gap-2 items-center text-xs">
                <Badge variant={socio.estadoSocio === 'Activo' ? 'default' : socio.estadoSocio === 'Inactivo' ? 'destructive' : 'secondary'} className={cn('py-1 px-2 text-xs', socio.estadoSocio === 'Activo' ? 'bg-green-500' : socio.estadoSocio === 'Inactivo' ? 'bg-red-500' : 'bg-yellow-500')}>{socio.estadoSocio}</Badge>
                <Badge variant="outline" className={cn('py-1 px-2 text-xs font-medium', aptoStatus.colorClass, 'border-current')}>
                    {aptoStatus.status === 'Válido' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                    {(aptoStatus.status === 'Vencido' || aptoStatus.status === 'Inválido') && <XCircle className="mr-1 h-3 w-3" />}
                    {aptoStatus.status === 'Pendiente' && <CalendarDays className="mr-1 h-3 w-3" />}
                    {aptoStatus.status === 'No Aplica' && <Info className="mr-1 h-3 w-3" />}
                    {aptoStatus.status}
                </Badge>
                {socio.estadoCambioGrupoFamiliar === 'Pendiente' && <Badge variant="outline" className="py-1 px-2 text-xs border-purple-500 text-purple-600"><MailQuestion className="mr-1 h-3 w-3" />Cambio GF</Badge>}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => toggleRow(socio.id)} className="w-full mt-2 text-xs justify-center items-center gap-1">
            Ver Detalles <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
          </Button>
          {isExpanded && (
            <div className="p-2 mt-2 border-t">
              {renderDetailRow(socio)}
            </div>
          )}
        </Card>
      </Fragment>
    );
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Gestión de Socios</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Lista de Socios</CardTitle>
              <CardDescription>Busca, filtra y gestiona los socios del club.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleDescargarListaPdf} variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Descargar Lista (PDF)
              </Button>
              <Button onClick={handleNuevoMiembro}><UserPlus className="mr-2 h-4 w-4" /> Nuevo Socio</Button>
            </div>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por Nombre, N° Socio, DNI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 sm:w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filtroEstado} onValueChange={(value) => setFiltroEstado(value as EstadoSocioFiltro)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  {(['Todos', 'Activo', 'Inactivo', 'Pendiente Validacion'] as EstadoSocioFiltro[]).map(estado => (
                    <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isMobile ? (
            <div className="space-y-4">
              {filteredSocios.map(renderMobileSocioCard)}
              {filteredSocios.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No se encontraron socios.</p>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[500px] w-full overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px] px-2"></TableHead>
                    <TableHead className="w-[80px] hidden sm:table-cell">Foto</TableHead>
                    <TableHead>Nombre Completo</TableHead>
                    <TableHead className="hidden md:table-cell">N° Socio</TableHead>
                    <TableHead className="hidden lg:table-cell">Adherentes (Act./Pend.)</TableHead>
                    <TableHead>Estado Club</TableHead>
                    <TableHead className="hidden lg:table-cell">Cambio GF</TableHead>
                    <TableHead>Apto Médico</TableHead>
                    <TableHead className="text-right min-w-[80px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSocios.map(socio => {
                    const isExpanded = expandedRows.includes(socio.id);
                    const aptoStatus = getAptoMedicoStatus(socio.aptoMedico, socio.fechaNacimiento);
                    const fotoSocio = socio.fotoUrl || `https://placehold.co/40x40.png?text=${socio.nombre[0]}${socio.apellido[0]}`;
                    const activeAdherentsCount = socio.adherentes?.filter(a => a.estadoAdherente === 'Activo').length || 0;
                    const adherentesPendientesCount = socio.adherentes?.filter(a => a.estadoSolicitud === EstadoSolicitudAdherente.PENDIENTE).length || 0;
                    
                    return (
                      <Fragment key={socio.id}>
                        <TableRow>
                          <TableCell className="px-2">
                            <Button variant="ghost" size="icon" onClick={() => toggleRow(socio.id)} className="h-8 w-8">
                                <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
                            </Button>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={fotoSocio} alt={`${socio.nombre} ${socio.apellido}`} data-ai-hint="member photo" />
                              <AvatarFallback>{socio.nombre[0]}{socio.apellido[0]}</AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-medium">{socio.nombre} {socio.apellido} {esCumpleanosHoy(socio.fechaNacimiento) && '🎂'}</TableCell>
                          <TableCell className="hidden md:table-cell">{socio.numeroSocio}</TableCell>
                          <TableCell className="hidden lg:table-cell text-center">
                            {activeAdherentsCount}
                            {adherentesPendientesCount > 0 && (
                              <Badge variant="default" className="ml-1 bg-orange-500 text-white text-xs px-1.5 py-0.5" title={`${adherentesPendientesCount} solicitudes pendientes`}>
                                {adherentesPendientesCount}P
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={socio.estadoSocio === 'Activo' ? 'default' : socio.estadoSocio === 'Inactivo' ? 'destructive' : 'secondary'}
                                  className={socio.estadoSocio === 'Activo' ? 'bg-green-500 hover:bg-green-600' : socio.estadoSocio === 'Inactivo' ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-500 hover:bg-yellow-600'}>
                              {socio.estadoSocio}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {socio.estadoCambioGrupoFamiliar === 'Pendiente' && (
                              <Badge variant="outline" className="border-purple-500 text-purple-600 hover:bg-purple-500/10">
                                <MailQuestion className="mr-1 h-3 w-3" /> Pend.
                              </Badge>
                            )}
                            {socio.estadoCambioGrupoFamiliar === 'Rechazado' && (
                              <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">
                                <XCircle className="mr-1 h-3 w-3" /> Rech.
                              </Badge>
                            )}
                            {(socio.estadoCambioGrupoFamiliar === 'Ninguno' || !socio.estadoCambioGrupoFamiliar) && (
                              <Badge variant="outline" className="border-transparent text-muted-foreground">
                                -
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${aptoStatus.colorClass} border-current font-medium`}>
                              {aptoStatus.status === 'Válido' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                              {(aptoStatus.status === 'Vencido' || aptoStatus.status === 'Inválido') && <XCircle className="mr-1 h-3 w-3" />}
                              {aptoStatus.status === 'Pendiente' && <CalendarDays className="mr-1 h-3 w-3" />}
                              {aptoStatus.status === 'No Aplica' && <Info className="mr-1 h-3 w-3" />}
                              {aptoStatus.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right min-w-[80px]">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Acciones Socio</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleVerEditarPerfil(socio.id)}><Edit3 className="mr-2 h-4 w-4" /> Ver/Editar Perfil</DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleToggleEstadoSocio(socio.id)}
                                  className={cn(
                                    socio.estadoSocio !== 'Activo' && "text-green-600 focus:text-green-700 focus:bg-green-50",
                                    socio.estadoSocio === 'Activo' && "text-orange-600 focus:text-orange-700 focus:bg-orange-50"
                                  )}
                                >
                                  {socio.estadoSocio === 'Activo' ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                                  {socio.estadoSocio === 'Activo' ? 'Desactivar Socio' : 'Activar Socio'}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => openRevisionDialog(socio)}
                                    disabled={socio.estadoCambioGrupoFamiliar !== 'Pendiente'}
                                  >
                                    <MailQuestion className="mr-2 h-4 w-4" /> Revisar Cambios GF
                                  </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openAdherentesDialog(socio)}>
                                    <Contact2 className="mr-2 h-4 w-4" /> Gestionar Adherentes
                                    {adherentesPendientesCount > 0 && <Badge variant="default" className="ml-auto bg-orange-500 text-white text-xs px-1">{adherentesPendientesCount}</Badge>}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleMarcarApto(socio.id, true)} className="text-green-600 focus:text-green-700 focus:bg-green-50"><ShieldCheck className="mr-2 h-4 w-4" /> Marcar Apto Válido</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMarcarApto(socio.id, false)} className="text-orange-600 focus:text-orange-700 focus:bg-orange-50"><ShieldAlert className="mr-2 h-4 w-4" /> Marcar Apto Vencido/Inválido</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive-foreground focus:bg-destructive/90"><Trash2 className="mr-2 h-4 w-4" /> Eliminar Socio</DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Se eliminará permanentemente al socio ${socio.nombre} ${socio.apellido} de la base de datos.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleEliminarSocio(socio.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        {isExpanded && renderDetailRow(socio)}
                      </Fragment>
                    );
                  })}
                  {filteredSocios.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No se encontraron socios con los criterios seleccionados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
       {selectedSocioForAdherentes && (
        <GestionAdherentesDialog
          socio={selectedSocioForAdherentes}
          open={isAdherentesDialogOpen}
          onOpenChange={setIsAdherentesDialogOpen}
          onAdherentesUpdated={() => queryClient.invalidateQueries({ queryKey: ['socios'] })}
        />
      )}
      {selectedSocioForRevision && (
        <RevisarCambiosGrupoFamiliarDialog
            socio={selectedSocioForRevision}
            open={isRevisionDialogOpen}
            onOpenChange={setIsRevisionDialogOpen}
            onRevisionUpdated={() => queryClient.invalidateQueries({ queryKey: ['socios'] })}
        />
      )}
    </div>
  );
}