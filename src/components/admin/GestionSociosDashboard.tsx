
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import type { Socio, AptoMedicoInfo, EstadoCambioGrupoFamiliar, Adherente } from '@/types';
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
import { formatDate, getAptoMedicoStatus, generateId } from '@/lib/helpers';
import { parseISO, addDays, formatISO, subDays } from 'date-fns';
import { MoreVertical, UserPlus, Search, Filter, Users, UserCheck, UserX, ShieldCheck, ShieldAlert, Edit3, Trash2, CheckCircle2, XCircle, CalendarDays, FileSpreadsheet, Users2, MailQuestion, Edit, Contact2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { getSocios as fetchSocios, updateSocio as updateSocioInDb, deleteSocio as deleteSocioInDb } from '@/lib/firebase/firestoreService';
import { GestionAdherentesDialog } from './GestionAdherentesDialog';
import { RevisarCambiosGrupoFamiliarDialog } from './RevisarCambiosGrupoFamiliarDialog';


type EstadoSocioFiltro = 'Todos' | 'Activo' | 'Inactivo' | 'Pendiente Validacion';

export function GestionSociosDashboard() {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoSocioFiltro>('Todos');
  const { toast } = useToast();
  const [selectedSocioForAdherentes, setSelectedSocioForAdherentes] = useState<Socio | null>(null);
  const [isAdherentesDialogOpen, setIsAdherentesDialogOpen] = useState(false);
  const [selectedSocioForRevision, setSelectedSocioForRevision] = useState<Socio | null>(null);
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);


  const loadSocios = useCallback(async () => {
    setLoading(true);
    try {
      const sociosData = await fetchSocios();
      setSocios(sociosData);
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los socios.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSocios();
    const handleSociosUpdated = () => loadSocios();
    window.addEventListener('sociosDBUpdated', handleSociosUpdated);
    return () => {
      window.removeEventListener('sociosDBUpdated', handleSociosUpdated);
    };
  }, [loadSocios]);

  const updateSocioData = async (updatedSocio: Socio) => {
    const result = await updateSocioInDb(updatedSocio);
    if (result) {
      return result;
    }
    throw new Error("Failed to update socio in DB");
  };

  const handleToggleEstadoSocio = async (socioId: string) => {
    const socio = socios.find(s => s.id === socioId);
    if (socio) {
      const nuevoEstado = socio.estadoSocio === 'Activo' ? 'Inactivo' : 'Activo';
      try {
        await updateSocioData({ ...socio, estadoSocio: nuevoEstado });
        toast({ title: 'Estado Actualizado', description: `Socio ${socio.nombre} ${socio.apellido} ahora está ${nuevoEstado.toLowerCase()}.` });
      } catch (error) {
        toast({ title: "Error", description: "No se pudo actualizar el estado del socio.", variant: "destructive" });
      }
    }
  };

  const handleMarcarApto = async (socioId: string, esValido: boolean) => {
    const socio = socios.find(s => s.id === socioId);
    if (socio) {
      const hoy = new Date();
      const nuevaInfoApto: AptoMedicoInfo = esValido
        ? { valido: true, fechaEmision: formatISO(hoy), fechaVencimiento: formatISO(addDays(hoy, 14)), observaciones: 'Apto marcado manualmente por admin.' }
        : { valido: false, razonInvalidez: 'Marcado como no apto/vencido por admin.', fechaEmision: formatISO(socio.aptoMedico?.fechaEmision || subDays(hoy, 15)), fechaVencimiento: formatISO(subDays(hoy,1)) };

      try {
        await updateSocioData({ ...socio, aptoMedico: nuevaInfoApto, ultimaRevisionMedica: formatISO(hoy) });
        toast({ title: 'Apto Médico Actualizado', description: `El apto médico de ${socio.nombre} ${socio.apellido} fue actualizado.` });
      } catch (error) {
         toast({ title: "Error", description: "No se pudo actualizar el apto médico.", variant: "destructive" });
      }
    }
  };

  const handleEliminarSocio = async (socioId: string) => {
    const socio = socios.find(s => s.id === socioId);
    if (socio) {
      const success = await deleteSocioInDb(socioId);
      if (success) {
        toast({ title: 'Socio Eliminado', description: `Socio ${socio.nombre} ${socio.apellido} ha sido eliminado.`, variant: 'destructive' });
      } else {
        toast({ title: "Error", description: "No se pudo eliminar el socio.", variant: "destructive" });
      }
    }
  };

  const handleNuevoMiembro = () => {
     toast({ title: 'Función no implementada', description: 'La creación de nuevos miembros desde admin será implementada.' });
  };

  const handleVerPerfil = (socioId: string) => {
     toast({ title: 'Función no implementada', description: `Ver perfil del socio ${socioId} (simulado).` });
  };

  const openAdherentesDialog = (socio: Socio) => {
    // No es necesario verificar socio.estadoSocio !== 'Activo' aquí, el diálogo manejará la lógica de habilitación de acciones.
    setSelectedSocioForAdherentes(socio);
    setIsAdherentesDialogOpen(true);
  };

  const openRevisionDialog = (socio: Socio) => {
    setSelectedSocioForRevision(socio);
    setIsRevisionDialogOpen(true);
  };


  const filteredSocios = useMemo(() => {
    return socios.filter(socio => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        socio.nombre.toLowerCase().includes(searchLower) ||
        socio.apellido.toLowerCase().includes(searchLower) ||
        socio.numeroSocio.includes(searchLower) ||
        socio.dni.includes(searchLower);

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
    console.log("Simulando generación de PDF para los siguientes socios:", filteredSocios);
    toast({
      title: "Descarga Iniciada (Simulada)",
      description: `Se está generando un PDF con ${filteredSocios.length} socio(s). (Esta es una simulación, ver consola para datos).`,
    });
  };

  const stats = useMemo(() => {
    const total = socios.length;
    const activos = socios.filter(s => s.estadoSocio === 'Activo').length;
    const inactivos = socios.filter(s => s.estadoSocio === 'Inactivo').length;
    const aptosVigentes = socios.filter(s => getAptoMedicoStatus(s.aptoMedico).status === 'Válido').length;
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

  const statCards = [
    { title: "Total Socios", value: stats.total, icon: Users, color: "text-blue-500" },
    { title: "Socios Activos", value: stats.activos, icon: UserCheck, color: "text-green-500" },
    { title: "Aptos Médicos Vigentes", value: stats.aptosVigentes, icon: ShieldCheck, color: "text-teal-500" },
    { title: "Cambios GF Pendientes", value: stats.cambiosPendientesGF, icon: MailQuestion, color: "text-purple-500" },
    { title: "Solic. Adherentes Pend.", value: stats.solicitudesAdherentesPendientes, icon: Contact2, color: "text-orange-500" },
  ];

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
          <ScrollArea className="h-[500px] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Foto</TableHead>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead>N° Socio</TableHead>
                  <TableHead>Adherentes (Pend.)</TableHead>
                  <TableHead>Estado Club</TableHead>
                  <TableHead>Cambio GF</TableHead>
                  <TableHead>Apto Médico</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSocios.map(socio => {
                  const aptoStatus = getAptoMedicoStatus(socio.aptoMedico);
                  const fotoSocio = socio.fotoUrl || `https://placehold.co/40x40.png?text=${socio.nombre[0]}${socio.apellido[0]}`;
                  const adherentesPendientesCount = socio.adherentes?.filter(a => a.estadoSolicitud === EstadoSolicitudAdherente.PENDIENTE).length || 0;
                  return (
                    <TableRow key={socio.id}>
                      <TableCell>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={fotoSocio} alt={`${socio.nombre} ${socio.apellido}`} data-ai-hint="member photo" />
                          <AvatarFallback>{socio.nombre[0]}{socio.apellido[0]}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{socio.nombre} {socio.apellido}</TableCell>
                      <TableCell>{socio.numeroSocio}</TableCell>
                      <TableCell className="text-center">
                        {socio.adherentes?.length || 0}
                        {adherentesPendientesCount > 0 && (
                          <Badge variant="default" className="ml-1 bg-orange-500 text-white text-xs px-1.5 py-0.5">
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
                       <TableCell>
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
                          {aptoStatus.status !== 'Válido' && <XCircle className="mr-1 h-3 w-3" />}
                          {aptoStatus.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones Socio</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleVerPerfil(socio.id)}><Edit3 className="mr-2 h-4 w-4" /> Ver Perfil</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleEstadoSocio(socio.id)}>
                              {socio.estadoSocio === 'Activo' ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                              {socio.estadoSocio === 'Activo' ? 'Desactivar Socio' : 'Activar Socio'}
                            </DropdownMenuItem>
                             <DropdownMenuItem 
                                onClick={() => openRevisionDialog(socio)}
                                disabled={socio.estadoCambioGrupoFamiliar !== 'Pendiente'}
                              >
                                <Edit className="mr-2 h-4 w-4" /> Revisar Cambios GF
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
                                    Esta acción no se puede deshacer. Se eliminará permanentemente al socio {socio.nombre} {socio.apellido} de la base de datos.
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
        </CardContent>
      </Card>
       {selectedSocioForAdherentes && (
        <GestionAdherentesDialog
          socio={selectedSocioForAdherentes}
          open={isAdherentesDialogOpen}
          onOpenChange={setIsAdherentesDialogOpen}
          onAdherentesUpdated={loadSocios} 
        />
      )}
      {selectedSocioForRevision && (
        <RevisarCambiosGrupoFamiliarDialog
            socio={selectedSocioForRevision}
            open={isRevisionDialogOpen}
            onOpenChange={setIsRevisionDialogOpen}
            onRevisionUpdated={loadSocios}
        />
      )}
    </div>
  );
}
