'use client';

import { useEffect, useState, useMemo, useCallback, Fragment } from 'react';
import type { Socio, AptoMedicoInfo, EstadoCambioFamiliares, Adherente, MiembroFamiliar } from '@/types';
import { EstadoSolicitudAdherente } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { formatDate, getAptoMedicoStatus, esCumpleanosHoy, normalizeText } from '@/lib/helpers';
import { addDays, subDays } from 'date-fns';
import { MoreVertical, UserPlus, Search, Filter, Users, UserCheck, UserX, ShieldCheck, ShieldAlert, Edit3, Trash2, CheckCircle2, XCircle, CalendarDays, FileSpreadsheet, Users2, MailQuestion, Contact2, Info, ChevronRight, Loader2, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { getPaginatedSocios, updateSocio as updateSocioInDb, deleteSocio as deleteSocioInDb, getSocioByNumeroExacto } from '@/lib/firebase/firestoreService';
import { GestionAdherentesDialog } from './GestionAdherentesDialog';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { DocumentSnapshot } from 'firebase/firestore';
import { useSolicitudesFamiliaresCount } from '@/hooks/useSolicitudesFamiliaresCount';
import Link from 'next/link';

const PAGE_SIZE = 20;
type EstadoSocioFiltro = 'Todos' | 'Activo' | 'Inactivo' | 'Pendiente';

export function GestionSociosDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoSocioFiltro>('Todos');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // Nuevo estado para el orden
  const [selectedSocioForAdherentes, setSelectedSocioForAdherentes] = useState<Socio | null>(null);
  const [isAdherentesDialogOpen, setIsAdherentesDialogOpen] = useState(false);
  const [selectedSocioForRevision, setSelectedSocioForRevision] = useState<Socio | null>(null);
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const [socios, setSocios] = useState<Socio[]>([]);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [isError, setIsError] = useState(false);
  const [numeroSocioDirecto, setNumeroSocioDirecto] = useState('');
  const [buscandoDirecto, setBuscandoDirecto] = useState(false);
  const solicitudesFamiliaresCount = useSolicitudesFamiliaresCount();

  const fetchSocios = useCallback(async (filtro: EstadoSocioFiltro, startingDoc?: DocumentSnapshot, order?: 'asc' | 'desc') => {
    setLoading(true);
    if (!startingDoc) setIsInitialLoading(true);
    try {
      const { socios: newSocios, lastVisible: newLastVisible } = await getPaginatedSocios(PAGE_SIZE, startingDoc, { estado: filtro, order });
      setSocios(prev => startingDoc ? [...prev, ...newSocios] : newSocios);
      setLastVisible(newLastVisible);
      setHasMore(newSocios.length === PAGE_SIZE);
      setIsError(false);
    } catch (error) {
      console.error("Error fetching socios:", error);
      setIsError(true);
      toast({ title: "Error", description: "No se pudieron cargar los socios.", variant: "destructive" });
    } finally {
      setLoading(false);
      setIsInitialLoading(false);
    }
  }, [toast]); // order se usa en la llamada a getPaginatedSocios, pero no es una dependencia directa de fetchSocios en sí.

  useEffect(() => {
    setSocios([]);
    setLastVisible(undefined);
    setHasMore(true);
    fetchSocios(filtroEstado, undefined, sortOrder); // Pasar sortOrder
  }, [filtroEstado, fetchSocios, sortOrder]); // Añadir sortOrder a las dependencias

  const handleLoadMore = () => {
    if (hasMore && !loading) fetchSocios(filtroEstado, lastVisible, sortOrder);
  };

  const { mutate: updateSocioMutation } = useMutation({
    mutationFn: ({ socioId, data }: { socioId: string, data: Partial<Socio> }) => updateSocioInDb(socioId, data),
    onSuccess: (_, { socioId, data }) => {
      toast({ title: 'Socio Actualizado', description: `Los datos del socio han sido actualizados.` });
      setSocios(prev => prev.map(s => s.id === socioId ? { ...s, ...data } : s));
    },
    onError: (error) => {
      console.error("Error detallado al actualizar socio:", error);
      toast({ title: "Error", description: `No se pudo actualizar el socio: ${error.message}`, variant: "destructive" });
    },
  });

  const { mutate: deleteSocioMutation } = useMutation({
    mutationFn: (socioId: string) => deleteSocioInDb(socioId),
    onSuccess: (_, socioId) => {
      toast({ title: 'Socio Eliminado', description: `El socio ha sido eliminado.`, variant: 'destructive' });
      setSocios(prev => prev.filter(s => s.id !== socioId));
    },
    onError: (error) => toast({ title: "Error", description: `No se pudo eliminar el socio: ${error.message}`, variant: "destructive" }),
  });

  const toggleRow = (socioId: string) => {
    setExpandedRows(currentExpanded =>
      currentExpanded.includes(socioId)
        ? currentExpanded.filter(id => id !== socioId)
        : [...currentExpanded, socioId]
    );
  };

  const handleToggleEstadoSocio = (socio: Socio) => updateSocioMutation({ socioId: socio.id, data: { estadoSocio: socio.estadoSocio === 'Activo' ? 'Inactivo' : 'Activo' } });
  const handleMarcarApto = (socio: Socio, esValido: boolean) => updateSocioMutation({ socioId: socio.id, data: { aptoMedico: esValido ? { valido: true, fechaEmision: new Date(), fechaVencimiento: addDays(new Date(), 14) } : { valido: false, razonInvalidez: 'Vencido por admin' } } });
  const handleEliminarSocio = (socioId: string) => deleteSocioMutation(socioId);
  const handleNuevoMiembro = () => router.push('/admin/socios/nuevo');
  const handleVerEditarPerfil = (socioId: string) => router.push(`/admin/socios/${socioId}/editar`);
  const openAdherentesDialog = (socio: Socio) => { setSelectedSocioForAdherentes(socio); setIsAdherentesDialogOpen(true); };
  const openRevisionDialog = (socio: Socio) => { setSelectedSocioForRevision(socio); setIsRevisionDialogOpen(true); };

  const handleIrASocio = async () => {
    if (!numeroSocioDirecto.trim()) {
      toast({ title: "Ingrese un número", description: "Por favor ingrese el número de socio a buscar.", variant: "default" });
      return;
    }
    setBuscandoDirecto(true);
    try {
      const socio = await getSocioByNumeroExacto(numeroSocioDirecto.trim());
      if (socio) {
        // Agregar al principio de la lista si no existe
        setSocios(prev => {
          if (prev.some(s => s.id === socio.id)) {
            return prev; // Ya está en la lista
          }
          return [socio, ...prev];
        });
        setExpandedRows([socio.id]); // Expandir automáticamente
        toast({ title: "Socio encontrado", description: `${socio.nombre} ${socio.apellido} (N° ${socio.numeroSocio})` });
        setNumeroSocioDirecto('');
      } else {
        toast({ title: "No encontrado", description: `No existe un socio con el número ${numeroSocioDirecto}`, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setBuscandoDirecto(false);
    }
  };

  const filteredSocios = useMemo(() => {
    if (!searchTerm) return socios;
    
    // Split search term into individual tokens (words), normalize them, and remove empty ones
    const searchTokens = normalizeText(searchTerm).split(' ').filter(token => token.length > 0);

    if (searchTokens.length === 0) return socios;

    return socios.filter(socio => {
      // Create a single searchable string containing all relevant fields
      // We add spaces between fields to ensure tokens don't match across field boundaries accidentally if not desired,
      // but here standard concatenation is fine as we are just checking for presence.
      const socioData = `${normalizeText(socio.nombre)} ${normalizeText(socio.apellido)} ${normalizeText(socio.numeroSocio)} ${normalizeText(socio.dni)}`;
      
      // Check if EVERY search token exists somewhere in the socio's data
      // This enables "Juan Perez", "Perez Juan", "Juan 12345" etc.
      return searchTokens.every(token => socioData.includes(token));
    });
  }, [socios, searchTerm]);

  const handleDescargarListaPdf = () => toast({ title: "Función en revisión", description: "La descarga masiva está siendo adaptada.", variant: "default" });

  const stats = useMemo(() => {
    const total = socios.length;
    const activos = socios.filter(s => s.estadoSocio === 'Activo').length;
    const aptosVigentes = socios.filter(s => getAptoMedicoStatus(s.aptoMedico, s.fechaNacimiento).status === 'Válido').length;
    const solicitudesAdherentesPendientes = socios.reduce((count, socio) => count + (socio.adherentes?.filter(a => a.estadoSolicitud === EstadoSolicitudAdherente.PENDIENTE).length || 0), 0);
    return { total, activos, aptosVigentes, solicitudesAdherentesPendientes };
  }, [socios]);

  if (isInitialLoading) return <div className="space-y-6 p-4"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div><Skeleton className="h-12 w-full" /><Skeleton className="h-96 w-full" /></div>;
  if (isError) return <div className="text-center py-10 text-destructive"><p>Error al cargar los datos. Intente recargar.</p></div>;

  const statCards = [
    { title: "Socios Cargados", value: stats.total, icon: Users, color: "text-blue-500" },
    { title: "Activos (en lista)", value: stats.activos, icon: UserCheck, color: "text-green-500" },
    { title: "Aptos Vigentes (en lista)", value: stats.aptosVigentes, icon: ShieldCheck, color: "text-teal-500" },
    { title: "Solic. Adh. Pend. (en lista)", value: stats.solicitudesAdherentesPendientes, icon: Contact2, color: "text-orange-500" },
    { title: "Solic. Familiares Pend.", value: solicitudesFamiliaresCount, icon: MailQuestion, color: "text-purple-500", href: "/admin/solicitudes-familiares" },
  ];

  const renderDetailRow = (socio: Socio) => {
    console.log("Renderizando Fila de Detalle para:", socio.id, "Datos de familiares:", socio.familiares);
    const familiaresOrdenados = [...(socio.familiares || [])].sort((a, b) => {
      if (a.relacion?.toLowerCase() === 'cónyuge') return -1;
      if (b.relacion?.toLowerCase() === 'cónyuge') return 1;
      if (a.fechaNacimiento && b.fechaNacimiento) {
        return new Date(a.fechaNacimiento as any).getTime() - new Date(b.fechaNacimiento as any).getTime();
      }
      return 0;
    });

    return (
      <TableRow className="bg-muted/30 hover:bg-muted/30">
        <TableCell colSpan={8} className="p-0">
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <section>
              <h4 className="font-semibold mb-2 text-sm text-primary flex items-center gap-2"><Users className="w-4 h-4" />Familiares {familiaresOrdenados.length > 0 && <Badge variant="secondary">{familiaresOrdenados.length}</Badge>}</h4>
              {familiaresOrdenados.length > 0 ? (
                <div className="space-y-2">
                  {familiaresOrdenados.map((f: MiembroFamiliar) => (
                    <div key={f.id || f.dni} className="p-2 border rounded-md bg-background text-xs">
                      <p className="font-semibold">{f.nombre} {f.apellido} <span className="text-muted-foreground font-normal">({f.relacion})</span></p>
                      <p>DNI: {f.dni}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground">No hay familiares registrados.</p>}
            </section>
            <section>
              <h4 className="font-semibold mb-2 text-sm text-primary flex items-center gap-2"><UserPlus className="w-4 h-4" />Adherentes {socio.adherentes && socio.adherentes.length > 0 && <Badge variant="secondary">{socio.adherentes.length}</Badge>}</h4>
              {socio.adherentes && socio.adherentes.length > 0 ? (
                <div className="space-y-2">
                  {socio.adherentes.map((a: Adherente) => (
                    <div key={a.id || a.dni} className="p-2 border rounded-md bg-background text-xs">
                      <div className="flex justify-between items-start">
                        <div><p className="font-semibold">{a.nombre} {a.apellido}</p><p>DNI: {a.dni}</p></div>
                        <Badge variant={a.estadoAdherente === 'Activo' ? 'default' : 'secondary'} className={a.estadoAdherente === 'Activo' ? 'bg-green-600' : 'bg-slate-500'}>{a.estadoAdherente}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground">No hay adherentes registrados.</p>}
            </section>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Gestión de Socios</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map(stat => {
          const card = (
            <Card key={stat.title} className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              </CardContent>
            </Card>
          );
          if (stat.href) {
            return <Link href={stat.href} key={stat.title} className="no-underline">{card}</Link>;
          }
          return card;
        })}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Lista de Socios</CardTitle>
              <CardDescription>Busca, filtra y gestiona los socios del club. Los filtros aplican sobre los datos ya cargados.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleDescargarListaPdf} variant="outline"><FileSpreadsheet className="mr-2 h-4 w-4" /> Descargar Lista (PDF)</Button>
              <Button onClick={handleNuevoMiembro}><UserPlus className="mr-2 h-4 w-4" /> Nuevo Socio</Button>
            </div>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar en la lista actual..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 sm:w-auto" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filtroEstado} onValueChange={(value) => setFiltroEstado(value as EstadoSocioFiltro)}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filtrar por estado" /></SelectTrigger>
                <SelectContent>
                  {(['Todos', 'Activo', 'Inactivo', 'Pendiente'] as EstadoSocioFiltro[]).map(estado => (
                    <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-muted-foreground" /> {/* Icono de flecha para indicar orden */}
              <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Ordenar por..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">N° Socio (más recientes)</SelectItem>
                  <SelectItem value="asc">N° Socio (más antiguos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Input 
                placeholder="N° Socio" 
                value={numeroSocioDirecto} 
                onChange={(e) => setNumeroSocioDirecto(e.target.value)} 
                onKeyPress={(e) => e.key === 'Enter' && handleIrASocio()}
                className="w-[100px]" 
              />
              <Button onClick={handleIrASocio} disabled={buscandoDirecto} variant="secondary" size="sm">
                {buscandoDirecto ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ir'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-x-auto rounded-md border">
            <Table className="w-full min-w-[1000px] caption-bottom text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] px-2"></TableHead>
                  <TableHead className="w-[80px] hidden sm:table-cell">Foto</TableHead>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead className="hidden md:table-cell">N° Socio</TableHead>
                  <TableHead className="hidden lg:table-cell">Adherentes (Act./Pend.)</TableHead>
                  <TableHead>Estado Club</TableHead>
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
                        <TableCell className="hidden lg:table-cell text-center">{activeAdherentsCount}{adherentesPendientesCount > 0 && <Badge variant="default" className="ml-1 bg-orange-500 text-white text-xs px-1.5 py-0.5" title={`${adherentesPendientesCount} solicitudes pendientes`}>{adherentesPendientesCount}P</Badge>}</TableCell>
                        <TableCell><Badge variant={socio.estadoSocio === 'Activo' ? 'default' : socio.estadoSocio === 'Inactivo' ? 'destructive' : 'secondary'} className={socio.estadoSocio === 'Activo' ? 'bg-green-500 hover:bg-green-600' : socio.estadoSocio === 'Inactivo' ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-500 hover:bg-yellow-600'}>{socio.estadoSocio}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={`${aptoStatus.colorClass} border-current font-medium`}>{aptoStatus.status === 'Válido' && <CheckCircle2 className="mr-1 h-3 w-3" />}{aptoStatus.status !== 'Válido' && aptoStatus.status !== 'No Aplica' && <XCircle className="mr-1 h-3 w-3" />}{aptoStatus.status === 'Pendiente' && <CalendarDays className="mr-1 h-3 w-3" />}{aptoStatus.status === 'No Aplica' && <Info className="mr-1 h-3 w-3" />}{aptoStatus.status}</Badge></TableCell>
                        <TableCell className="text-right min-w-[80px]">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones Socio</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleVerEditarPerfil(socio.id)}><Edit3 className="mr-2 h-4 w-4" /> Ver/Editar Perfil</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleEstadoSocio(socio)} className={cn(socio.estadoSocio !== 'Activo' && "text-green-600 focus:text-green-700 focus:bg-green-50", socio.estadoSocio === 'Activo' && "text-orange-600 focus:text-orange-700 focus:bg-orange-50")} >{socio.estadoSocio === 'Activo' ? 'Desactivar Socio' : 'Activar Socio'}</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openAdherentesDialog(socio)}><Contact2 className="mr-2 h-4 w-4" /> Gestionar Adherentes {adherentesPendientesCount > 0 && <Badge variant="default" className="ml-auto bg-orange-500 text-white text-xs px-1">{adherentesPendientesCount}</Badge>}</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleMarcarApto(socio, true)} className="text-green-600 focus:text-green-700 focus:bg-green-50"><ShieldCheck className="mr-2 h-4 w-4" /> Marcar Apto Válido</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMarcarApto(socio, false)} className="text-orange-600 focus:text-orange-700 focus:bg-orange-50"><ShieldAlert className="mr-2 h-4 w-4" /> Marcar Apto Vencido/Inválido</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <AlertDialog><AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive-foreground focus:bg-destructive/90"><Trash2 className="mr-2 h-4 w-4" /> Eliminar Socio</DropdownMenuItem></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Está seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará permanentemente al socio ${socio.nombre} ${socio.apellido} de la base de datos.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleEliminarSocio(socio.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      {isExpanded && renderDetailRow(socio)}
                    </Fragment>
                  );
                })}
                {filteredSocios.length === 0 && !loading && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No se encontraron socios con los criterios seleccionados.</TableCell></TableRow>}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    {hasMore ? (<Button onClick={handleLoadMore} disabled={loading} variant="outline">{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Cargar más socios</Button>) : (<p className="text-sm text-muted-foreground">No hay más socios para mostrar.</p>)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
          <div className="lg:hidden mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground"><ArrowRight className="h-3 w-3 animate-pulse" /><span>Desliza para ver más columnas</span></div>
        </CardContent>
      </Card>
      {selectedSocioForAdherentes && <GestionAdherentesDialog socio={selectedSocioForAdherentes} open={isAdherentesDialogOpen} onOpenChange={setIsAdherentesDialogOpen} onAdherentesUpdated={() => fetchSocios(filtroEstado)} />}
    </div>
  );
}