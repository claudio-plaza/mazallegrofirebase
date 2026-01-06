'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Socio, MiembroFamiliar, AptoMedicoInfo, RevisionMedica, TipoPersona, Adherente, SolicitudInvitadosDiarios } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, ShieldCheck, ShieldAlert, Stethoscope, FileEdit, Gift, AlertTriangle, FileSpreadsheet, Users, CheckSquare, Square } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { getAptoMedicoStatus, esCumpleanosHoy, normalizeText, parseAnyDate, formatDate } from '@/lib/helpers';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { NuevaRevisionDialog, type SearchedPerson } from './NuevaRevisionDialog';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { format, isToday, isSameMonth, isValid, formatISO, parseISO } from 'date-fns';
import { getSocio, getAllRevisionesMedicas as fetchRevisionesFromService, getAllSolicitudesInvitadosDiarios } from '@/lib/firebase/firestoreService';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// =================================================================
// COMPONENTE PRINCIPAL
// =================================================================
export function PanelMedicoDashboard() {
  const { user, userRole, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensajeBusqueda, setMensajeBusqueda] = useState('Ingrese un término para buscar un grupo familiar.');
  const [socioTitular, setSocioTitular] = useState<Socio | null>(null);
  const [displayablePeople, setDisplayablePeople] = useState<any[]>([]);
  const [personaParaRevision, setPersonaParaRevision] = useState<SearchedPerson | null>(null);
  const [personasParaRevisionMultiple, setPersonasParaRevisionMultiple] = useState<SearchedPerson[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: revisiones = [], isLoading: isLoadingRevisiones } = useQuery<RevisionMedica[]>({ queryKey: ['revisiones'], queryFn: fetchRevisionesFromService });

  const handleSearch = useCallback(async () => {
    if (!user) { setMensajeBusqueda('Debe iniciar sesión.'); return; }
    if (!searchTerm.trim()) { setMensajeBusqueda('Ingrese un término de búsqueda.'); return; }

    setLoading(true);
    setSocioTitular(null);
    setDisplayablePeople([]);
    setSelectedIds(new Set());
    setMensajeBusqueda('Buscando...');

    try {
      const functions = getFunctions();
      const searchSocioCallable = httpsCallable(functions, 'searchSocio');
      const { data }: any = await searchSocioCallable({ searchTerm: normalizeText(searchTerm) });
      const hit = data.results?.[0];

      if (!hit) { setMensajeBusqueda('No se encontró ninguna persona.'); setLoading(false); return; }

      const titularId = hit.type === 'Socio Titular' ? hit.objectID : hit.socioTitularId;
      if (!titularId) throw new Error('No se pudo determinar el socio titular.');

      const titularData = await getSocio(titularId);
      if (!titularData) throw new Error(`Datos del socio titular no encontrados.`);
      setSocioTitular(titularData);

      const detectarCumple = (fechaNac: any) => isValid(new Date(fechaNac)) && isToday(new Date(fechaNac));

      const miembrosOriginales = [
        { ...titularData, id: titularData.id, relacion: 'Titular', tipo: 'Socio Titular' as TipoPersona },
        ...(titularData.familiares || []).map(f => ({ ...f, id: f.dni, relacion: f.relacion, tipo: 'Familiar' as TipoPersona })),
        ...(titularData.adherentes || []).map(a => ({ ...a, id: a.dni, relacion: 'Adherente', tipo: 'Adherente' as TipoPersona }))
      ];

      const todayISO = formatISO(new Date(), { representation: 'date' });
      const solicitudes = await getAllSolicitudesInvitadosDiarios({ socioId: titularData.id, fecha: todayISO });
      const solicitudActual = solicitudes[0];
      const invitadosOriginales = solicitudActual?.listaInvitadosDiarios || [];
      
      const todosOriginales = [
        ...miembrosOriginales, 
        ...invitadosOriginales.map(inv => ({
          ...inv, 
          id: inv.dni, 
          relacion: 'Invitado Diario', 
          tipo: 'Invitado Diario' as TipoPersona,
          // Pasamos la fecha de la solicitud para que el diálogo sepa dónde guardar
          fechaVisita: solicitudActual.fecha 
        }))
      ];

      const personasConApto = todosOriginales.map((p) => {
        const aptoMedico = getAptoMedicoStatus((p as any).aptoMedico, p.fechaNacimiento);
        return {
          id: p.id,
          nombreCompleto: `${p.nombre} ${p.apellido}`,
          dni: p.dni,
          fotoUrl: ((p as any).fotoUrl || (p as any).fotoPerfil) as string | undefined,
          aptoMedico: aptoMedico,
          fechaNacimiento: p.fechaNacimiento,
          relacion: p.relacion,
          esCumpleanero: detectarCumple(p.fechaNacimiento),
          tipo: p.tipo,
          rawData: p,
        };
      });
      
      setDisplayablePeople(personasConApto);
      setMensajeBusqueda('');

    } catch (error: any) {
      setMensajeBusqueda(`Error: ${error.message}`);
      toast({ title: "Error de Búsqueda", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, user, toast]);

  const handleOpenDialog = (persona: any) => {
    const personaParaDialog: SearchedPerson = {
        id: persona.id,
        dni: persona.dni,
        nombreCompleto: persona.nombreCompleto,
        fechaNacimiento: new Date(persona.fechaNacimiento as any),
        tipo: persona.tipo,
        socioTitularId: socioTitular?.id,
        aptoMedicoActual: persona.rawData.aptoMedico,
        fechaVisitaInvitado: persona.relacion === 'Invitado Diario' ? (persona.rawData.fechaVisita ? parseISO(persona.rawData.fechaVisita) : new Date()) : undefined,
    };
    setPersonaParaRevision(personaParaDialog);
    setPersonasParaRevisionMultiple([]);
    setIsDialogOpen(true);
  };

  const handleOpenBulkDialog = () => {
    if (selectedIds.size === 0) return;
    
    const seleccionados = displayablePeople
        .filter(p => selectedIds.has(p.id))
        .map(p => ({
            id: p.id,
            dni: p.dni,
            nombreCompleto: p.nombreCompleto,
            fechaNacimiento: new Date(p.fechaNacimiento as any),
            tipo: p.tipo,
            socioTitularId: socioTitular?.id,
            aptoMedicoActual: p.rawData.aptoMedico,
            fechaVisitaInvitado: p.relacion === 'Invitado Diario' ? (p.rawData.fechaVisita ? parseISO(p.rawData.fechaVisita) : new Date()) : undefined,
        }));
    
    setPersonasParaRevisionMultiple(seleccionados);
    setPersonaParaRevision(null);
    setIsDialogOpen(true);
  };

  const toggleSelect = (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id); else next.add(id);
      setSelectedIds(next);
  };

  const selectAll = () => {
      if (selectedIds.size === displayablePeople.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(displayablePeople.map(p => p.id)));
      }
  };

  if (authLoading || isLoadingRevisiones) return <Skeleton className="h-screen w-full" />;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start gap-4">
        <h1 className="text-3xl font-bold flex items-center"><Stethoscope className="mr-3 h-8 w-8 text-primary"/>Panel Médico</h1>
        <NuevaRevisionDialog 
            onRevisionGuardada={() => { 
                queryClient.invalidateQueries({ queryKey: ['revisiones'] }); 
                setSelectedIds(new Set());
                if(searchTerm) handleSearch(); 
            }} 
            open={isDialogOpen} 
            onOpenChange={setIsDialogOpen} 
            personaPreseleccionada={personaParaRevision} 
            personasSeleccionadasMultiple={personasParaRevisionMultiple}
            bloquearBusqueda={!!personaParaRevision || personasParaRevisionMultiple.length > 0} 
        />
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Search className="mr-2 h-6 w-6 text-primary"/>Buscar Grupo Familiar</CardTitle>
          <CardDescription>Ingrese N° Socio, DNI o Nombre de cualquier miembro para ver el estado médico de todo su grupo.</CardDescription>
          <div className="flex space-x-2 pt-4">
            <Input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()} disabled={loading} />
            <Button onClick={handleSearch} disabled={loading}>{loading ? "Buscando..." : "Buscar"}</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && <Skeleton className="h-48 w-full" />}
          {!loading && mensajeBusqueda && <p className="text-sm text-center text-muted-foreground pt-4">{mensajeBusqueda}</p>}
          {!loading && displayablePeople.length > 0 && (
            <div className="space-y-4 pt-4">
              {socioTitular && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <div>
                        <p className="text-blue-800 font-semibold">Grupo de: {socioTitular.nombre} {socioTitular.apellido} (Socio N°: {socioTitular.numeroSocio})</p>
                        <p className="text-xs text-blue-600 mt-1">{displayablePeople.length} integrantes en total</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={selectAll} className="bg-white">
                            {selectedIds.size === displayablePeople.length ? <Square className="mr-2 h-4 w-4"/> : <CheckSquare className="mr-2 h-4 w-4"/>}
                            {selectedIds.size === displayablePeople.length ? 'Desmarcar todos' : 'Marcar todos'}
                        </Button>
                        {selectedIds.size >= 2 && (
                            <Button size="sm" onClick={handleOpenBulkDialog} className="bg-primary hover:bg-primary/90">
                                <FileEdit className="mr-2 h-4 w-4" /> REVISIÓN MASIVA ({selectedIds.size})
                            </Button>
                        )}
                    </div>
                </div>
              )}
              {displayablePeople.map(p => (
                <MedicalInfoCard 
                    key={p.id} 
                    person={p} 
                    onNewRevision={handleOpenDialog}
                    isSelected={selectedIds.has(p.id)}
                    onToggleSelect={() => toggleSelect(p.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {userRole === 'admin' && (
          <Card className="shadow-lg">
            <CardHeader><CardTitle className="flex items-center"><FileSpreadsheet className="mr-2 h-6 w-6 text-primary"/> Últimas Revisiones Registradas</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] w-full">
                <Table>
                  <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Persona</TableHead><TableHead>Tipo</TableHead><TableHead>Resultado</TableHead><TableHead>Vencimiento</TableHead><TableHead>Médico</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {revisiones.slice(0, 10).map((r) => <TableRow key={r.id}><TableCell>{format(parseAnyDate(r.fechaRevision)!, 'dd/MM/yy')}</TableCell><TableCell>{r.socioNombre}</TableCell><TableCell><Badge variant="outline">{r.tipoPersona}</Badge></TableCell><TableCell><Badge variant={r.resultado === 'Apto' ? 'default' : 'destructive'} className={r.resultado === 'Apto' ? 'bg-green-500' : ''}>{r.resultado}</Badge></TableCell><TableCell>{r.fechaVencimientoApto ? format(parseAnyDate(r.fechaVencimientoApto)!, 'dd/MM/yy') : 'N/A'}</TableCell><TableCell>{r.medicoResponsable}</TableCell></TableRow>)}
                    {revisiones.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8">No hay revisiones.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
      )}
    </div>
  );
}

// =================================================================
// SUB-COMPONENTE
// =================================================================

function MedicalInfoCard({ person, onNewRevision, isSelected, onToggleSelect }: { person: any, onNewRevision: (p: any) => void, isSelected?: boolean, onToggleSelect?: () => void }) {
    const apto = person.aptoMedico;
  
    return (
      <Card className={`border-2 shadow-sm transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'bg-card'}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex items-center self-center pr-2">
                <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} id={`check-${person.id}`} className="h-5 w-5" />
              </div>
              <Avatar className="w-16 h-16"><AvatarImage src={person.fotoUrl} /><AvatarFallback>{person.nombreCompleto.split(' ').map((n:string)=>n[0]).join('')}</AvatarFallback></Avatar>
              <label htmlFor={`check-${person.id}`} className="cursor-pointer">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-lg">{person.nombreCompleto}</h3>
                  <Badge variant="outline" className={person.relacion === 'Invitado Diario' ? 'bg-orange-100 text-orange-800' : ''}>{person.relacion}</Badge>
                  {person.esCumpleanero && <Badge className="bg-pink-500 text-white"><Gift className="mr-1 h-3 w-3" /> ¡Hoy Cumple!</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">DNI: {person.dni}</p>
                <p className="text-sm text-muted-foreground italic">F. Nacimiento: {person.fechaNacimiento ? (typeof person.fechaNacimiento === 'string' ? formatDate(parseISO(person.fechaNacimiento), 'dd/MM/yyyy') : formatDate(person.fechaNacimiento, 'dd/MM/yyyy')) : '---'}</p>
              </label>
            </div>
            <Button variant="outline" onClick={() => onNewRevision(person)}><FileEdit className="mr-2 h-4 w-4" /> Nueva Revisión</Button>
          </div>
          <Alert className={`mt-3 ${apto.colorClass}`}>
            <div className="flex items-center">
                {apto.status === 'Válido' && <ShieldCheck className="h-5 w-5 mr-2 text-green-600" />}
                {apto.status !== 'Válido' && apto.status !== 'No Aplica' && <ShieldAlert className="h-5 w-5 mr-2 text-yellow-600" />}
                <p className={`text-sm font-medium ${apto.colorClass.replace(/bg-\w+-\d+/, (match: string) => match.replace('bg', 'text'))}`}>
                    Apto Médico: <strong>{apto.status}</strong>. {apto.message}
                </p>
            </div>
            {apto.observaciones && (
              <div className="mt-2 pl-7 text-sm text-muted-foreground border-l-2 border-primary/20">
                <span className="font-semibold text-xs uppercase tracking-wider block mb-1">Observaciones:</span>
                {apto.observaciones}
              </div>
            )}
          </Alert>
        </CardContent>
      </Card>
    )
}
