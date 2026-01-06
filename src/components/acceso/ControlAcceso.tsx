'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Socio, MiembroFamiliar, InvitadoDiario, Adherente, MetodoPagoInvitado, RelacionFamiliar, EstadoResponsable, AptoMedicoDisplay, UltimoIngreso, EstadoSolicitudInvitados, SolicitudInvitadosDiarios } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, ShieldCheck, ShieldAlert, CheckCircle, XCircle, LogIn, LogOut, Ticket, UserCheck, CalendarDays, Info, Users, Gift, AlertTriangle, CreditCard, Check, Lock, UserPlus, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import { esCumpleanosHoy, normalizeText, generateId, formatDate } from '@/lib/helpers';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format, isToday, isValid, formatISO, addDays, parseISO } from 'date-fns';
import { getSocio, getAllSolicitudesInvitadosDiarios, verificarIngresoHoy, obtenerUltimoIngreso, verificarResponsableIngreso, getSolicitudInvitadosDiarios, addOrUpdateSolicitudInvitadosDiarios } from '@/lib/firebase/firestoreService';
import { getAptoMedicoStatus } from '@/lib/helpers';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useRouter } from 'next/navigation';
import { addDoc, collection, Timestamp, query, where, getDocs, orderBy, limit, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import ManualGuestForm from './ManualGuestForm';

// =================================================================
// TYPES
// =================================================================

type DisplayablePerson = { id: string; nombre: string; apellido: string; nombreCompleto: string; dni: string; fotoUrl?: string; aptoMedico: AptoMedicoDisplay; fechaNacimiento?: string | Date; relacion: string; estadoSocio?: Socio['estadoSocio']; estadoAdherente?: Adherente['estadoAdherente']; esCumpleanero: boolean; yaIngreso: boolean; ultimoIngreso: UltimoIngreso | null; titularId?: string; socioTitularId?: string; tipo: string; titularNumero?: string;};
interface InvitadoState { id: string; nombre: string; apellido: string; dni: string; fechaNacimiento: string | Date; esInvitadoCumpleanos: boolean; metodoPago: MetodoPagoInvitado | null; esCumpleanero: boolean; yaIngresado: boolean; ultimoIngreso: UltimoIngreso | null; puedeIngresar: boolean; socioId: string; aptoMedico?: AptoMedicoDisplay;}

interface InvitadoFrecuente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: Date;
  ultimoUso?: Date;
  vecesUsado: number;
}

// =================================================================
// COMPONENTE PRINCIPAL
// =================================================================
export function ControlAcceso() {
  const { user, userRole, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensajeBusqueda, setMensajeBusqueda] = useState('');
  const [socioTitular, setSocioTitular] = useState<Socio | null>(null);
  const [displayablePeople, setDisplayablePeople] = useState<DisplayablePerson[]>([]);
  const [invitadosState, setInvitadosState] = useState<InvitadoState[]>([]);
  const [estadoResponsable, setEstadoResponsable] = useState<EstadoResponsable>({ hayResponsable: false });
  const [personasSeleccionadas, setPersonasSeleccionadas] = useState<Set<string>>(new Set());
  const [registrandoMultiple, setRegistrandoMultiple] = useState(false);
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
  const [invitadosFrecuentes, setInvitadosFrecuentes] = useState<InvitadoFrecuente[]>([]);
  const [loadingFrecuentes, setLoadingFrecuentes] = useState(false);

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
    setSocioTitular(null); setDisplayablePeople([]); setInvitadosState([]); setMensajeBusqueda('Buscando...'); setPersonasSeleccionadas(new Set()); setInvitadosFrecuentes([]);

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

      // --- CÁLCULO DE CUPOS DESDE DB ---
      const hoyInicio = new Date();
      hoyInicio.setHours(0,0,0,0);
      const qUsados = query(
        collection(db, 'registros_acceso'),
        where('socioTitularId', '==', titularData.id),
        where('esInvitadoCumpleanos', '==', true),
        where('fecha', '>=', Timestamp.fromDate(hoyInicio))
      );
      const snapshotUsados = await getDocs(qUsados);
      const countUsadosDB = snapshotUsados.size;
      // --------------------------------

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
            titularNumero: titularData.numeroSocio
          } as DisplayablePerson;
        })
      );
      setDisplayablePeople(personasConEstado);

      // Calculamos cupos basados en todos los miembros del grupo
      const cumpleaneros = personasConEstado.filter(p => p.esCumpleanero);
      const cuposTotales = cumpleaneros.length * 15;

      setCuposCumpleanos({
        disponibles: cuposTotales,
        usados: countUsadosDB,
        quienesCumplen: cumpleaneros.map(p => `${p.nombre} ${p.apellido}`)
      });

      const todayISO = formatISO(new Date(), { representation: 'date' });
      const solicitudes = await getAllSolicitudesInvitadosDiarios({ socioId: titularData.id, fecha: todayISO });
      const invitados = solicitudes[0]?.listaInvitadosDiarios || [];
      
      const invitadosConEstado = await Promise.all(invitados.map(async inv => {
          const yaIngreso = await verificarIngresoHoy(inv.dni);
          const ultimoIngreso = yaIngreso ? await obtenerUltimoIngreso(inv.dni) : null;
          return {
            ...inv,
            id: inv.dni,
            esInvitadoCumpleanos: inv.esDeCumpleanos || false,
            metodoPago: inv.metodoPago || null,
            esCumpleanero: detectarCumple(inv.fechaNacimiento),
            yaIngresado: yaIngreso,
            ultimoIngreso,
            puedeIngresar: true, // Default a true, se puede ajustar con lógica adicional
            socioId: titularData.id,
            aptoMedico: getAptoMedicoStatus(inv.aptoMedico, inv.fechaNacimiento)
          };
      }));
      setInvitadosState(invitadosConEstado as any);

      // --- CARGAR INVITADOS FRECUENTES ---
      const cargarFrecuentes = async () => {
        setLoadingFrecuentes(true);
        try {
          const frecuentesRef = collection(db, 'socios', titularData.id, 'invitados_frecuentes');
          const frecuentesSnap = await getDocs(frecuentesRef);
          const frecuentes = frecuentesSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            fechaNacimiento: doc.data().fechaNacimiento.toDate(),
            ultimoUso: doc.data().ultimoUso?.toDate()
          })) as InvitadoFrecuente[];
          frecuentes.sort((a, b) => b.vecesUsado - a.vecesUsado);
          setInvitadosFrecuentes(frecuentes);
        } catch (error) {
          console.error('Error al cargar invitados frecuentes:', error);
        } finally {
          setLoadingFrecuentes(false);
        }
      };
      cargarFrecuentes();

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

  // Toggle selección de persona para registro múltiple
  const toggleSeleccion = (dni: string) => {
    setPersonasSeleccionadas(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(dni)) nuevo.delete(dni);
      else nuevo.add(dni);
      return nuevo;
    });
  };

  // --- LÓGICA DE SELECCIÓN MASIVA ---
  const familiaresSeleccionables = useMemo(() => {
    return displayablePeople.filter(p => {
      const esTitular = p.tipo === 'titular';
      const esAdherente = p.tipo === 'adherente';
      const socioActivo = socioTitular?.estadoSocio === 'Activo';
      const puedeEntrar = esTitular ? socioActivo : (esAdherente ? (socioActivo && p.estadoAdherente === 'Activo') : socioActivo);
      return puedeEntrar && !p.yaIngreso;
    });
  }, [displayablePeople, socioTitular]);

  const invitadosSeleccionables = useMemo(() => {
    return invitadosState.filter(i => estadoResponsable.hayResponsable && !i.yaIngresado);
  }, [invitadosState, estadoResponsable]);

  const todosFamiliaresSeleccionados = useMemo(() => 
    familiaresSeleccionables.length > 0 && familiaresSeleccionables.every(p => personasSeleccionadas.has(p.dni)),
  [familiaresSeleccionables, personasSeleccionadas]);

  const todosInvitadosSeleccionados = useMemo(() => 
    invitadosSeleccionables.length > 0 && invitadosSeleccionables.every(i => personasSeleccionadas.has(i.dni)),
  [invitadosSeleccionables, personasSeleccionadas]);

  const toggleSeleccionarTodoElGrupo = () => {
    setPersonasSeleccionadas(prev => {
      const nuevo = new Set(prev);
      if (todosFamiliaresSeleccionados) {
        familiaresSeleccionables.forEach(p => nuevo.delete(p.dni));
      } else {
        familiaresSeleccionables.forEach(p => nuevo.add(p.dni));
      }
      return nuevo;
    });
  };

  const toggleSeleccionarTodosInvitados = () => {
    setPersonasSeleccionadas(prev => {
      const nuevo = new Set(prev);
      if (todosInvitadosSeleccionados) {
        invitadosSeleccionables.forEach(i => nuevo.delete(i.dni));
      } else {
        invitadosSeleccionables.forEach(i => nuevo.add(i.dni));
      }
      return nuevo;
    });
  };
  // ---------------------------------

  // Registrar ingresos de todas las personas seleccionadas
  const registrarIngresosMultiples = async () => {
    if (personasSeleccionadas.size === 0) return;
    setRegistrandoMultiple(true);
    
    // Filtramos miembros
    const personasARegistrar = displayablePeople.filter(p => personasSeleccionadas.has(p.dni) && !p.yaIngreso);
    // Filtramos invitados
    const invitadosARegistrar = invitadosState.filter(i => personasSeleccionadas.has(i.dni) && !i.yaIngresado);

    let exitosos = 0;
    let errores = 0;
    
    // 1. Registrar Miembros
    for (const persona of personasARegistrar) {
      try {
        const yaIngreso = await verificarIngresoHoy(persona.dni);
        if (yaIngreso) { errores++; continue; }
        
        let titularId = '', titularNumero = '';
        if (persona.tipo === 'titular') {
          titularId = persona.id;
          titularNumero = (persona as any).numeroSocio || socioTitular?.numeroSocio || 'N/A';
        } else if (persona.tipo === 'familiar' && persona.titularId) {
          titularId = persona.titularId;
          titularNumero = socioTitular?.numeroSocio || 'N/A';
        } else if (persona.tipo === 'adherente' && persona.socioTitularId) {
          titularId = persona.socioTitularId;
          titularNumero = socioTitular?.numeroSocio || 'N/A';
        }
        
        if (!titularId) { errores++; continue; }
        
        await addDoc(collection(db, 'registros_acceso'), {
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
          registradoPor: auth.currentUser?.uid || '',
          registradoPorEmail: auth.currentUser?.email || ''
        });
        exitosos++;
      } catch (error) {
        console.error(`Error registrando ${persona.nombreCompleto}:`, error);
        errores++;
      }
    }

    // 2. Registrar Invitados
    for (const inv of invitadosARegistrar) {
       try {
          const yaIngreso = await verificarIngresoHoy(inv.dni);
          if (yaIngreso) { errores++; continue; }

          const metodoPago = metodoPagoInvitados[inv.dni];
          if (!metodoPago) {
             toast({ title: "Falta Método de Pago", description: `Seleccione pago para ${inv.nombre}`, variant: "destructive" });
             errores++;
             continue;
          }
           
          // Validar campos de pago si no es cumple
          if (!metodoPago.esInvitadoCumpleanos && !(metodoPago.pagoEfectivo || metodoPago.pagoTransferencia || metodoPago.pagoCaja)) {
             toast({ title: "Falta Método de Pago", description: `Seleccione pago para ${inv.nombre}`, variant: "destructive" });
             errores++;
             continue;
          }

          let metodoPagoFinal = '';
          if (metodoPago.esInvitadoCumpleanos) metodoPagoFinal = 'Gratis (Cumpleaños)';
          else if (metodoPago.pagoEfectivo) metodoPagoFinal = 'Efectivo';
          else if (metodoPago.pagoTransferencia) metodoPagoFinal = 'Transferencia';
          else if (metodoPago.pagoCaja) metodoPagoFinal = 'Caja';

          const estadoResp = await verificarResponsableIngreso(inv.socioId);

          await addDoc(collection(db, "registros_acceso"), {
            fecha: Timestamp.now(),
            socioTitularId: inv.socioId,
            socioTitularNumero: socioTitular?.numeroSocio || 'N/A',
            personaId: inv.id,
            personaNombre: inv.nombre,
            personaApellido: inv.apellido,
            personaDNI: inv.dni,
            personaTipo: 'invitado',
            tipoRegistro: 'entrada',
            registradoPor: auth.currentUser?.uid || '',
            registradoPorEmail: auth.currentUser?.email || '',
            esInvitadoCumpleanos: metodoPago.esInvitadoCumpleanos,
            metodoPago: metodoPagoFinal,
            habilitadoPor: `${estadoResp.responsable?.nombre || 'Socio Titular'} ${estadoResp.responsable?.apellido || ''}`,
            habilitadoPorTipo: estadoResp.responsable?.tipo || 'titular'
          });
          exitosos++;

       } catch(error) {
          console.error(`Error registrando invitado ${inv.nombre}:`, error);
          errores++;
       }
    }

    setPersonasSeleccionadas(new Set());
    setRegistrandoMultiple(false);
    
    if (exitosos > 0) {
      toast({ title: "Ingresos Registrados", description: `Se registraron ${exitosos} ingreso(s) correctamente${errores > 0 ? `. ${errores} error(es).` : '.'}`});
      // Actualizar ultimo ingreso de socio si hubo movimiento
      if(socioTitular) await updateDoc(doc(db, 'socios', socioTitular.id), { ultimoIngreso: Timestamp.now() });
    } else if (errores > 0) {
      toast({ title: "Error", description: `No se pudo registrar ningún ingreso. ${errores} error(es). Verifique pagos.`, variant: "destructive" });
    }
    await buscarNuevamente();
  };

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

  // --- EFFECT: Listen for manual guest addition ---
  useEffect(() => {
    const handleManualAdd = async (e: any) => {
        if(!socioTitular) return;
        const { nombre, apellido, dni, fechaNacimiento } = e.detail;
        
        try {
            toast({ title: "Guardando invitado...", description: "Por favor espere." });
            const todayISO = formatISO(new Date(), { representation: 'date' });
            
            // 1. Buscar o crear solicitud
            const solicitudExistente = await getSolicitudInvitadosDiarios(socioTitular.id, todayISO);
            let solicitud: SolicitudInvitadosDiarios;
            
            if (solicitudExistente) {
                solicitud = solicitudExistente;
            } else {
                solicitud = {
                    id: generateId(),
                    idSocioTitular: socioTitular.id,
                    nombreSocioTitular: `${socioTitular.nombre} ${socioTitular.apellido}`,
                    numeroSocioTitular: socioTitular.numeroSocio,
                    titularIngresadoEvento: false,
                    listaInvitadosDiarios: [],
                    fecha: todayISO,
                    fechaCreacion: new Date(),
                    fechaUltimaModificacion: new Date(),
                    estado: EstadoSolicitudInvitados.PROCESADA
                };
            }
            
            // 2. Agregar invitado
            const nuevoInvitado: InvitadoDiario = {
                id: generateId(),
                nombre,
                apellido,
                dni,
                fechaNacimiento: new Date(fechaNacimiento),
                ingresado: false,
                metodoPago: null,
                esDeCumpleanos: false,
                aptoMedico: null
            };
            
            // Comprobación de duplicados
            const existe = solicitud.listaInvitadosDiarios?.some(i => i.dni === dni);
            if(existe) {
               toast({ title: "Ya existe", description: "Este DNI ya está en la lista de invitados de hoy.", variant: "destructive" });
               return;
            }

            const listaActualizada = [...(solicitud.listaInvitadosDiarios || []), nuevoInvitado];
            solicitud.listaInvitadosDiarios = listaActualizada;
            
            await addOrUpdateSolicitudInvitadosDiarios(solicitud);
            
            toast({ title: "Invitado Agregado", description: "Se ha cargado correctamente." });
            buscarNuevamente();
            
        } catch (error: any) {
            console.error("Error manual add:", error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    window.addEventListener('manual-guest-submit', handleManualAdd);
    return () => window.removeEventListener('manual-guest-submit', handleManualAdd);
  }, [socioTitular, buscarNuevamente, toast]);

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
            <div className="flex items-center justify-between px-1 mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" />
                <h3 className="font-bold text-lg">Grupo Familiar</h3>
              </div>
              {familiaresSeleccionables.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={toggleSeleccionarTodoElGrupo}
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {todosFamiliaresSeleccionados ? 'Deseleccionar todo el grupo' : 'Marcar todo el grupo'}
                </Button>
              )}
            </div>

            {displayablePeople.map(p => (
              <MemberCard 
                key={p.id} 
                person={p} 
                onRegister={() => registrarIngreso(p)} 
                onCancel={() => anularIngreso(p.dni)} 
                onShowCarnet={() => router.push(`/carnet?titularId=${socioTitular.numeroSocio}${p.relacion !== 'Titular' ? `&memberDni=${p.dni}`: ''}`)} 
                isSelected={personasSeleccionadas.has(p.dni)}
                onToggleSelect={() => toggleSeleccion(p.dni)}
                userRole={userRole}
              />
            ))}
            <GuestSection 
              invitados={invitadosState} 
              estadoResponsable={estadoResponsable} 
              onRegisterInvitado={registrarIngresoInvitado} 
              onAnularIngreso={anularIngreso}
              metodoPagoInvitados={metodoPagoInvitados}
              onMetodoPagoChange={handleMetodoPagoChange}
              cuposCumpleanos={cuposCumpleanos}
              personasSeleccionadas={personasSeleccionadas}
              toggleSeleccion={toggleSeleccion}
              userRole={userRole}
              socioTitular={socioTitular}
              onToggleSelectAll={toggleSeleccionarTodosInvitados}
              isAllSelected={todosInvitadosSeleccionados}
            />
            
            {userRole === 'portero' && invitadosFrecuentes.length > 0 && (
              <FrequentGuestsSection 
                frecuentes={invitadosFrecuentes} 
                invitadosActualesDnis={invitadosState.map(i => i.dni)}
                onAdd={(inv) => {
                  const event = new CustomEvent('manual-guest-submit', {
                    detail: {
                      nombre: inv.nombre,
                      apellido: inv.apellido,
                      dni: inv.dni,
                      fechaNacimiento: inv.fechaNacimiento
                    }
                  });
                  window.dispatchEvent(event);
                }}
              />
            )}
            
            {/* Barra de registro múltiple */}
            {personasSeleccionadas.size > 0 && (
              <Card className="sticky bottom-4 border-2 border-orange-500 bg-orange-50 shadow-lg">
                <CardContent className="flex justify-between items-center p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-orange-600" />
                    <span className="font-semibold text-orange-800">
                      {personasSeleccionadas.size} persona(s) seleccionada(s)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setPersonasSeleccionadas(new Set())}
                      disabled={registrandoMultiple}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={registrarIngresosMultiples}
                      disabled={registrandoMultiple}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {registrandoMultiple ? 'Registrando...' : `Registrar Ingresos (${personasSeleccionadas.size})`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      )}
    </div>
  );
}

function FrequentGuestsSection({ frecuentes, invitadosActualesDnis, onAdd }: { frecuentes: InvitadoFrecuente[], invitadosActualesDnis: string[], onAdd: (inv: InvitadoFrecuente) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="border-blue-200 bg-blue-50/30 overflow-hidden">
      <CardHeader className="p-4 pb-0">
        <Button 
          variant="ghost" 
          className="w-full flex justify-between items-center hover:bg-blue-50"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-2 font-semibold text-blue-700">
            <UserPlus className="w-5 h-5" />
            Invitados Frecuentes del Socio
          </div>
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </Button>
      </CardHeader>
      
      {isOpen && (
        <CardContent className="p-4 pt-4">
          <p className="text-xs text-blue-600 mb-4 bg-blue-100/50 p-2 rounded-lg flex items-start gap-2">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
            Estos son invitados que el socio suele traer. Haz clic en el botón azul para agregarlos rápidamente a la lista de hoy.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {frecuentes.map((inv) => {
              const yaEnLista = invitadosActualesDnis.includes(inv.dni);
              return (
                <div key={inv.id} className="bg-white p-3 rounded-xl border border-blue-100 flex justify-between items-center shadow-sm">
                  <div className="min-w-0 pr-2">
                    <p className="font-medium text-gray-900 text-sm truncate">{inv.nombre} {inv.apellido}</p>
                    <p className="text-[10px] text-gray-500 font-mono">DNI: {inv.dni}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant={yaEnLista ? "outline" : "default"}
                    className={`h-8 w-8 p-0 rounded-lg shrink-0 ${yaEnLista ? 'bg-green-50 border-green-200 text-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                    disabled={yaEnLista}
                    onClick={() => onAdd(inv)}
                  >
                    {yaEnLista ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ... Rest of sub-components

// =================================================================
// SUB-COMPONENTES
// =================================================================

function MemberCard({ person, onRegister, onCancel, onShowCarnet, isSelected, onToggleSelect, userRole }: { 
  person: DisplayablePerson, 
  onRegister: () => void, 
  onCancel: () => void, 
  onShowCarnet: () => void,
  isSelected?: boolean,
  onToggleSelect?: () => void,
  userRole: string | null
}) {
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

  const mostrarCheckbox = puedeIngresarGeneral && !person.yaIngreso;

  return (
    <Card className={`border-2 ${puedeIngresarGeneral ? 'border-gray-200' : 'border-red-300'} ${isSelected ? 'ring-2 ring-orange-500 bg-orange-50/50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
            {/* Checkbox para selección múltiple */}
            {mostrarCheckbox && onToggleSelect && (
              <div className="flex items-center pt-4">
                <input
                  type="checkbox"
                  checked={isSelected || false}
                  onChange={onToggleSelect}
                  className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500 cursor-pointer"
                />
              </div>
            )}
            <div className="flex items-start gap-4 flex-1">
                <Dialog>
                  <DialogTrigger asChild>
                    <Avatar className="w-16 h-16 cursor-pointer">
                      <AvatarImage src={person.fotoUrl || (person as any).fotoPerfil} />
                      <AvatarFallback>{person.nombreCompleto.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                    </Avatar>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                     <DialogHeader>
                        <DialogTitle>{person.nombreCompleto}</DialogTitle>
                        <DialogDescription>
                           Foto de perfil
                        </DialogDescription>
                     </DialogHeader>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg">{person.nombreCompleto}</h3>
                      <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 font-mono">
                        N° {person.titularNumero || '---'}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-800">{person.relacion}</Badge>
                      {person.esCumpleanero && <Badge className="bg-pink-500 text-white"><Gift className="mr-1 h-3 w-3" /> ¡Hoy Cumple!</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">DNI: {person.dni}</p>
                    <p className="text-sm text-muted-foreground italic">F. Nacimiento: {person.fechaNacimiento ? (typeof person.fechaNacimiento === 'string' ? formatDate(parseISO(person.fechaNacimiento), 'dd/MM/yyyy') : formatDate(person.fechaNacimiento, 'dd/MM/yyyy')) : '---'}</p>
                    {(person.relacion === 'Titular' || person.relacion === 'Adherente') && <div className="text-sm text-muted-foreground">Estado: <Badge variant={puedeIngresarGeneral ? 'default' : 'destructive'} className={puedeIngresarGeneral ? 'bg-green-500' : ''}>{person.relacion === 'Titular' ? person.estadoSocio : person.estadoAdherente}</Badge></div>}
                </div>
            </div>
            <div className="flex flex-col items-end gap-2">
                <Button variant="outline" size="sm" onClick={onShowCarnet}><Ticket className="mr-2 h-4 w-4" /> Ver Carnet</Button>
                {person.yaIngreso ? (
                <div className="flex flex-col items-end gap-1">
                    <Button variant="outline" size="sm" disabled className="bg-green-50 border-green-500 text-green-700 cursor-not-allowed"><Check className="mr-2 h-4 w-4" /> Ingresó - {person.ultimoIngreso?.hora}</Button>
                    {userRole !== 'portero' && (
                        <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs text-red-600 hover:text-red-700">Anular ingreso</Button>
                    )}
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
            {person.aptoMedico.observaciones && (
              <p className="mt-1 text-xs text-muted-foreground border-t border-current/20 pt-1">
                <strong>Obs:</strong> {person.aptoMedico.observaciones}
              </p>
            )}
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
  cuposCumpleanos,
  personasSeleccionadas,
  toggleSeleccion,
  onToggleSelectAll,
  isAllSelected,
  userRole,
  socioTitular
}: { 
  invitados: InvitadoState[], 
  estadoResponsable: EstadoResponsable, 
  onRegisterInvitado: (inv: InvitadoState) => void, 
  onAnularIngreso: (dni: string) => void,
  metodoPagoInvitados: { [key: string]: any },
  onMetodoPagoChange: (dni: string, tipo: string, checked: boolean) => void,
  cuposCumpleanos: { disponibles: number; usados: number; quienesCumplen: string[]; };
  personasSeleccionadas?: Set<string>;
  toggleSeleccion?: (dni: string) => void;
  onToggleSelectAll?: () => void;
  isAllSelected?: boolean;
  userRole: string | null;
  socioTitular: Socio | null;
}) {
  const tieneInvitadosSeleccionables = invitados.some(i => estadoResponsable.hayResponsable && !i.yaIngresado);

  return (
    <div className="mt-6 border-t pt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
           <Users className="text-orange-500" />
           <h3 className="font-bold text-lg">Invitados Diarios</h3>
        </div>
        {tieneInvitadosSeleccionables && onToggleSelectAll && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggleSelectAll}
            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {isAllSelected ? 'Deseleccionar todos' : 'Marcar todos los invitados'}
          </Button>
        )}
     </div>

      <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 mb-4">
                  + Carga Rápida (Portería)
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
               <DialogHeader>
                  <DialogTitle>Carga Rápida de Invitado</DialogTitle>
                  <DialogDescription>
                    Complete los datos para agregar un invitado al día de hoy.
                  </DialogDescription>
               </DialogHeader>
               {/* No pasamos props porque usa eventos custom */}
               <ManualGuestForm />
            </DialogContent>
      </Dialog>
      
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
            isSelected={personasSeleccionadas?.has(inv.dni)}
            onToggleSelect={() => toggleSeleccion && toggleSeleccion(inv.dni)}
            userRole={userRole}
            socioTitular={socioTitular}
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
  cuposCumpleanos,
  isSelected,
  onToggleSelect,
  userRole,
  socioTitular
}: { 
  invitado: InvitadoState;
  onRegister: () => void;
  onCancel: () => void;
  estadoResponsable: EstadoResponsable;
  metodoPago?: { esInvitadoCumpleanos: boolean; pagoEfectivo: boolean; pagoTransferencia: boolean; pagoCaja: boolean; };
  onMetodoPagoChange: (dni: string, tipo: string, checked: boolean) => void;
  cuposCumpleanos: { disponibles: number; usados: number; };
  isSelected?: boolean;
  onToggleSelect?: () => void;
  userRole: string | null;
  socioTitular: Socio | null;
}) {
  const puedeIngresar = estadoResponsable.hayResponsable && !invitado.yaIngresado;
  const mostrarCheckbox = puedeIngresar && !invitado.yaIngresado;
  
  return (
    <Card className={`${invitado.yaIngresado ? "bg-green-50" : ""} ${isSelected ? 'ring-2 ring-orange-500 bg-orange-50/50' : ''}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex gap-4">
                 {mostrarCheckbox && onToggleSelect && (
                  <div className="flex items-center pt-1">
                    <input
                      type="checkbox"
                      checked={isSelected || false}
                      onChange={onToggleSelect}
                      className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500 cursor-pointer"
                    />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{invitado.nombre} {invitado.apellido}</h4>
                    <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-mono">
                      Tit. {socioTitular?.numeroSocio || '---'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">DNI: {invitado.dni}</p>
                  <p className="text-[10px] text-muted-foreground italic">F. Nacimiento: {invitado.fechaNacimiento ? (typeof invitado.fechaNacimiento === 'string' ? formatDate(parseISO(invitado.fechaNacimiento), 'dd/MM/yyyy') : formatDate(invitado.fechaNacimiento, 'dd/MM/yyyy')) : '---'}</p>
                  {invitado.aptoMedico && (
                    <div className="mt-1">
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${invitado.aptoMedico.status === 'Válido' ? 'text-green-600 border-green-200 bg-green-50' : 'text-red-600 border-red-200 bg-red-50'}`}>
                        {invitado.aptoMedico.status === 'Válido' ? 'Apto' : invitado.aptoMedico.status}
                      </Badge>
                      {invitado.aptoMedico.observaciones && <span className="text-[9px] text-muted-foreground ml-1 line-clamp-1 italic">Obs: {invitado.aptoMedico.observaciones}</span>}
                    </div>
                  )}
                </div>
            </div>
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
                {userRole !== 'portero' && (
                  <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs text-red-600">
                    Anular ingreso
                  </Button>
                )}
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