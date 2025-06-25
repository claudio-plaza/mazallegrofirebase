
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Socio, MiembroFamiliar, AptoMedicoInfo, SolicitudCumpleanos, InvitadoCumpleanos, SolicitudInvitadosDiarios, InvitadoDiario, Adherente, MetodoPagoInvitado } from '@/types';
import { EstadoSolicitudInvitados } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, UserCircle, ShieldCheck, ShieldAlert, CheckCircle, XCircle, User, Users, LogIn, LogOut, Ticket, ChevronDown, Cake, ListFilter, UserCheck, CalendarDays, Info, Users2, LinkIcon, FileText, CreditCard, Banknote, Archive, Baby, Gift, AlertTriangle as AlertTriangleIcon } from 'lucide-react';
import { formatDate, getAptoMedicoStatus, esCumpleanosHoy, normalizeText, esFechaRestringidaParaCumpleanos } from '@/lib/helpers';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { format, isToday, parseISO, formatISO, differenceInYears, isValid, getMonth, getDate as getDayOfMonth } from 'date-fns';
import {
  getSocioByNumeroSocioOrDNI,
  getAllSolicitudesCumpleanos,
  updateSolicitudCumpleanos,
  getAllSolicitudesInvitadosDiarios,
  updateSolicitudInvitadosDiarios
} from '@/lib/firebase/firestoreService';
import { useRouter } from 'next/navigation';

type DisplayablePerson = {
  id: string;
  nombreCompleto: string;
  dni: string;
  fotoUrl?: string;
  aptoMedico?: AptoMedicoInfo;
  fechaNacimiento?: string | Date;
  estadoSocioTitular?: Socio['estadoSocio'];
  relacion?: string;
  isTitular: boolean;
  isFamiliar: boolean;
  isAdherente: boolean;
  estadoAdherente?: Adherente['estadoAdherente'];
};

export function ControlAcceso() {
  const [searchTerm, setSearchTerm] = useState('');
  const [socioEncontrado, setSocioEncontrado] = useState<Socio | null>(null);
  const [mensajeBusqueda, setMensajeBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [accordionValue, setAccordionValue] = useState<string | undefined>(undefined);
  const [router, setRouter] = useState(useRouter());

  const [solicitudCumpleanosHoySocioBuscado, setSolicitudCumpleanosHoySocioBuscado] = useState<SolicitudCumpleanos | null>(null);
  const [invitadosCumpleanosSocioBuscado, setInvitadosCumpleanosSocioBuscado] = useState<InvitadoCumpleanos[]>([]);

  const [solicitudInvitadosDiariosHoySocioBuscado, setSolicitudInvitadosDiariosHoySocioBuscado] = useState<SolicitudInvitadosDiarios | null>(null);
  const [invitadosDiariosSocioBuscado, setInvitadosDiariosSocioBuscado] = useState<InvitadoDiario[]>([]);

  const [eventoHabilitadoPorIngresoFamiliarCumple, setEventoHabilitadoPorIngresoFamiliarCumple] = useState(false);
  const [eventoHabilitadoPorIngresoFamiliarDiario, setEventoHabilitadoPorIngresoFamiliarDiario] = useState(false);

  const [metodosPagoSeleccionados, setMetodosPagoSeleccionados] = useState<Record<string, MetodoPagoInvitado | null>>({});
  const [invitadosCumpleanosCheckboxState, setInvitadosCumpleanosCheckboxState] = useState<Record<string, boolean>>({});

  const [countCumpleanerosEnGrupo, setCountCumpleanerosEnGrupo] = useState(0);
  const [cupoTotalInvitadosCumple, setCupoTotalInvitadosCumple] = useState(0);
  const [invitadosCumpleRegistradosHoy, setInvitadosCumpleRegistradosHoy] = useState(0);

  const [ingresosSesion, setIngresosSesion] = useState<Record<string, boolean>>({});

  const todayISO = formatISO(new Date(), { representation: 'date' });
  const hoyEsFechaRestringida = useMemo(() => esFechaRestringidaParaCumpleanos(new Date()), []);


  const displayablePeople = useMemo(() => {
    if (!socioEncontrado) return [];
    const people: DisplayablePerson[] = [];
    people.push({
      id: socioEncontrado.id,
      nombreCompleto: `${socioEncontrado.nombre} ${socioEncontrado.apellido}`,
      dni: socioEncontrado.dni,
      fotoUrl: socioEncontrado.fotoUrl || `https://placehold.co/60x60.png?text=${socioEncontrado.nombre[0]}${socioEncontrado.apellido[0]}`,
      aptoMedico: socioEncontrado.aptoMedico,
      fechaNacimiento: socioEncontrado.fechaNacimiento,
      estadoSocioTitular: socioEncontrado.estadoSocio,
      relacion: 'Titular',
      isTitular: true,
      isFamiliar: false,
      isAdherente: false,
    });
    socioEncontrado.grupoFamiliar?.forEach(fam => {
      let fotoFamiliar = `https://placehold.co/60x60.png?text=${fam.nombre[0]}${fam.apellido[0]}`;
      if (fam.fotoPerfil && typeof fam.fotoPerfil === 'string') {
         fotoFamiliar = fam.fotoPerfil;
      }
      people.push({
        id: fam.id || fam.dni,
        nombreCompleto: `${fam.nombre} ${fam.apellido}`,
        dni: fam.dni,
        fotoUrl: fotoFamiliar,
        aptoMedico: fam.aptoMedico,
        fechaNacimiento: fam.fechaNacimiento,
        estadoSocioTitular: socioEncontrado.estadoSocio,
        relacion: fam.relacion,
        isTitular: false,
        isFamiliar: true,
        isAdherente: false,
      });
    });
    socioEncontrado.adherentes?.forEach(adh => {
      people.push({
        id: adh.id || adh.dni,
        nombreCompleto: `${adh.nombre} ${adh.apellido}`,
        dni: adh.dni,
        fotoUrl: (adh.fotoPerfil && typeof adh.fotoPerfil === 'string' ? adh.fotoPerfil : `https://placehold.co/60x60.png?text=${adh.nombre[0]}${adh.apellido[0]}`),
        aptoMedico: adh.aptoMedico,
        fechaNacimiento: adh.fechaNacimiento,
        estadoSocioTitular: socioEncontrado.estadoSocio,
        relacion: 'Adherente',
        isTitular: false,
        isFamiliar: false,
        isAdherente: true,
        estadoAdherente: adh.estadoAdherente,
      });
    });
    return people;
  }, [socioEncontrado]);

  const handleToggleIngresoMiembroGrupo = useCallback(async () => {
    if (!socioEncontrado) {
      setEventoHabilitadoPorIngresoFamiliarCumple(false);
      setEventoHabilitadoPorIngresoFamiliarDiario(false);
      return;
    }

    const anyMemberOfGroupHasSessionIncome = displayablePeople.some(
      p => (
            (p.isTitular && p.dni === socioEncontrado.dni) ||
            (p.isFamiliar && socioEncontrado.grupoFamiliar?.some(fam => fam.dni === p.dni))
          ) && ingresosSesion[p.dni]
    );
    
    setEventoHabilitadoPorIngresoFamiliarCumple(anyMemberOfGroupHasSessionIncome);
    setEventoHabilitadoPorIngresoFamiliarDiario(anyMemberOfGroupHasSessionIncome);

    if (anyMemberOfGroupHasSessionIncome) {
      try {
        if (solicitudCumpleanosHoySocioBuscado && !solicitudCumpleanosHoySocioBuscado.titularIngresadoEvento) {
          const updatedSolicitud = { ...solicitudCumpleanosHoySocioBuscado, titularIngresadoEvento: true };
          await updateSolicitudCumpleanos(updatedSolicitud);
          setSolicitudCumpleanosHoySocioBuscado(updatedSolicitud); 
        }
        if (solicitudInvitadosDiariosHoySocioBuscado && !solicitudInvitadosDiariosHoySocioBuscado.titularIngresadoEvento) {
          const updatedSolicitud = { ...solicitudInvitadosDiariosHoySocioBuscado, titularIngresadoEvento: true };
          await updateSolicitudInvitadosDiarios(updatedSolicitud);
          setSolicitudInvitadosDiariosHoySocioBuscado(updatedSolicitud); 
        }
      } catch (error) {
        console.error("Error updating event status in DB:", error);
        toast({ title: "Error", description: "No se pudo actualizar el estado del evento en la base de datos.", variant: "destructive" });
      }
    }
  }, [
    socioEncontrado, 
    displayablePeople, 
    ingresosSesion, 
    solicitudCumpleanosHoySocioBuscado, 
    solicitudInvitadosDiariosHoySocioBuscado, 
    toast
  ]);


  useEffect(() => {
    if(socioEncontrado){ 
        handleToggleIngresoMiembroGrupo();
    }
  }, [ingresosSesion, socioEncontrado, handleToggleIngresoMiembroGrupo]);


  const handleSearch = useCallback(async (isRefresh = false) => {
    const termToSearch = isRefresh && socioEncontrado ? (normalizeText(socioEncontrado.numeroSocio) || normalizeText(socioEncontrado.dni)) : normalizeText(searchTerm);
    if (!termToSearch.trim()) {
      setMensajeBusqueda('Por favor, ingrese un N° Socio, DNI o Nombre para buscar.');
      setSocioEncontrado(null);
      setSolicitudCumpleanosHoySocioBuscado(null);
      setInvitadosCumpleanosSocioBuscado([]);
      setEventoHabilitadoPorIngresoFamiliarCumple(false);
      setSolicitudInvitadosDiariosHoySocioBuscado(null);
      setInvitadosDiariosSocioBuscado([]);
      setEventoHabilitadoPorIngresoFamiliarDiario(false);
      setAccordionValue(undefined);
      setMetodosPagoSeleccionados({});
      setInvitadosCumpleanosCheckboxState({});
      setCountCumpleanerosEnGrupo(0);
      setCupoTotalInvitadosCumple(0);
      setInvitadosCumpleRegistradosHoy(0);
      setIngresosSesion({});
      return;
    }
    setLoading(true);
    if(!isRefresh) {
      setSocioEncontrado(null);
      setSolicitudCumpleanosHoySocioBuscado(null);
      setInvitadosCumpleanosSocioBuscado([]);
      setEventoHabilitadoPorIngresoFamiliarCumple(false);
      setSolicitudInvitadosDiariosHoySocioBuscado(null);
      setInvitadosDiariosSocioBuscado([]);
      setEventoHabilitadoPorIngresoFamiliarDiario(false);
      setAccordionValue(undefined);
      setMetodosPagoSeleccionados({});
      setInvitadosCumpleanosCheckboxState({});
      setCountCumpleanerosEnGrupo(0);
      setCupoTotalInvitadosCumple(0);
      setInvitadosCumpleRegistradosHoy(0);
      setIngresosSesion({});
    }

    try {
      const socio = await getSocioByNumeroSocioOrDNI(termToSearch);

      if (socio) {
        setSocioEncontrado(socio);
        setMensajeBusqueda('');
        setAccordionValue("socio-info");

        let cumpleanerosCount = 0;
        if (!hoyEsFechaRestringida) { // Solo contar si no es fecha restringida
            if (esCumpleanosHoy(socio.fechaNacimiento)) {
                cumpleanerosCount++;
            }
            socio.grupoFamiliar?.forEach(fam => {
                if (esCumpleanosHoy(fam.fechaNacimiento)) {
                    cumpleanerosCount++;
                }
            });
        }
        setCountCumpleanerosEnGrupo(cumpleanerosCount);
        setCupoTotalInvitadosCumple(cumpleanerosCount * 15);


        const todasSolicitudesCumple = await getAllSolicitudesCumpleanos();
        const solicitudHoyCumple = todasSolicitudesCumple.find(sol =>
          sol.idSocioTitular === socio.numeroSocio &&
          sol.fechaEvento && isToday(sol.fechaEvento as Date) &&
          sol.estado === 'Aprobada'
        );
        if (solicitudHoyCumple) {
          setSolicitudCumpleanosHoySocioBuscado(solicitudHoyCumple);
          setInvitadosCumpleanosSocioBuscado(solicitudHoyCumple.listaInvitados.map(inv => ({...inv, id: inv.dni })));
          setEventoHabilitadoPorIngresoFamiliarCumple(solicitudHoyCumple.titularIngresadoEvento || false);
        } else {
          setSolicitudCumpleanosHoySocioBuscado(null);
          setInvitadosCumpleanosSocioBuscado([]);
          setEventoHabilitadoPorIngresoFamiliarCumple(false);
        }

        const todasSolicitudesDiarias = await getAllSolicitudesInvitadosDiarios();
        const solicitudHoyDiaria = todasSolicitudesDiarias.find(sol =>
            sol.idSocioTitular === socio.numeroSocio &&
            sol.fecha === todayISO &&
            sol.estado === EstadoSolicitudInvitados.ENVIADA 
        );

        let currentInvitadosCumpleRegistrados = 0;
        const initialCheckboxState: Record<string,boolean> = {};

        if (solicitudHoyDiaria) {
            const invitadosDiariosProcesados = solicitudHoyDiaria.listaInvitadosDiarios.map(inv => {
                if (inv.esDeCumpleanos && inv.ingresado) {
                    currentInvitadosCumpleRegistrados++;
                }
                initialCheckboxState[inv.dni] = hoyEsFechaRestringida ? false : !!inv.esDeCumpleanos;
                return {
                    ...inv,
                    id: inv.dni,
                    fechaNacimiento: inv.fechaNacimiento && typeof inv.fechaNacimiento === 'string' ? parseISO(inv.fechaNacimiento) : inv.fechaNacimiento,
                };
            });
            setSolicitudInvitadosDiariosHoySocioBuscado(solicitudHoyDiaria);
            setInvitadosDiariosSocioBuscado(invitadosDiariosProcesados);
            setEventoHabilitadoPorIngresoFamiliarDiario(solicitudHoyDiaria.titularIngresadoEvento || false);
        } else {
          setSolicitudInvitadosDiariosHoySocioBuscado(null);
          setInvitadosDiariosSocioBuscado([]);
          setEventoHabilitadoPorIngresoFamiliarDiario(false);
        }
        setInvitadosCumpleRegistradosHoy(currentInvitadosCumpleRegistrados);
        setInvitadosCumpleanosCheckboxState(initialCheckboxState);
        handleToggleIngresoMiembroGrupo();


      } else {
        setMensajeBusqueda('Socio no encontrado.');
        setSocioEncontrado(null);
      }
    } catch (error) {
      console.error("Error buscando socio:", error);
      toast({ title: "Error de Búsqueda", description: "No se pudo completar la búsqueda.", variant: "destructive"});
      setSocioEncontrado(null);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, todayISO, socioEncontrado, toast, handleToggleIngresoMiembroGrupo, hoyEsFechaRestringida]);

  useEffect(() => {
    const refreshData = async () => {
        if (socioEncontrado) await handleSearch(true);
    };

    window.addEventListener('cumpleanosDBUpdated', refreshData);
    window.addEventListener('firestore/solicitudesInvitadosDiariosUpdated', refreshData);
    window.addEventListener('sociosDBUpdated', refreshData);

    return () => {
        window.removeEventListener('cumpleanosDBUpdated', refreshData);
        window.removeEventListener('firestore/solicitudesInvitadosDiariosUpdated', refreshData);
        window.removeEventListener('sociosDBUpdated', refreshData);
    };
  }, [socioEncontrado, handleSearch]); 


  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleVerCarnet = (person: DisplayablePerson) => {
    if (!socioEncontrado) {
      toast({ title: "Error", description: "No se encontró el socio titular para esta acción.", variant: "destructive" });
      return;
    }
    let url = `/carnet?titularId=${socioEncontrado.numeroSocio}`;
    if (!person.isTitular) {
      url += `&memberDni=${person.dni}`;
    }
    router.push(url);
  };

  const handleRegistrarIngreso = (member: DisplayablePerson) => {
    if (!socioEncontrado) return;

    let puedeIngresar = false;
    let mensajeIngreso = '';
    let mensajeAdvertenciaApto = '';
    const aptoStatus = getAptoMedicoStatus(member.aptoMedico, member.fechaNacimiento);

    if (member.isTitular || member.isFamiliar) {
      if (socioEncontrado.estadoSocio === 'Activo') {
        puedeIngresar = true;
        mensajeIngreso = `Acceso permitido para ${member.nombreCompleto} (${member.relacion}).`;
        if (aptoStatus.status !== 'Válido' && aptoStatus.status !== 'No Aplica') {
          mensajeAdvertenciaApto = ` ADVERTENCIA: Apto Médico ${aptoStatus.status}. ${aptoStatus.message}`;
        } else {
          mensajeAdvertenciaApto = ` Apto Médico: ${aptoStatus.status}.`;
        }
      } else {
        mensajeIngreso = `Acceso Denegado. Socio titular ${socioEncontrado.nombre} ${socioEncontrado.apellido} está ${socioEncontrado.estadoSocio}.`;
      }
    } else if (member.isAdherente) {
      if (socioEncontrado.estadoSocio === 'Activo' && member.estadoAdherente === 'Activo') {
        puedeIngresar = true;
        mensajeIngreso = `Acceso permitido para Adherente: ${member.nombreCompleto}.`;
        if (aptoStatus.status !== 'Válido' && aptoStatus.status !== 'No Aplica') {
          mensajeAdvertenciaApto = ` ADVERTENCIA: Apto Médico ${aptoStatus.status}. ${aptoStatus.message}`;
        } else {
          mensajeAdvertenciaApto = ` Apto Médico: ${aptoStatus.status}.`;
        }
      } else if (socioEncontrado.estadoSocio !== 'Activo') {
        mensajeIngreso = `Acceso Denegado. Socio titular ${socioEncontrado.nombre} ${socioEncontrado.apellido} está ${socioEncontrado.estadoSocio}.`;
      } else if (member.estadoAdherente !== 'Activo') {
        mensajeIngreso = `Acceso Denegado. Adherente ${member.nombreCompleto} está ${member.estadoAdherente}.`;
      }
    }

    if (puedeIngresar) {
      setIngresosSesion(prev => ({ ...prev, [member.dni]: true }));
    }

    toast({
      title: puedeIngresar ? 'Ingreso Registrado' : 'Acceso Denegado',
      description: `${mensajeIngreso}${mensajeAdvertenciaApto}`,
      variant: puedeIngresar ? (mensajeAdvertenciaApto.includes('ADVERTENCIA') && aptoStatus.status !== 'No Aplica' && aptoStatus.status !== 'Válido' ? 'default' : 'default') : 'destructive',
      duration: (mensajeAdvertenciaApto.includes('ADVERTENCIA') && aptoStatus.status !== 'No Aplica' && aptoStatus.status !== 'Válido') || !puedeIngresar ? 7000 : 5000,
    });
  };

  const handleAnularIngreso = (member: DisplayablePerson) => {
    setIngresosSesion(prev => ({ ...prev, [member.dni]: false }));
    toast({
      title: 'Ingreso Anulado',
      description: `Se anuló el registro de ingreso para ${member.nombreCompleto}.`,
      variant: 'default',
    });
  };

  const handleMetodoPagoChange = (invitadoId: string, metodo: MetodoPagoInvitado | null) => {
    setMetodosPagoSeleccionados(prev => ({...prev, [invitadoId]: metodo }));
  };

  const handleInvitadoCumpleanosCheckboxChange = (invitadoDni: string, checked: boolean) => {
    if (hoyEsFechaRestringida && checked) {
      toast({ title: "Acción no permitida", description: `No se pueden registrar invitados de cumpleaños el ${format(new Date(), "dd/MM")}.`, variant: "default"});
      setInvitadosCumpleanosCheckboxState(prev => ({...prev, [invitadoDni]: false })); // Forzar a false
      return;
    }
    setInvitadosCumpleanosCheckboxState(prev => ({...prev, [invitadoDni]: checked}));
     if (!checked) {
      setMetodosPagoSeleccionados(prev => ({...prev, [invitadoDni]: null }));
    }
  };

  const handleRegistrarIngresoInvitado = async (invitadoDni: string, tipoInvitado: 'cumpleanos' | 'diario', festejoId?: string) => {
    // 1. Encontrar el invitado en la lista correcta
    let invitadoOriginal: InvitadoCumpleanos | InvitadoDiario | undefined;
    let listaOriginal: 'cumpleanos' | 'diario' | null = null;
    let targetFestejo: SolicitudCumpleanos | null = null;
    let targetSolicitudDiaria: SolicitudInvitadosDiarios | null = null;

    if (tipoInvitado === 'cumpleanos' && solicitudCumpleanosHoySocioBuscado) {
        invitadoOriginal = solicitudCumpleanosHoySocioBuscado.listaInvitados.find(inv => inv.dni === invitadoDni);
        listaOriginal = 'cumpleanos';
        targetFestejo = solicitudCumpleanosHoySocioBuscado;
    } else if (tipoInvitado === 'diario' && solicitudInvitadosDiariosHoySocioBuscado) {
        invitadoOriginal = solicitudInvitadosDiariosHoySocioBuscado.listaInvitadosDiarios.find(inv => inv.dni === invitadoDni);
        listaOriginal = 'diario';
        targetSolicitudDiaria = solicitudInvitadosDiariosHoySocioBuscado;
    }

    if (!invitadoOriginal) {
        toast({ title: "Error", description: "No se encontró al invitado para registrar el ingreso.", variant: "destructive" });
        return;
    }

    // 2. Verificar si el titular/familia ha ingresado
    const eventoHabilitado = (listaOriginal === 'cumpleanos' && eventoHabilitadoPorIngresoFamiliarCumple) || (listaOriginal === 'diario' && eventoHabilitadoPorIngresoFamiliarDiario);
    if (!eventoHabilitado) {
        toast({ title: 'Acceso Denegado', description: 'Un miembro del grupo familiar del socio titular debe registrar su ingreso primero.', variant: 'destructive' });
        return;
    }
    
    // 3. Validar pago y cupos si se está registrando un nuevo ingreso
    const esDeCumpleanosSeleccionado = !!invitadosCumpleanosCheckboxState[invitadoDni];
    if (!invitadoOriginal.ingresado) {
        // Validación del cupo de cumpleaños
        if (listaOriginal === 'diario' && esDeCumpleanosSeleccionado && (invitadosCumpleRegistradosHoy >= cupoTotalInvitadosCumple)) {
            toast({ title: "Cupo Excedido", description: "Se ha alcanzado el límite de invitados de cumpleaños para este grupo familiar hoy.", variant: "destructive" });
            return;
        }

        // Validación de método de pago
        let esMenorDeTresSinCosto = false;
        if (invitadoOriginal.fechaNacimiento) {
            const edad = differenceInYears(new Date(), new Date(invitadoOriginal.fechaNacimiento));
            if (edad < 3) esMenorDeTresSinCosto = true;
        }

        const requierePago = !esDeCumpleanosSeleccionado && !esMenorDeTresSinCosto;
        const metodoPagoSeleccionado = metodosPagoSeleccionados[invitadoDni] || null;

        if (requierePago && !metodoPagoSeleccionado) {
            toast({ title: "Error", description: `Por favor, seleccione un método de pago para ${invitadoOriginal.nombre}.`, variant: "destructive" });
            return;
        }
    }


    // 4. Actualizar el estado del invitado
    const nuevoEstadoIngreso = !invitadoOriginal.ingresado;
    const invitadoActualizado = {
        ...invitadoOriginal,
        ingresado: nuevoEstadoIngreso,
        esDeCumpleanos: listaOriginal === 'diario' ? esDeCumpleanosSeleccionado : undefined,
        metodoPago: nuevoEstadoIngreso ? (esDeCumpleanosSeleccionado || (differenceInYears(new Date(), new Date(invitadoOriginal.fechaNacimiento!)) < 3) ? null : metodosPagoSeleccionados[invitadoDni]) : invitadoOriginal.metodoPago
    };

    // 5. Actualizar la base de datos
    try {
        if (listaOriginal === 'cumpleanos' && targetFestejo) {
            const updatedFestejo = {
                ...targetFestejo,
                listaInvitados: targetFestejo.listaInvitados.map(inv => inv.dni === invitadoDni ? invitadoActualizado : inv) as InvitadoCumpleanos[],
            };
            await updateSolicitudCumpleanos(updatedFestejo);
            setInvitadosCumpleanosSocioBuscado(updatedFestejo.listaInvitados);
            setSolicitudCumpleanosHoySocioBuscado(updatedFestejo);
        } else if (listaOriginal === 'diario' && targetSolicitudDiaria) {
            const updatedSolicitud = {
                ...targetSolicitudDiaria,
                listaInvitadosDiarios: targetSolicitudDiaria.listaInvitadosDiarios.map(inv => inv.dni === invitadoDni ? invitadoActualizado : inv) as InvitadoDiario[],
            };
            await updateSolicitudInvitadosDiarios(updatedSolicitud);
            setInvitadosDiariosSocioBuscado(updatedSolicitud.listaInvitadosDiarios);
            setSolicitudInvitadosDiariosHoySocioBuscado(updatedSolicitud);
        }

        // 6. Actualizar contador local de invitados de cumpleaños
        if (listaOriginal === 'diario') {
            const eraDeCumpleanos = invitadoOriginal.esDeCumpleanos;
            const esDeCumpleanos = invitadoActualizado.esDeCumpleanos;
            if (nuevoEstadoIngreso) { // Si está ingresando
              if(esDeCumpleanos && !eraDeCumpleanos) setInvitadosCumpleRegistradosHoy(prev => prev + 1);
            } else { // Si se anula el ingreso
              if(eraDeCumpleanos) setInvitadosCumpleRegistradosHoy(prev => Math.max(0, prev - 1));
            }
        }
        
        // 7. Mostrar notificación
        toast({
            title: `Ingreso Invitado ${nuevoEstadoIngreso ? 'Registrado' : 'Anulado'}`,
            description: `${invitadoActualizado.nombre} ${invitadoActualizado.apellido} ha sido ${nuevoEstadoIngreso ? 'marcado como ingresado' : 'desmarcado'}.`,
        });

        // 8. Limpiar método de pago seleccionado
        setMetodosPagoSeleccionados(prev => ({...prev, [invitadoDni]: null }));

    } catch (error) {
        console.error("Error actualizando ingreso de invitado:", error);
        toast({ title: "Error de Base de Datos", description: "No se pudo registrar el cambio en la base de datos.", variant: "destructive" });
    }
  };


  const getMetodoPagoBadge = (metodo: MetodoPagoInvitado | null | undefined, esGratuito?: boolean, esDeCumple?: boolean) => {
    if (esDeCumple) {
       return <Badge variant="secondary" className="text-xs bg-pink-500 hover:bg-pink-600 text-white"><Gift className="mr-1 h-3 w-3" /> Cumpleaños</Badge>;
    }
    if (esGratuito) {
      return <Badge variant="secondary" className="text-xs bg-purple-500 hover:bg-purple-600 text-white"><Baby className="mr-1 h-3 w-3" /> Gratuito (Menor)</Badge>;
    }
    if (!metodo) return null;
    let variant: "default" | "secondary" | "outline" = "outline";
    let className = "";
    let IconComponent: React.ElementType | null = null;

    switch (metodo) {
        case 'Efectivo':
            variant = 'default';
            className = 'bg-green-500 hover:bg-green-600 text-white';
            IconComponent = Banknote;
            break;
        case 'Transferencia':
            variant = 'default';
            className = 'bg-blue-500 hover:bg-blue-600 text-white';
            IconComponent = CreditCard;
            break;
        case 'Caja':
            variant = 'default';
            className = 'bg-orange-500 hover:bg-orange-600 text-white';
            IconComponent = Archive;
            break;
    }
    return <Badge variant={variant} className={`text-xs ${className}`}> {IconComponent && <IconComponent className="mr-1 h-3 w-3" />} {metodo}</Badge>;
  };


  let accesoGeneralPermitido = false;
  let mensajeAccesoGeneral = '';
  let colorClaseAccesoGeneral = 'bg-red-500/10 hover:bg-red-500/20 border-red-500';
  let iconoAccesoGeneral = <XCircle className="h-8 w-8 text-red-600 mr-3" />;
  let textoColorAccesoGeneral = 'text-red-700';


  if (socioEncontrado) {
    const titularActivo = socioEncontrado.estadoSocio === 'Activo';
    if (titularActivo) {
      accesoGeneralPermitido = true;
      mensajeAccesoGeneral = `Socio titular ACTIVO. Puede ingresar.`;
      colorClaseAccesoGeneral = 'bg-green-500/10 hover:bg-green-500/20 border-green-500';
      iconoAccesoGeneral = <CheckCircle className="h-8 w-8 text-green-600 mr-3" />;
      textoColorAccesoGeneral = 'text-green-700';
    } else {
      mensajeAccesoGeneral = `Socio titular ${socioEncontrado.estadoSocio.toUpperCase()}. NO PUEDE INGRESAR.`;
    }
  }

  const renderPersonCard = (person: DisplayablePerson) => {
    let statusBadge = null;
    let aptoMedicoDisplay = null;
    let cardBorderClass = 'border-gray-300';
    let puedeIngresarIndividualmente = false;
    const aptoStatus = getAptoMedicoStatus(person.aptoMedico, person.fechaNacimiento);

    if (person.isTitular || person.isFamiliar) {
        statusBadge = <Badge variant={socioEncontrado?.estadoSocio === 'Activo' ? 'default' : 'destructive'} className={socioEncontrado?.estadoSocio === 'Activo' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}>{socioEncontrado?.estadoSocio}</Badge>;
        aptoMedicoDisplay = (
            <div className={`p-2 rounded-md text-xs ${aptoStatus.colorClass.replace('text-', 'text-').replace('bg-', 'bg-opacity-10 ')} border ${aptoStatus.colorClass.replace('text-', 'border-')}`}>
                <span className="font-medium">Apto Médico (Obs.): {aptoStatus.status}.</span> {aptoStatus.message}.
            </div>
        );
        puedeIngresarIndividualmente = socioEncontrado?.estadoSocio === 'Activo';
        cardBorderClass = socioEncontrado?.estadoSocio === 'Activo' ? 'border-green-400' : 'border-red-400';
        if (socioEncontrado?.estadoSocio === 'Activo' && aptoStatus.status !== 'Válido' && aptoStatus.status !== 'No Aplica') {
            cardBorderClass = 'border-orange-400';
        }

    } else if (person.isAdherente) {
        statusBadge = <Badge variant={person.estadoAdherente === 'Activo' ? 'default' : 'secondary'} className={person.estadoAdherente === 'Activo' ? 'bg-green-500' : 'bg-slate-500'}>{person.estadoAdherente}</Badge>;
         aptoMedicoDisplay = (
            <div className={`p-2 rounded-md text-xs ${aptoStatus.colorClass.replace('text-', 'text-').replace('bg-', 'bg-opacity-10 ')} border ${aptoStatus.colorClass.replace('text-', 'border-')}`}>
                <span className="font-medium">Apto Médico (Adh.): {aptoStatus.status}.</span> {aptoStatus.message}.
            </div>
        );
        puedeIngresarIndividualmente = socioEncontrado?.estadoSocio === 'Activo' && person.estadoAdherente === 'Activo';
        cardBorderClass = (socioEncontrado?.estadoSocio === 'Activo' && person.estadoAdherente === 'Activo') ? 'border-green-300' : 'border-red-300';
        if (socioEncontrado?.estadoSocio === 'Activo' && person.estadoAdherente === 'Activo' && aptoStatus.status !== 'Válido' && aptoStatus.status !== 'No Aplica') {
             cardBorderClass = 'border-orange-300';
        }
    }

    const fotoToShow = person.fotoUrl || `https://placehold.co/60x60.png?text=${person.nombreCompleto[0]}${person.nombreCompleto.split(' ')[1]?.[0] || ''}`;

    return (
      <Card key={person.id} className={`p-4 ${cardBorderClass} bg-card shadow-sm`}>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-muted">
            <AvatarImage src={fotoToShow} alt={person.nombreCompleto} data-ai-hint="member photo"/>
            <AvatarFallback className="text-xl">
              {person.nombreCompleto.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center sm:text-left">
            <div className="font-semibold text-lg text-foreground flex items-center">
              {person.nombreCompleto}
              <Badge variant="outline" className="ml-2 align-middle">{person.relacion}</Badge>
               {esCumpleanosHoy(person.fechaNacimiento) && (
                  <Badge variant="secondary" className="ml-2 bg-pink-500 text-white"><Gift className="mr-1 h-3.5 w-3.5" /> ¡Hoy Cumple!</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">DNI: {person.dni}</p>
            {person.isTitular && socioEncontrado && (
              <div className="text-sm text-muted-foreground">
                N° Socio: {socioEncontrado.numeroSocio} | Estado Club: {statusBadge}
              </div>
            )}
            {person.isAdherente && (
                 <div className="text-sm text-muted-foreground">Estado Adherente: {statusBadge}</div>
            )}
          </div>
          <div className="flex flex-col items-center gap-2 pt-2 sm:pt-0 sm:ml-auto">
            {!person.isAdherente && (
              <Button variant="outline" size="sm" onClick={() => handleVerCarnet(person)} className="w-full sm:w-auto">
                <Ticket className="mr-2 h-4 w-4" /> Ver Carnet
              </Button>
            )}
             {person.isAdherente && (
                <Button variant="ghost" size="sm" className="w-full sm:w-auto text-xs text-muted-foreground">
                   <FileText className="mr-2 h-3 w-3" /> Carnet Adh. (Sim.)
                </Button>
            )}
            {ingresosSesion[person.dni] ? (
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white py-1.5 px-3 text-xs sm:text-sm whitespace-nowrap w-full justify-center sm:w-auto">
                      <CheckCircle className="mr-1.5 h-4 w-4" />
                      Ingresó
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAnularIngreso(person)}
                      className="w-full sm:w-auto"
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Anular Ingreso
                    </Button>
                </div>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => handleRegistrarIngreso(person)}
                className="w-full sm:w-auto"
                disabled={!puedeIngresarIndividualmente}
              >
                <LogIn className="mr-2 h-4 w-4" /> Registrar Ingreso
              </Button>
            )}
          </div>
        </div>
        {aptoMedicoDisplay && (
          <>
            <Separator className="my-3" />
            {aptoMedicoDisplay}
          </>
        )}
      </Card>
    );
  };


  return (
    <div className="space-y-8">
      <Card className="w-full max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center"><ShieldCheck className="mr-3 h-7 w-7 text-primary" /> Control de Acceso</CardTitle>
          <CardDescription>Busque un socio titular (por N° Socio, DNI o Nombre).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder="N° Socio, DNI, Nombre o Apellido del Titular"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-grow"
            />
            <Button onClick={() => handleSearch()} disabled={loading}>
              <Search className="mr-2 h-4 w-4" /> {loading ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>

          {mensajeBusqueda && <p className="text-sm text-center text-muted-foreground">{mensajeBusqueda}</p>}

          {loading && !socioEncontrado && (
              <div className="pt-4 space-y-3">
                  <Skeleton className="h-24 w-24 rounded-full mx-auto" />
                  <Skeleton className="h-6 w-3/4 mx-auto" />
                  <Skeleton className="h-4 w-1/2 mx-auto" />
                  <Skeleton className="h-10 w-full" />
              </div>
          )}

          {socioEncontrado && !loading && (
            <Accordion type="single" collapsible className="w-full" value={accordionValue} onValueChange={setAccordionValue}>
              <AccordionItem value="socio-info">
                <AccordionTrigger className={`p-4 rounded-lg text-left ${colorClaseAccesoGeneral}`}>
                  <div className="flex items-center justify-between w-full">
                      <div className='flex items-center'>
                          {iconoAccesoGeneral}
                          <div>
                              <h3 className={`text-lg font-semibold ${textoColorAccesoGeneral}`}>
                              {socioEncontrado.nombre} {socioEncontrado.apellido} (N°: {socioEncontrado.numeroSocio})
                              {esCumpleanosHoy(socioEncontrado.fechaNacimiento) && <Badge variant="default" className="ml-2 bg-pink-500 text-white">¡Hoy Cumple!</Badge>}
                              </h3>
                              <div className={`text-sm ${accesoGeneralPermitido ? 'text-green-600' : 'text-red-600'}`}>
                              {mensajeAccesoGeneral}
                              </div>
                          </div>
                      </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-0">
                  <div className="border-t border-border px-4 py-4">
                      <p className="text-xs text-muted-foreground mb-4 text-center">Verifique el estado individual y registre el ingreso de cada miembro. El ingreso general depende del estado del socio titular.</p>
                      <div className="space-y-4">
                      {displayablePeople.map((person) => renderPersonCard(person))}
                      </div>
                  </div>

                  {solicitudCumpleanosHoySocioBuscado && (
                    <div className="border-t border-border px-4 py-4 mt-6">
                      <h4 className="text-lg font-semibold mb-3 flex items-center">
                          <Cake className="mr-2 h-5 w-5 text-pink-500" />
                          Invitados Lista Cumpleaños (Hoy: {solicitudCumpleanosHoySocioBuscado.fechaEvento ? formatDate(solicitudCumpleanosHoySocioBuscado.fechaEvento as Date) : 'Fecha Invalida'})
                      </h4>
                      {!eventoHabilitadoPorIngresoFamiliarCumple && (
                          <p className="text-sm text-orange-600 bg-orange-100 p-2 rounded-md mb-3">
                              <ShieldAlert className="inline mr-1 h-4 w-4" /> Un miembro del grupo ({socioEncontrado.nombre} {socioEncontrado.apellido} o familiar) debe registrar su ingreso primero para habilitar el registro de invitados de esta lista.
                          </p>
                      )}
                       {eventoHabilitadoPorIngresoFamiliarCumple && (
                          <p className="text-sm text-green-600 bg-green-100 p-2 rounded-md mb-3">
                              <UserCheck className="inline mr-1 h-4 w-4" /> Un miembro del grupo ya registró su ingreso para el evento de cumpleaños. Puede proceder con los invitados de la lista.
                          </p>
                      )}
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {invitadosCumpleanosSocioBuscado.map(invitado => (
                          <Card key={invitado.dni} className={`p-3 ${invitado.ingresado ? 'bg-green-500/10' : 'bg-card'}`}>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                   <p className="font-medium text-sm">{invitado.nombre} {invitado.apellido}</p>
                                   {invitado.ingresado && getMetodoPagoBadge(invitado.metodoPago, false, true)}
                                </div>
                                <p className="text-xs text-muted-foreground">DNI: {invitado.dni}</p>
                              </div>
                              {!invitado.ingresado && eventoHabilitadoPorIngresoFamiliarCumple && (
                                <RadioGroup
                                    onValueChange={(value) => handleMetodoPagoChange(invitado.dni, value as MetodoPagoInvitado)}
                                    defaultValue={metodosPagoSeleccionados[invitado.dni] || undefined}
                                    className="flex flex-col sm:flex-row gap-1 sm:gap-3 py-1 sm:py-0 items-start sm:items-center"
                                >
                                    {(['Efectivo', 'Transferencia', 'Caja'] as MetodoPagoInvitado[]).map(metodo => (
                                        <div key={metodo} className="flex items-center space-x-1.5">
                                            <RadioGroupItem value={metodo} id={`cumple-${invitado.dni}-${metodo}`} className="h-3.5 w-3.5" />
                                            <Label htmlFor={`cumple-${invitado.dni}-${metodo}`} className="text-xs font-normal cursor-pointer">{metodo}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                              )}
                              <div className="flex items-center space-x-2 self-end sm:self-center">
                                 <Button
                                   size="sm"
                                   variant={invitado.ingresado ? "outline" : "default"}
                                   onClick={() => handleRegistrarIngresoInvitado(invitado.dni, 'cumpleanos', solicitudCumpleanosHoySocioBuscado!.id)}
                                   disabled={!eventoHabilitadoPorIngresoFamiliarCumple || (!invitado.ingresado && !metodosPagoSeleccionados[invitado.dni])}
                                   className="min-w-[120px]"
                                 >
                                  {invitado.ingresado ? "Anular Ingreso" : "Registrar Ingreso"}
                                 </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                        {invitadosCumpleanosSocioBuscado.length === 0 && <p className="text-sm text-muted-foreground">No hay invitados en la lista de cumpleaños de este socio para hoy.</p>}
                      </div>
                    </div>
                  )}

                  {solicitudInvitadosDiariosHoySocioBuscado && (
                    <div className="border-t border-border px-4 py-4 mt-6">
                      <h4 className="text-lg font-semibold mb-3 flex items-center">
                          <Users2 className="mr-2 h-5 w-5 text-primary" />
                          Invitados Diarios (Hoy: {format(parseISO(todayISO), "dd/MM/yyyy")})
                      </h4>
                      {hoyEsFechaRestringida ? (
                        <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md mb-3">
                            <AlertTriangleIcon className="inline mr-1 h-4 w-4" /> No se permiten invitados de cumpleaños en esta fecha ({format(new Date(), "dd/MM")}).
                        </p>
                      ) : countCumpleanerosEnGrupo > 0 ? (
                        <p className="text-sm text-pink-600 bg-pink-100 p-2 rounded-md mb-3">
                            <Gift className="inline mr-1 h-4 w-4" /> Este grupo familiar tiene {countCumpleanerosEnGrupo} cumpleañero(s) hoy.
                            Cupo total de invitados de cumpleaños: {cupoTotalInvitadosCumple}.
                            Registrados hoy: {invitadosCumpleRegistradosHoy}. Disponibles: {Math.max(0, cupoTotalInvitadosCumple - invitadosCumpleRegistradosHoy)}.
                        </p>
                      ) : (
                         <p className="text-sm text-blue-600 bg-blue-100 p-2 rounded-md mb-3">
                            <Info className="inline mr-1 h-4 w-4" /> Este grupo familiar no tiene cumpleañeros hoy, por lo que no aplica el cupo especial de invitados de cumpleaños.
                        </p>
                      )}
                      {!eventoHabilitadoPorIngresoFamiliarDiario && (
                          <p className="text-sm text-orange-600 bg-orange-100 p-2 rounded-md mb-3">
                              <ShieldAlert className="inline mr-1 h-4 w-4" /> Un miembro del grupo ({socioEncontrado.nombre} {socioEncontrado.apellido} o familiar) debe registrar su ingreso primero para habilitar el registro de invitados diarios.
                          </p>
                      )}
                       {eventoHabilitadoPorIngresoFamiliarDiario && (
                          <p className="text-sm text-green-600 bg-green-100 p-2 rounded-md mb-3">
                              <UserCheck className="inline mr-1 h-4 w-4" /> Un miembro del grupo ya registró su ingreso. Puede proceder con los invitados diarios.
                          </p>
                      )}
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                        {invitadosDiariosSocioBuscado.map(invitado => {
                          let esMenorDeTres = false;
                          if (invitado.fechaNacimiento && isValid(new Date(invitado.fechaNacimiento))) {
                            const edad = differenceInYears(new Date(), new Date(invitado.fechaNacimiento));
                            if (edad < 3) {
                              esMenorDeTres = true;
                            }
                          }
                          const esDeCumpleOriginal = !!invitado.esDeCumpleanos;
                          const checkboxCumpleDisabled = hoyEsFechaRestringida || countCumpleanerosEnGrupo === 0 || (invitadosCumpleRegistradosHoy >= cupoTotalInvitadosCumple && !esDeCumpleOriginal);

                          return (
                            <Card key={invitado.dni} className={`p-3 ${invitado.ingresado ? 'bg-green-500/10' : 'bg-card'}`}>
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                 <div className="flex-1">
                                   <div className="flex items-center justify-between">
                                      <p className="font-medium text-sm flex items-center">
                                        {invitado.nombre} {invitado.apellido}
                                        {esMenorDeTres && <Baby className="ml-2 h-4 w-4 text-purple-500" title="Menor de 3 años (Ingreso Gratuito)" />}
                                        {esCumpleanosHoy(invitado.fechaNacimiento) && <Badge variant="secondary" className="ml-2 text-xs bg-pink-500 hover:bg-pink-600 text-white"><Gift className="mr-1 h-3 w-3" /> ¡Hoy Cumple!</Badge>}
                                      </p>
                                      {invitado.ingresado && getMetodoPagoBadge(invitado.metodoPago, esMenorDeTres, hoyEsFechaRestringida ? false : invitado.esDeCumpleanos)}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        DNI: {invitado.dni}
                                        {invitado.fechaNacimiento && ` | Nac: ${formatDate(invitado.fechaNacimiento)}`}
                                    </p>
                                 </div>
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                                    {!invitado.ingresado && eventoHabilitadoPorIngresoFamiliarDiario && !esMenorDeTres && (
                                      <div className="flex items-center space-x-2 py-1 sm:border-2 sm:border-pink-500 sm:p-1">
                                        <Checkbox
                                          id={`cumple-diario-${invitado.dni}`}
                                          checked={hoyEsFechaRestringida ? false : !!invitadosCumpleanosCheckboxState[invitado.dni]}
                                          onCheckedChange={(checked) => handleInvitadoCumpleanosCheckboxChange(invitado.dni, !!checked)}
                                          disabled={checkboxCumpleDisabled}
                                        />
                                        <Label htmlFor={`cumple-diario-${invitado.dni}`} className={`text-xs font-normal cursor-pointer ${checkboxCumpleDisabled ? 'text-muted-foreground' : ''}`}>
                                          Es Inv. Cumpleaños {hoyEsFechaRestringida ? '(No disponible hoy)' : ''}
                                        </Label>
                                      </div>
                                    )}
                                    {!invitado.ingresado && eventoHabilitadoPorIngresoFamiliarDiario && !esMenorDeTres && !invitadosCumpleanosCheckboxState[invitado.dni] && (
                                      <RadioGroup
                                          onValueChange={(value) => handleMetodoPagoChange(invitado.dni, value as MetodoPagoInvitado)}
                                          defaultValue={metodosPagoSeleccionados[invitado.dni] || undefined}
                                          className="flex flex-col sm:flex-row gap-1 sm:gap-3 py-1 sm:py-0 items-start sm:items-center"
                                      >
                                          {(['Efectivo', 'Transferencia', 'Caja'] as MetodoPagoInvitado[]).map(metodo => (
                                              <div key={metodo} className="flex items-center space-x-1.5">
                                                  <RadioGroupItem value={metodo} id={`diario-${invitado.dni}-${metodo}`} className="h-3.5 w-3.5" />
                                                  <Label htmlFor={`diario-${invitado.dni}-${metodo}`} className="text-xs font-normal cursor-pointer">{metodo}</Label>
                                              </div>
                                          ))}
                                      </RadioGroup>
                                    )}
                                  </div>
                                 <div className="flex items-center space-x-2 self-end sm:self-center pt-2 sm:pt-0">
                                   <Button
                                     size="sm"
                                     variant={invitado.ingresado ? "outline" : "default"}
                                     onClick={() => handleRegistrarIngresoInvitado(invitado.dni, 'diario')}
                                     disabled={
                                       !eventoHabilitadoPorIngresoFamiliarDiario ||
                                       (!invitado.ingresado && !esMenorDeTres && !(hoyEsFechaRestringida ? false : !!invitadosCumpleanosCheckboxState[invitado.dni]) && !metodosPagoSeleccionados[invitado.dni])
                                     }
                                     className="min-w-[120px]"
                                   >
                                    {invitado.ingresado ? "Anular Ingreso" : "Registrar Ingreso"}
                                   </Button>
                                 </div>
                              </div>
                            </Card>
                          );
                        })}
                        {invitadosDiariosSocioBuscado.length === 0 && <p className="text-sm text-muted-foreground">No hay invitados diarios registrados para este socio hoy.</p>}
                      </div>
                    </div>
                  )}

                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

    