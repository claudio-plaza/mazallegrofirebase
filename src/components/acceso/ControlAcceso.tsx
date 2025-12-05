'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Socio, MiembroFamiliar, InvitadoDiario, Adherente, MetodoPagoInvitado, RelacionFamiliar, EstadoResponsable, AptoMedicoDisplay, UltimoIngreso } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, ShieldCheck, ShieldAlert, CheckCircle, XCircle, LogIn, LogOut, Ticket, UserCheck, CalendarDays, Info, Users, Gift, AlertTriangle, CreditCard, Check, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import Image from 'next/image';
import { esCumpleanosHoy, normalizeText } from '@/lib/helpers';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format, isToday, isValid, formatISO } from 'date-fns';
import { getSocio, getAllSolicitudesInvitadosDiarios, verificarIngresoHoy, obtenerUltimoIngreso, verificarResponsableIngreso } from '@/lib/firebase/firestoreService';
import { getAptoMedicoStatus } from '@/lib/helpers';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useRouter } from 'next/navigation';
import { addDoc, collection, Timestamp, query, where, getDocs, orderBy, limit, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';

// =================================================================
// TYPES
// =================================================================

type DisplayablePerson = { id: string; nombre: string; apellido: string; nombreCompleto: string; dni: string; fotoUrl?: string; aptoMedico: AptoMedicoDisplay; fechaNacimiento?: string | Date; relacion: string; estadoSocio?: Socio['estadoSocio']; estadoAdherente?: Adherente['estadoAdherente']; esCumpleanero: boolean; yaIngreso: boolean; ultimoIngreso: UltimoIngreso | null; titularId?: string; socioTitularId?: string; tipo: string;};
interface InvitadoState { id: string; nombre: string; apellido: string; dni: string; fechaNacimiento: string | Date; esInvitadoCumpleanos: boolean; metodoPago: MetodoPagoInvitado | null; esCumpleanero: boolean; yaIngresado: boolean; ultimoIngreso: UltimoIngreso | null; puedeIngresar: boolean; socioId: string;}

// =================================================================
// COMPONENTE PRINCIPAL
// =================================================================
export function ControlAcceso() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensajeBusqueda, setMensajeBusqueda] = useState('');
  const [socioTitular, setSocioTitular] = useState<Socio | null>(null);
  const [displayablePeople, setDisplayablePeople] = useState<DisplayablePerson[]>([]);
  const [invitadosState, setInvitadosState] = useState<InvitadoState[]>([]);
  const [estadoResponsable, setEstadoResponsable] = useState<EstadoResponsable>({ hayResponsable: false });
  const [metodoPagoInvitados, setMetodoPagoInvitados] = useState<{
    [invitadoDNI: string]: {
      esInvitadoCumpleanos: boolean;
      pagoEfectivo: boolean;
      pagoTransferencia: boolean;
      pagoCaja: boolean;
    };
  }>({});
  const [cuposCumpleanos, setCuposCumpleanos] = useState<{
    disponibles: number;
    usados: number;
    quienesCumplen: string[];
  }>({
    disponibles: 0,
    usados: 0,
    quienesCumplen: []
  });

  const calcularCuposCumpleanos = (personas: DisplayablePerson[]): {
    cuposDisponibles: number;
    quienesCumplen: string[];
  } => {
    const hoy = new Date();
    const quienesCumplen: string[] = [];
    
    personas.forEach(persona => {
      if (persona.fechaNacimiento) {
        const fechaNac = new Date(persona.fechaNacimiento);
        
        if (fechaNac.getDate() === hoy.getDate() && 
            fechaNac.getMonth() === hoy.getMonth()) {
          quienesCumplen.push(`${persona.nombre} ${persona.apellido}`);
        }
      }
    });
    
    const cuposDisponibles = quienesCumplen.length * 15;
    
    console.log('🎂 Personas que cumplen hoy:', quienesCumplen);
    console.log('🎁 Cupos de cumpleaños disponibles:', cuposDisponibles);
    
    return { cuposDisponibles, quienesCumplen };
  };

  const handleMetodoPagoChange = (dni: string, tipo: string, checked: boolean) => {
    setMetodoPagoInvitados(prev => {
      const current = prev[dni] || {
        esInvitadoCumpleanos: false,
        pagoEfectivo: false,
        pagoTransferencia: false,
        pagoCaja: false
      };
      
      if (tipo === 'cumpleanos') {
        if (checked) {
          if (cuposCumpleanos.usados >= cuposCumpleanos.disponibles) {
            toast({ 
              title: "Cupos Agotados", 
              description: `No hay más cupos de cumpleaños disponibles (${cuposCumpleanos.disponibles} en total)`, 
              variant: "destructive" 
            });
            return prev;
          }
          
          setCuposCumpleanos(p => ({ ...p, usados: p.usados + 1 }));
        } else {
          setCuposCumpleanos(p => ({ ...p, usados: Math.max(0, p.usados - 1) }));
        }
        
        return {
          ...prev,
          [dni]: {
            esInvitadoCumpleanos: checked,
            pagoEfectivo: false,
            pagoTransferencia: false,
            pagoCaja: false
          }
        };
      } else {
        const estabaEnCumpleanos = current.esInvitadoCumpleanos;
        
        if (estabaEnCumpleanos) {
          setCuposCumpleanos(p => ({ ...p, usados: Math.max(0, p.usados - 1) }));
        }
        
        return {
          ...prev,
          [dni]: {
            esInvitadoCumpleanos: false,
            pagoEfectivo: tipo === 'efectivo' ? checked : false,
            pagoTransferencia: tipo === 'transferencia' ? checked : false,
            pagoCaja: tipo === 'caja' ? checked : false
          }
        };
      }
    });
  };

  const handleSearch = useCallback(async (term: string) => {
    if (!user) { setMensajeBusqueda('Debe iniciar sesión para buscar.'); return; }
    if (!term.trim()) { setMensajeBusqueda('Ingrese un término de búsqueda.'); return; }

    setLoading(true);
    setSocioTitular(null); setDisplayablePeople([]); setInvitadosState([]); setMensajeBusqueda('Buscando...');

    try {
      const functions = getFunctions();
      const searchSocioCallable = httpsCallable(functions, 'searchSocio');
      const { data }: any = await searchSocioCallable({ searchTerm: normalizeText(term) });
      const hit = data.results?.[0];

      if (!hit) { setMensajeBusqueda('No se encontró ninguna persona con ese criterio.'); setLoading(false); return; }

      const titularId = hit.type === 'Socio Titular' ? hit.objectID : hit.socioTitularId;
      if (!titularId) throw new Error('No se pudo determinar el socio titular.');

      const titularData = await getSocio(titularId);
      if (!titularData) throw new Error(`Datos del socio titular (ID: ${titularId}) no encontrados.`);
      setSocioTitular(titularData);

      const detectarCumple = (fechaNac: any) => isValid(new Date(fechaNac)) && isToday(new Date(fechaNac));
      const estadoResp = await verificarResponsableIngreso(titularData.id);
      setEstadoResponsable(estadoResp);

      const miembrosOriginales = [
        { ...titularData, id: titularData.id, dni: titularData.dni, relacion: 'Titular' as const, tipo: 'titular' as const },
        ...(titularData.familiares || []).map(f => ({ ...f, id: f.dni, relacion: f.relacion as RelacionFamiliar, tipo: 'familiar' as const, titularId: titularData.id })),
        ...(titularData.adherentes || []).map(a => ({ ...a, id: a.dni, relacion: 'Adherente' as const, tipo: 'adherente' as const, socioTitularId: titularData.id }))
      ];

      const personasConEstado = await Promise.all(
        miembrosOriginales.map(async (p) => {
          const aptoMedico = getAptoMedicoStatus(p.aptoMedico, p.fechaNacimiento);
          const yaIngreso = await verificarIngresoHoy(p.dni);
          const ultimoIngreso = yaIngreso ? await obtenerUltimoIngreso(p.dni) : null;
          return {
            ...p,
            nombreCompleto: `${p.nombre} ${p.apellido}`,
            aptoMedico,
            yaIngreso,
            ultimoIngreso,
            estadoSocio: titularData.estadoSocio,
            esCumpleanero: esCumpleanosHoy(p.fechaNacimiento),
          } as DisplayablePerson;
        })
      );
      setDisplayablePeople(personasConEstado);

      const { cuposDisponibles, quienesCumplen } = calcularCuposCumpleanos(personasConEstado);
      setCuposCumpleanos({
        disponibles: cuposDisponibles,
        usados: 0,
        quienesCumplen
      });

      const todayISO = formatISO(new Date(), { representation: 'date' });
      const solicitudes = await getAllSolicitudesInvitadosDiarios({ socioId: titularData.id, fecha: todayISO });
      const invitados = solicitudes[0]?.listaInvitadosDiarios || [];
      
      const invitadosConEstado = await Promise.all(invitados.map(async inv => {
          const yaIngreso = await verificarIngresoHoy(inv.dni);
          const ultimoIngreso = yaIngreso ? await obtenerUltimoIngreso(inv.dni) : null;
          return { ...inv, id: inv.dni, esInvitadoCumpleanos: inv.esDeCumpleanos || false, metodoPago: inv.metodoPago || null, esCumpleanero: detectarCumple(inv.fechaNacimiento), yaIngresado: yaIngreso, ultimoIngreso, socioId: titularData.id };
      }));
      setInvitadosState(invitadosConEstado as any);

      setMensajeBusqueda('');
    } catch (error: any) {
      setMensajeBusqueda(`Error: ${error.message}`);
      toast({ title: "Error de Búsqueda", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const buscarNuevamente = useCallback(async () => {
    if (searchTerm) await handleSearch(searchTerm);
  }, [searchTerm, handleSearch]);

  const registrarIngreso = async (persona: any) => {
    try {
        const user = auth.currentUser;
        if (!user) {
            toast({ title: "Error", description: "No autenticado", variant: "destructive" });
            return;
        }

        const yaIngreso = await verificarIngresoHoy(persona.dni);
        if (yaIngreso) {
            toast({ title: "Error", description: "Esta persona ya registró su ingreso hoy", variant: "destructive" });
            return;
        }

        let titularId, titularNumero;

        if (persona.tipo === 'titular') {
            titularId = persona.id;
            titularNumero = persona.numeroSocio;
        } else if (persona.tipo === 'familiar') {
            if (!persona.titularId) {
                toast({ title: "Error", description: "El familiar no tiene titular asociado", variant: "destructive" });
                return;
            }
            titularId = persona.titularId;
            const titularDoc = await getDoc(doc(db, 'socios', persona.titularId));
            if (!titularDoc.exists()) {
                toast({ title: "Error", description: "No se encontró el socio titular", variant: "destructive" });
                return;
            }
            titularNumero = titularDoc.data()?.numeroSocio || 'N/A';
        } else if (persona.tipo === 'adherente') {
            if (!persona.socioTitularId) {
                toast({ title: "Error", description: "El adherente no tiene titular asociado", variant: "destructive" });
                return;
            }
            titularId = persona.socioTitularId;
            const titularDoc = await getDoc(doc(db, 'socios', persona.socioTitularId));
            if (!titularDoc.exists()) {
                toast({ title: "Error", description: "No se encontró el socio titular", variant: "destructive" });
                return;
            }
            titularNumero = titularDoc.data()?.numeroSocio || 'N/A';
        } else {
            toast({ title: "Error", description: "Tipo de persona desconocido", variant: "destructive" });
            return;
        }

        const registroData = {
            fecha: Timestamp.now(),
            socioTitularId: titularId,
            socioTitularNumero: titularNumero,
            personaId: persona.id,
            personaNombre: persona.nombre,
            personaApellido: persona.apellido,
            personaDNI: persona.dni,
            personaTipo: persona.tipo || 'titular',
            personaRelacion: persona.relacion || null,
            tipoRegistro: 'entrada',
            registradoPor: user.uid,
            registradoPorEmail: user.email || ''
        };

        await addDoc(collection(db, 'registros_acceso'), registroData);
        toast({ title: "Ingreso Registrado", description: `Ingreso registrado para ${persona.nombre} ${persona.apellido}` });
        
        if (socioTitular) {
          const nuevoEstadoResp = await verificarResponsableIngreso(socioTitular.id);
          setEstadoResponsable(nuevoEstadoResp);
          console.log('🔄 Estado del responsable actualizado:', nuevoEstadoResp);
        }

        await buscarNuevamente();
    } catch (error: any) {
        console.error('ERROR AL REGISTRAR INGRESO:', error);
        toast({ title: "Error", description: "Error al registrar el ingreso", variant: "destructive" });
    }
  };

  const registrarIngresoInvitado = async (invitado: InvitadoState) => {
    if (!user || !socioTitular) return;
    
    try {
      const yaIngreso = await verificarIngresoHoy(invitado.dni);
      if (yaIngreso) {
        toast({ title: "Error", description: "Este invitado ya ingresó hoy", variant: "destructive" });
        return;
      }
  
      const estadoResp = await verificarResponsableIngreso(invitado.socioId);
      if (!estadoResp.hayResponsable) {
        toast({ title: "Acción Bloqueada", description: "Un miembro del grupo debe ingresar primero.", variant: "destructive" });
        return;
      }
  
      const metodoPago = metodoPagoInvitados[invitado.dni];
      
      if (!metodoPago) {
        toast({ 
          title: "Método de Pago Requerido", 
          description: "Debe seleccionar un método de pago o marcarlo como invitado de cumpleaños", 
          variant: "destructive" 
        });
        return;
      }
      
      if (!metodoPago.esInvitadoCumpleanos) {
        const tienePago = metodoPago.pagoEfectivo || metodoPago.pagoTransferencia || metodoPago.pagoCaja;
        if (!tienePago) {
          toast({ 
            title: "Método de Pago Requerido", 
            description: "Debe seleccionar cómo pagó el invitado (Efectivo, Transferencia o Caja)", 
            variant: "destructive" 
          });
          return;
        }
      }
      
      let metodoPagoFinal = '';
      if (metodoPago.esInvitadoCumpleanos) {
        metodoPagoFinal = 'Gratis (Cumpleaños)';
      } else if (metodoPago.pagoEfectivo) {
        metodoPagoFinal = 'Efectivo';
      } else if (metodoPago.pagoTransferencia) {
        metodoPagoFinal = 'Transferencia';
      } else if (metodoPago.pagoCaja) {
        metodoPagoFinal = 'Caja';
      }
  
      await addDoc(collection(db, "registros_acceso"), {
        fecha: Timestamp.now(),
        socioTitularId: invitado.socioId,
        socioTitularNumero: socioTitular.numeroSocio,
        personaId: invitado.id,
        personaNombre: invitado.nombre,
        personaApellido: invitado.apellido,
        personaDNI: invitado.dni,
        personaTipo: 'invitado',
        tipoRegistro: 'entrada',
        registradoPor: user.uid,
        registradoPorEmail: user.email || '',
        esInvitadoCumpleanos: metodoPago.esInvitadoCumpleanos,
        metodoPago: metodoPagoFinal,
        habilitadoPor: `${estadoResp.responsable?.nombre} ${estadoResp.responsable?.apellido}`,
        habilitadoPorTipo: estadoResp.responsable?.tipo
      });

      // --- INICIO DE CÓDIGO AÑADIDO ---
      // Nota: socioTitular.id es el ID del titular en el contexto actual.
      await updateDoc(doc(db, 'socios', socioTitular.id), {
        ultimoIngreso: Timestamp.now()
      });
      // --- FIN DE CÓDIGO AÑADIDO ---
      
      toast({ 
        title: "Ingreso Registrado", 
        description: `${invitado.nombre} ${invitado.apellido} - ${metodoPagoFinal}` 
      });
      
      buscarNuevamente();
      
    } catch (error: any) {
      toast({ title: "Error de Registro", description: error.message, variant: "destructive" });
    }
  };

  const anularIngreso = async (personaDNI: string) => {
    if (!window.confirm('¿Está seguro de anular el ingreso?')) return;
    if (!user) return;
    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const registrosRef = collection(db, 'registros_acceso');
        const q = query(registrosRef, where('personaDNI', '==', personaDNI), where('tipoRegistro', '==', 'entrada'), where('fecha', '>=', Timestamp.fromDate(hoy)), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) { toast({ title: "Error", description: "No se encontró el registro de ingreso para anular.", variant: "destructive" }); return; }
        await deleteDoc(snapshot.docs[0].ref);
        toast({ title: "Ingreso Anulado" });
        buscarNuevamente();
    } catch (error: any) { toast({ title: "Error al Anular", description: error.message, variant: "destructive" }); }
  };

  if (authLoading) return <p>Cargando...</p>;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card className="w-full max-w-4xl mx-auto shadow-lg">
        <CardHeader><CardTitle className="text-2xl">Control de Acceso</CardTitle><CardDescription>Busque un socio titular por DNI, Nombre o N° de Socio para ver su grupo y registrar ingresos.</CardDescription></CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input type="text" placeholder="Buscar Socio Titular..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchTerm)} className="flex-grow" disabled={loading} />
            <Button onClick={() => handleSearch(searchTerm)} disabled={loading}>{loading ? "Buscando..." : <><Search className="mr-2 h-4 w-4" /> Buscar</>}</Button>
          </div>
          {mensajeBusqueda && <p className="text-sm text-center text-muted-foreground mt-4">{mensajeBusqueda}</p>}
        </CardContent>
      </Card>

      {loading && !socioTitular && <Skeleton className="h-64 w-full max-w-4xl mx-auto" />} 

      {socioTitular && (
        <div className="w-full max-w-4xl mx-auto space-y-4">
            {displayablePeople.map(p => <MemberCard key={p.id} person={p} onRegister={() => registrarIngreso(p)} onCancel={() => anularIngreso(p.dni)} onShowCarnet={() => router.push(`/carnet?titularId=${socioTitular.numeroSocio}${p.relacion !== 'Titular' ? `&memberDni=${p.dni}`: ''}`)} />)}
            <GuestSection 
              invitados={invitadosState} 
              estadoResponsable={estadoResponsable} 
              onRegisterInvitado={registrarIngresoInvitado} 
              onAnularIngreso={anularIngreso}
              metodoPagoInvitados={metodoPagoInvitados}
              onMetodoPagoChange={handleMetodoPagoChange}
              cuposCumpleanos={cuposCumpleanos}
            />
        </div>
      )}
    </div>
  );
}

// =================================================================
// SUB-COMPONENTES
// =================================================================

function MemberCard({ person, onRegister, onCancel, onShowCarnet }: { person: DisplayablePerson, onRegister: () => void, onCancel: () => void, onShowCarnet: () => void }) {
  const esTitular = person.tipo === 'titular';
  const esFamiliar = person.tipo === 'familiar';
  const esAdherente = person.tipo === 'adherente';
  const titularActivo = person.estadoSocio === 'Activo';
  let puedeIngresarGeneral = false;
  if (esTitular) {
    puedeIngresarGeneral = titularActivo;
  } else if (esFamiliar) {
    puedeIngresarGeneral = titularActivo;
  } else if (esAdherente) {
    puedeIngresarGeneral = titularActivo && person.estadoAdherente === 'Activo';
  }

  return (
    <Card className={`border-2 ${puedeIngresarGeneral ? 'border-gray-200' : 'border-red-300'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Avatar className="w-16 h-16 cursor-pointer">
                      <AvatarImage src={person.fotoUrl || (person as any).fotoPerfil} />
                      <AvatarFallback>{person.nombreCompleto.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                    </Avatar>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <Image
                      src={person.fotoUrl || (person as any).fotoPerfil || '/placeholder.png'}
                      alt={`Foto de ${person.nombreCompleto}`}
                      width={500}
                      height={500}
                      className="rounded-md object-contain"
                    />
                  </DialogContent>
                </Dialog>
                <div>
                    <div className="flex items-center gap-2 flex-wrap"><h3 className="font-bold text-lg">{person.nombreCompleto}</h3><Badge className="bg-blue-100 text-blue-800">{person.relacion}</Badge>{person.esCumpleanero && <Badge className="bg-pink-500 text-white"><Gift className="mr-1 h-3 w-3" /> ¡Hoy Cumple!</Badge>}</div>
                    <p className="text-sm text-muted-foreground">DNI: {person.dni}</p>
                    {(person.relacion === 'Titular' || person.relacion === 'Adherente') && <div className="text-sm text-muted-foreground">Estado: <Badge variant={puedeIngresarGeneral ? 'default' : 'destructive'} className={puedeIngresarGeneral ? 'bg-green-500' : ''}>{person.relacion === 'Titular' ? person.estadoSocio : person.estadoAdherente}</Badge></div>}
                </div>
            </div>
            <div className="flex flex-col items-end gap-2">
                <Button variant="outline" size="sm" onClick={onShowCarnet}><Ticket className="mr-2 h-4 w-4" /> Ver Carnet</Button>
                {person.yaIngreso ? (
                <div className="flex flex-col items-end gap-1">
                    <Button variant="outline" size="sm" disabled className="bg-green-50 border-green-500 text-green-700 cursor-not-allowed"><Check className="mr-2 h-4 w-4" /> Ingresó - {person.ultimoIngreso?.hora}</Button>
                    <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs text-red-600 hover:text-red-700">Anular ingreso</Button>
                </div>
                ) : (
                  <Button onClick={() => onRegister()} disabled={!puedeIngresarGeneral} className="bg-orange-500 hover:bg-orange-600"><LogIn className="mr-2 h-4 w-4" /> Registrar Ingreso</Button>
                )}
            </div>
        </div>
        <Alert className={`mt-3 ${person.aptoMedico.colorClass.replace('text-', 'bg-').replace('-600', '-50').replace('-700', '-50')}`}>
            <p className={`text-sm font-medium ${person.aptoMedico.colorClass.replace('bg-', 'text-')}`}>
                Apto Médico: <strong>{person.aptoMedico.status}</strong>. {person.aptoMedico.message}
            </p>
        </Alert>
      </CardContent>
    </Card>
  )
}

function GuestSection({ 
  invitados, 
  estadoResponsable, 
  onRegisterInvitado, 
  onAnularIngreso,
  metodoPagoInvitados,
  onMetodoPagoChange,
  cuposCumpleanos
}: { 
  invitados: InvitadoState[], 
  estadoResponsable: EstadoResponsable, 
  onRegisterInvitado: (inv: InvitadoState) => void, 
  onAnularIngreso: (dni: string) => void,
  metodoPagoInvitados: { [key: string]: any },
  onMetodoPagoChange: (dni: string, tipo: string, checked: boolean) => void,
  cuposCumpleanos: { disponibles: number; usados: number; quienesCumplen: string[]; };
}) {
  if (invitados.length === 0) return null;
  return (
    <div className="mt-6 border-t pt-6">
      <div className="flex items-center gap-2 mb-3"><Users className="text-orange-500" /><h3 className="font-bold text-lg">Invitados Diarios</h3></div>
      
      {cuposCumpleanos.disponibles > 0 && (
        <Alert className="mb-3 bg-pink-50 border-pink-300">
          <Gift className="w-5 h-5 text-pink-600" />
          <AlertTitle className="text-pink-900 font-bold">🎂 ¡Hay cumpleaños hoy!</AlertTitle>
          <AlertDescription className="text-pink-800">
            <strong>{cuposCumpleanos.quienesCumplen.join(', ')}</strong> cumple años.
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl font-bold text-pink-700">{cuposCumpleanos.disponibles - cuposCumpleanos.usados}</span>
              <span className="text-sm">cupos gratis restantes de {cuposCumpleanos.disponibles} totales ({cuposCumpleanos.usados} usados)</span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {estadoResponsable.hayResponsable ? (
        <Alert className="mb-3 bg-green-50 border-green-200"><Check className="text-green-600" />
            <AlertDescription className="text-green-700"><strong>{estadoResponsable.responsable?.nombre} {estadoResponsable.responsable?.apellido}</strong> ({estadoResponsable.responsable?.tipo}) ya registró su ingreso a las {estadoResponsable.responsable?.hora}. Los invitados pueden ingresar.</AlertDescription>
        </Alert>
      ) : (
        <Alert className="mb-3 bg-yellow-50 border-yellow-200"><AlertTriangle className="text-yellow-600" />
            <AlertDescription className="text-yellow-700"><strong>Sin responsable presente.</strong> Un miembro del grupo (titular, familiar o adherente) debe registrar su ingreso primero para habilitar el acceso de invitados.</AlertDescription>
        </Alert>
      )}
      <div className="space-y-3">
        {invitados.map((inv) => (
          <GuestCard 
            key={inv.id} 
            invitado={inv} 
            onRegister={() => onRegisterInvitado(inv)} 
            onCancel={() => onAnularIngreso(inv.dni)}
            estadoResponsable={estadoResponsable}
            metodoPago={metodoPagoInvitados[inv.dni]}
            onMetodoPagoChange={onMetodoPagoChange}
            cuposCumpleanos={cuposCumpleanos}
          />
        ))}
      </div>
    </div>
  )
}

function GuestCard({ 
  invitado, 
  onRegister, 
  onCancel, 
  estadoResponsable,
  metodoPago,
  onMetodoPagoChange,
  cuposCumpleanos
}: { 
  invitado: InvitadoState;
  onRegister: () => void;
  onCancel: () => void;
  estadoResponsable: EstadoResponsable;
  metodoPago?: { esInvitadoCumpleanos: boolean; pagoEfectivo: boolean; pagoTransferencia: boolean; pagoCaja: boolean; };
  onMetodoPagoChange: (dni: string, tipo: string, checked: boolean) => void;
  cuposCumpleanos: { disponibles: number; usados: number; };
}) {
  const puedeIngresar = estadoResponsable.hayResponsable && !invitado.yaIngresado;
  
  return (
    <Card className={invitado.yaIngresado ? "bg-green-50" : ""}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold">{invitado.nombre} {invitado.apellido}</h4>
            <p className="text-xs text-muted-foreground">DNI: {invitado.dni}</p>
          </div>
          
          {puedeIngresar && !invitado.yaIngresado && (
            <div className="border-t pt-3">
              <p className="text-sm font-semibold text-gray-700 mb-2">Método de Pago:</p>
              <div className="grid grid-cols-2 gap-2">
                <label className={`flex items-center gap-2 cursor-pointer p-2 rounded border ${cuposCumpleanos.disponibles > 0 && cuposCumpleanos.usados < cuposCumpleanos.disponibles ? 'hover:bg-pink-50 border-gray-200' : 'opacity-50 cursor-not-allowed bg-gray-100'}`}>
                  <input
                    type="checkbox"
                    checked={metodoPago?.esInvitadoCumpleanos || false}
                    disabled={cuposCumpleanos.disponibles === 0 || (cuposCumpleanos.usados >= cuposCumpleanos.disponibles && !metodoPago?.esInvitadoCumpleanos)}
                    onChange={(e) => onMetodoPagoChange(invitado.dni, 'cumpleanos', e.target.checked)}
                    className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                  />
                  <span className="text-xs">🎂 Cumpleaños</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-green-50 border border-gray-200">
                  <input
                    type="checkbox"
                    disabled={metodoPago?.esInvitadoCumpleanos}
                    checked={metodoPago?.pagoEfectivo || false}
                    onChange={(e) => onMetodoPagoChange(invitado.dni, 'efectivo', e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500 disabled:opacity-50"
                  />
                  <span className="text-xs">💵 Efectivo</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-blue-50 border border-gray-200">
                  <input
                    type="checkbox"
                    disabled={metodoPago?.esInvitadoCumpleanos}
                    checked={metodoPago?.pagoTransferencia || false}
                    onChange={(e) => onMetodoPagoChange(invitado.dni, 'transferencia', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className="text-xs">📱 Transfer</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-orange-50 border border-gray-200">
                  <input
                    type="checkbox"
                    disabled={metodoPago?.esInvitadoCumpleanos}
                    checked={metodoPago?.pagoCaja || false}
                    onChange={(e) => onMetodoPagoChange(invitado.dni, 'caja', e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 disabled:opacity-50"
                  />
                  <span className="text-xs">🏦 Caja</span>
                </label>
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            {invitado.yaIngresado ? (
              <div className="flex flex-col items-end gap-1">
                <Button variant="outline" size="sm" disabled className="bg-green-50 border-green-500 text-green-700">
                  <Check className="mr-2 h-4 w-4" /> Ingresó - {invitado.ultimoIngreso?.hora}
                </Button>
                <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs text-red-600">
                  Anular ingreso
                </Button>
              </div>
            ) : puedeIngresar ? (
              <Button onClick={onRegister} className="bg-orange-500 hover:bg-orange-600">
                Registrar Ingreso
              </Button>
            ) : (
              <Button disabled className="bg-gray-300 text-gray-500">
                <Lock className="mr-2 h-4 w-4" /> Bloqueado
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}