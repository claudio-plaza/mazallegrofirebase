
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Socio, MiembroFamiliar, AptoMedicoInfo, SolicitudCumpleanos, InvitadoCumpleanos, SolicitudInvitadosDiarios, InvitadoDiario, Adherente, MetodoPagoInvitado } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, UserCircle, ShieldCheck, ShieldAlert, CheckCircle, XCircle, User, Users, LogIn, Ticket, ChevronDown, Cake, ListFilter, UserCheck, CalendarDays, Info, Users2, LinkIcon, FileText, CreditCard, Banknote, Archive } from 'lucide-react';
import { formatDate, getAptoMedicoStatus } from '@/lib/helpers';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { format, isToday, parseISO, formatISO, differenceInYears } from 'date-fns';
import { 
  getSocioByNumeroSocioOrDNI, 
  getAllSolicitudesCumpleanos, 
  updateSolicitudCumpleanos,
  getAllSolicitudesInvitadosDiarios,
  updateSolicitudInvitadosDiarios
} from '@/lib/firebase/firestoreService';

type DisplayablePerson = {
  id: string; 
  nombreCompleto: string;
  dni: string;
  fotoUrl?: string;
  aptoMedico?: AptoMedicoInfo;
  fechaNacimiento?: string | Date; // Added for age check
  estadoSocioTitular?: Socio['estadoSocio']; // Estado del titular al que pertenece
  relacion?: string;
  isTitular: boolean;
  isFamiliar: boolean;
  isAdherente: boolean;
  estadoAdherente?: Adherente['estadoAdherente']; // Solo para adherentes
};

type FestejoHoy = SolicitudCumpleanos & {
    socioTitularNombreCompleto?: string;
};

export function ControlAcceso() {
  const [searchTerm, setSearchTerm] = useState('');
  const [socioEncontrado, setSocioEncontrado] = useState<Socio | null>(null);
  const [mensajeBusqueda, setMensajeBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [accordionValue, setAccordionValue] = useState<string | undefined>(undefined);
  
  const [solicitudCumpleanosHoySocioBuscado, setSolicitudCumpleanosHoySocioBuscado] = useState<SolicitudCumpleanos | null>(null);
  const [invitadosCumpleanosSocioBuscado, setInvitadosCumpleanosSocioBuscado] = useState<InvitadoCumpleanos[]>([]);
  
  const [solicitudInvitadosDiariosHoySocioBuscado, setSolicitudInvitadosDiariosHoySocioBuscado] = useState<SolicitudInvitadosDiarios | null>(null);
  const [invitadosDiariosSocioBuscado, setInvitadosDiariosSocioBuscado] = useState<InvitadoDiario[]>([]);

  const [eventoHabilitadoPorIngresoFamiliarCumple, setEventoHabilitadoPorIngresoFamiliarCumple] = useState(false);
  const [eventoHabilitadoPorIngresoFamiliarDiario, setEventoHabilitadoPorIngresoFamiliarDiario] = useState(false);
  
  const [festejosDelDia, setFestejosDelDia] = useState<FestejoHoy[]>([]);
  const [loadingFestejos, setLoadingFestejos] = useState(true);
  
  const [metodosPagoSeleccionados, setMetodosPagoSeleccionados] = useState<Record<string, MetodoPagoInvitado | null>>({});

  const todayISO = formatISO(new Date(), { representation: 'date' });

  const loadFestejosDelDia = useCallback(async () => {
    setLoadingFestejos(true);
    try {
      const todasSolicitudes = await getAllSolicitudesCumpleanos();
      const festejosHoyPromises = todasSolicitudes
        .filter(sol => sol.fechaEvento && isToday(parseISO(sol.fechaEvento as unknown as string)) && sol.estado === 'Aprobada')
        .map(async (festejo) => {
          const titularDelFestejo = await getSocioByNumeroSocioOrDNI(festejo.idSocioTitular);
          return {
            ...festejo,
            socioTitularNombreCompleto: titularDelFestejo ? `${titularDelFestejo.nombre} ${titularDelFestejo.apellido}` : 'Socio no encontrado',
            listaInvitados: festejo.listaInvitados.map(inv => ({ ...inv, id: inv.dni }))
          };
        });
      const festejosHoy = await Promise.all(festejosHoyPromises);
      setFestejosDelDia(festejosHoy);
    } catch (error) {
      console.error("Error cargando festejos del dia:", error);
      toast({ title: "Error", description: "No se pudieron cargar los festejos del día.", variant: "destructive" });
    } finally {
      setLoadingFestejos(false);
    }
  }, [toast]);

  const handleSearch = useCallback(async (isRefresh = false) => {
    const currentSearchTerm = isRefresh && socioEncontrado ? (socioEncontrado.numeroSocio || socioEncontrado.dni) : searchTerm;
    if (!currentSearchTerm.trim()) {
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
    }
    
    try {
      const socio = await getSocioByNumeroSocioOrDNI(currentSearchTerm.trim());
      
      if (socio) {
        setSocioEncontrado(socio);
        setMensajeBusqueda('');
        setAccordionValue("socio-info");

        const todasSolicitudesCumple = await getAllSolicitudesCumpleanos();
        const solicitudHoyCumple = todasSolicitudesCumple.find(sol =>
          sol.idSocioTitular === socio.numeroSocio &&
          sol.fechaEvento && isToday(parseISO(sol.fechaEvento as unknown as string)) &&
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
            sol.fecha === todayISO
        );
        if (solicitudHoyDiaria) {
            setSolicitudInvitadosDiariosHoySocioBuscado(solicitudHoyDiaria);
            setInvitadosDiariosSocioBuscado(solicitudHoyDiaria.listaInvitadosDiarios.map(inv => ({...inv, id: inv.dni})));
            setEventoHabilitadoPorIngresoFamiliarDiario(solicitudHoyDiaria.titularIngresadoEvento || false);
        } else {
          setSolicitudInvitadosDiariosHoySocioBuscado(null);
          setInvitadosDiariosSocioBuscado([]);
          setEventoHabilitadoPorIngresoFamiliarDiario(false);
        }
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
  }, [searchTerm, todayISO, socioEncontrado, toast]);
  
  useEffect(() => {
    loadFestejosDelDia();
    const refreshData = async () => {
        if (socioEncontrado) await handleSearch(true); 
        await loadFestejosDelDia();
    };
    
    window.addEventListener('firestore/solicitudesCumpleanosUpdated', refreshData);
    window.addEventListener('firestore/solicitudesInvitadosDiariosUpdated', refreshData);
    window.addEventListener('firestore/sociosUpdated', refreshData); 
    
    return () => {
        window.removeEventListener('firestore/solicitudesCumpleanosUpdated', refreshData);
        window.removeEventListener('firestore/solicitudesInvitadosDiariosUpdated', refreshData);
        window.removeEventListener('firestore/sociosUpdated', refreshData);
    };
  }, [loadFestejosDelDia, socioEncontrado, handleSearch]);


  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleVerCarnet = (nombre: string) => {
    toast({
      title: 'Carnet Digital',
      description: `Mostrando carnet digital de ${nombre} (Simulado - QR próximamente).`,
    });
  };

  const handleRegistrarIngreso = (member: DisplayablePerson) => {
    if (!socioEncontrado) return;

    let puedeIngresar = false;
    let mensajeIngreso = '';
    const aptoStatus = getAptoMedicoStatus(member.aptoMedico, member.fechaNacimiento);

    if (member.isTitular || member.isFamiliar) {
      if (socioEncontrado.estadoSocio === 'Activo' && (aptoStatus.status === 'Válido' || aptoStatus.status === 'No Aplica')) {
        puedeIngresar = true;
        mensajeIngreso = `Acceso permitido para ${member.nombreCompleto} (${member.relacion}). Apto Médico: ${aptoStatus.status}.`;
      } else if (socioEncontrado.estadoSocio !== 'Activo') {
        mensajeIngreso = `Acceso Denegado. Socio titular ${socioEncontrado.nombre} ${socioEncontrado.apellido} está ${socioEncontrado.estadoSocio}.`;
      } else { // Titular activo pero apto no válido
        mensajeIngreso = `Acceso Denegado. ${member.nombreCompleto} (${member.relacion}) tiene Apto Médico ${aptoStatus.status}. ${aptoStatus.message}.`;
      }
    } else if (member.isAdherente) {
      if (socioEncontrado.estadoSocio === 'Activo' && member.estadoAdherente === 'Activo' && (aptoStatus.status === 'Válido' || aptoStatus.status === 'No Aplica')) {
        puedeIngresar = true;
        mensajeIngreso = `Acceso permitido para Adherente: ${member.nombreCompleto}. Apto Médico: ${aptoStatus.status}.`;
      } else if (socioEncontrado.estadoSocio !== 'Activo') {
        mensajeIngreso = `Acceso Denegado. Socio titular ${socioEncontrado.nombre} ${socioEncontrado.apellido} está ${socioEncontrado.estadoSocio}.`;
      } else if (member.estadoAdherente !== 'Activo') {
        mensajeIngreso = `Acceso Denegado. Adherente ${member.nombreCompleto} está ${member.estadoAdherente}.`;
      } else { // Titular y adherente activos, pero apto no válido
        mensajeIngreso = `Acceso Denegado. Adherente ${member.nombreCompleto} tiene Apto Médico ${aptoStatus.status}. ${aptoStatus.message}.`;
      }
    }

    toast({
      title: puedeIngresar ? 'Ingreso Registrado' : 'Acceso Denegado',
      description: mensajeIngreso,
      variant: puedeIngresar ? 'default' : 'destructive',
    });

    if (puedeIngresar && (member.isTitular || member.isFamiliar)) {
        let isMemberOfSearchedSocioGroup = false;
        if (socioEncontrado) {
            if (member.isTitular && member.id === socioEncontrado.id) {
                isMemberOfSearchedSocioGroup = true;
            } else if (socioEncontrado.grupoFamiliar?.some(fam => fam.dni === member.dni)) { 
                isMemberOfSearchedSocioGroup = true;
            }
        }
        if (isMemberOfSearchedSocioGroup) {
          try {
            if (solicitudCumpleanosHoySocioBuscado && !eventoHabilitadoPorIngresoFamiliarCumple) {
                const updatedSolicitud = {...solicitudCumpleanosHoySocioBuscado, titularIngresadoEvento: true};
                updateSolicitudCumpleanos(updatedSolicitud); 
                setSolicitudCumpleanosHoySocioBuscado(updatedSolicitud); 
                setEventoHabilitadoPorIngresoFamiliarCumple(true); 
            }
            if (solicitudInvitadosDiariosHoySocioBuscado && !eventoHabilitadoPorIngresoFamiliarDiario) {
                const updatedSolicitudDiaria = {...solicitudInvitadosDiariosHoySocioBuscado, titularIngresadoEvento: true};
                updateSolicitudInvitadosDiarios(updatedSolicitudDiaria); 
                setSolicitudInvitadosDiariosHoySocioBuscado(updatedSolicitudDiaria);
                setEventoHabilitadoPorIngresoFamiliarDiario(true); 
            }
          } catch (error) {
            console.error("Error actualizando estado de ingreso del grupo para evento/lista:", error);
            toast({ title: "Error", description: "No se pudo actualizar el estado del evento/lista.", variant: "destructive" });
          }
        }
    }
  };
  
  const handleMetodoPagoChange = (invitadoId: string, metodo: MetodoPagoInvitado | null) => {
    setMetodosPagoSeleccionados(prev => ({...prev, [invitadoId]: metodo }));
  };

  const handleRegistrarIngresoInvitado = async (invitadoDni: string, tipoInvitado: 'cumpleanos' | 'diario', festejoId?: string) => {
    let targetFestejo: SolicitudCumpleanos | FestejoHoy | null = null;
    let targetInvitados: (InvitadoCumpleanos | InvitadoDiario)[] = [];
    let targetEventoHabilitado: boolean = false;
    let isFestejoDelSocioBuscado = false;
    let metodoPagoSeleccionado = metodosPagoSeleccionados[invitadoDni] || null;

    if (!metodoPagoSeleccionado && tipoInvitado !== 'diario' && tipoInvitado !== 'cumpleanos') { // Assuming 'Caja' doesn't need explicit selection if it's the only option or default.
        toast({ title: "Error", description: "Por favor, seleccione un método de pago para el invitado.", variant: "destructive" });
        return;
    }


    if (tipoInvitado === 'cumpleanos') {
        if (solicitudCumpleanosHoySocioBuscado && solicitudCumpleanosHoySocioBuscado.id === festejoId) {
            targetFestejo = solicitudCumpleanosHoySocioBuscado;
            targetInvitados = invitadosCumpleanosSocioBuscado;
            targetEventoHabilitado = eventoHabilitadoPorIngresoFamiliarCumple; 
            isFestejoDelSocioBuscado = true;
        } else {
            const generalFestejo = festejosDelDia.find(f => f.id === festejoId);
            if (generalFestejo) {
                targetFestejo = generalFestejo;
                targetInvitados = generalFestejo.listaInvitados;
                targetEventoHabilitado = generalFestejo.titularIngresadoEvento || false; 
            }
        }
        if (!targetEventoHabilitado) {
          toast({ title: 'Acceso Denegado (Invitado Cumpleaños)', description: 'Un miembro del grupo familiar del socio titular del evento debe registrar su ingreso primero.', variant: 'destructive' });
          return;
        }
    } else { // tipoInvitado === 'diario'
        if (!solicitudInvitadosDiariosHoySocioBuscado) return;
        targetInvitados = invitadosDiariosSocioBuscado;
        targetEventoHabilitado = eventoHabilitadoPorIngresoFamiliarDiario;
        if (!targetEventoHabilitado) {
          toast({ title: 'Acceso Denegado (Invitado Diario)', description: 'Un miembro del grupo familiar del socio titular debe registrar su ingreso primero.', variant: 'destructive' });
          return;
        }
    }
    
    if (!targetFestejo && tipoInvitado === 'cumpleanos') return; // Ensure festejo is found for birthdays
    if (!solicitudInvitadosDiariosHoySocioBuscado && tipoInvitado === 'diario') return;


    const updatedInvitados = targetInvitados.map(inv =>
        inv.dni === invitadoDni ? { ...inv, ingresado: !inv.ingresado, metodoPago: !inv.ingresado ? metodoPagoSeleccionado : inv.metodoPago } : inv
    );
    
    const invitado = updatedInvitados.find(inv => inv.dni === invitadoDni);
    toast({
        title: `Ingreso Invitado ${invitado?.ingresado ? 'Registrado' : 'Anulado'}`,
        description: `${invitado?.nombre} ${invitado?.apellido} (DNI: ${invitado?.dni}) ha sido ${invitado?.ingresado ? `marcado como ingresado (Pago: ${invitado.metodoPago || 'No especificado'})` : 'desmarcado'}.`,
    });

    if (tipoInvitado === 'cumpleanos' && targetFestejo) {
        const updatedFestejo = { ...targetFestejo, listaInvitados: updatedInvitados as InvitadoCumpleanos[] };
        try {
            await updateSolicitudCumpleanos(updatedFestejo as SolicitudCumpleanos);
            if (isFestejoDelSocioBuscado) {
                setInvitadosCumpleanosSocioBuscado(updatedInvitados as InvitadoCumpleanos[]);
                setSolicitudCumpleanosHoySocioBuscado(updatedFestejo as SolicitudCumpleanos);
            } else {
                setFestejosDelDia(prevFestejos => 
                    prevFestejos.map(f => f.id === festejoId ? (updatedFestejo as FestejoHoy) : f)
                );
            }
        } catch (error) {
            console.error("Error actualizando ingreso de invitado de cumpleaños:", error);
            toast({ title: "Error", description: "No se pudo registrar el ingreso del invitado.", variant: "destructive" });
        }
    } else if (tipoInvitado === 'diario' && solicitudInvitadosDiariosHoySocioBuscado) {
        const updatedSolicitud = { ...solicitudInvitadosDiariosHoySocioBuscado, listaInvitadosDiarios: updatedInvitados as InvitadoDiario[] };
        try {
            await updateSolicitudInvitadosDiarios(updatedSolicitud);
            setInvitadosDiariosSocioBuscado(updatedInvitados as InvitadoDiario[]); 
            setSolicitudInvitadosDiariosHoySocioBuscado(updatedSolicitud);
        } catch (error) {
            console.error("Error actualizando ingreso de invitado diario:", error);
            toast({ title: "Error", description: "No se pudo registrar el ingreso del invitado.", variant: "destructive" });
        }
    }
    setMetodosPagoSeleccionados(prev => ({...prev, [invitadoDni]: null })); // Reset selection for this guest
  };

  const getMetodoPagoBadge = (metodo: MetodoPagoInvitado | null | undefined) => {
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


  const displayablePeople: DisplayablePerson[] = [];
  if (socioEncontrado) {
    displayablePeople.push({
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
      displayablePeople.push({
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
      displayablePeople.push({
        id: adh.id || adh.dni, // Use DNI if ID is undefined
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
  }

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
        cardBorderClass = socioEncontrado?.estadoSocio === 'Activo' && (aptoStatus.status === 'Válido' || aptoStatus.status === 'No Aplica') ? 'border-green-400' : 'border-red-400';
        puedeIngresarIndividualmente = socioEncontrado?.estadoSocio === 'Activo' && (aptoStatus.status === 'Válido' || aptoStatus.status === 'No Aplica');
    } else if (person.isAdherente) {
        statusBadge = <Badge variant={person.estadoAdherente === 'Activo' ? 'default' : 'secondary'} className={person.estadoAdherente === 'Activo' ? 'bg-green-500' : 'bg-slate-500'}>{person.estadoAdherente}</Badge>;
         aptoMedicoDisplay = (
            <div className={`p-2 rounded-md text-xs ${aptoStatus.colorClass.replace('text-', 'text-').replace('bg-', 'bg-opacity-10 ')} border ${aptoStatus.colorClass.replace('text-', 'border-')}`}>
                <span className="font-medium">Apto Médico (Adh.): {aptoStatus.status}.</span> {aptoStatus.message}.
            </div>
        );
        cardBorderClass = (socioEncontrado?.estadoSocio === 'Activo' && person.estadoAdherente === 'Activo' && (aptoStatus.status === 'Válido' || aptoStatus.status === 'No Aplica')) ? 'border-green-300' : 'border-red-300';
        puedeIngresarIndividualmente = socioEncontrado?.estadoSocio === 'Activo' && person.estadoAdherente === 'Activo' && (aptoStatus.status === 'Válido' || aptoStatus.status === 'No Aplica');
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
          <div className="flex flex-col sm:flex-row gap-2 items-center sm:items-stretch pt-2 sm:pt-0">
            {!person.isAdherente && (
              <Button variant="outline" size="sm" onClick={() => handleVerCarnet(person.nombreCompleto)} className="w-full sm:w-auto">
                <Ticket className="mr-2 h-4 w-4" /> Ver Carnet
              </Button>
            )}
             {person.isAdherente && (
                <Button variant="ghost" size="sm" className="w-full sm:w-auto text-xs text-muted-foreground">
                   <FileText className="mr-2 h-3 w-3" /> Carnet Adh. (Sim.)
                </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => handleRegistrarIngreso(person)}
              className="w-full sm:w-auto"
              disabled={!puedeIngresarIndividualmente}
            >
              <LogIn className="mr-2 h-4 w-4" /> Registrar Ingreso
            </Button>
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
          <CardDescription>Busque un socio titular (por N° Socio, DNI o Nombre) o consulte los festejos del día.</CardDescription>
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
                          Invitados Cumpleaños (Hoy: {solicitudCumpleanosHoySocioBuscado.fechaEvento ? formatDate(solicitudCumpleanosHoySocioBuscado.fechaEvento as unknown as string) : 'Fecha Invalida'})
                      </h4>
                      {!eventoHabilitadoPorIngresoFamiliarCumple && (
                          <p className="text-sm text-orange-600 bg-orange-100 p-2 rounded-md mb-3">
                              <ShieldAlert className="inline mr-1 h-4 w-4" /> Un miembro del grupo ({socioEncontrado.nombre} {socioEncontrado.apellido} o familiar) debe registrar su ingreso primero para habilitar el registro de invitados de cumpleaños.
                          </p>
                      )}
                       {eventoHabilitadoPorIngresoFamiliarCumple && (
                          <p className="text-sm text-green-600 bg-green-100 p-2 rounded-md mb-3">
                              <UserCheck className="inline mr-1 h-4 w-4" /> Un miembro del grupo ya registró su ingreso para el evento de cumpleaños. Puede proceder con los invitados.
                          </p>
                      )}
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {invitadosCumpleanosSocioBuscado.map(invitado => (
                          <Card key={invitado.dni} className={`p-3 ${invitado.ingresado ? 'bg-green-500/10' : 'bg-card'}`}>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                   <p className="font-medium text-sm">{invitado.nombre} {invitado.apellido}</p>
                                   {invitado.ingresado && invitado.metodoPago && getMetodoPagoBadge(invitado.metodoPago)}
                                </div>
                                <p className="text-xs text-muted-foreground">DNI: {invitado.dni}</p>
                              </div>
                              {!invitado.ingresado && eventoHabilitadoPorIngresoFamiliarCumple && (
                                <RadioGroup
                                    onValueChange={(value) => handleMetodoPagoChange(invitado.dni, value as MetodoPagoInvitado)}
                                    defaultValue={metodosPagoSeleccionados[invitado.dni] || undefined}
                                    className="flex flex-row gap-2 sm:gap-3 py-1 sm:py-0 items-center"
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
                        {invitadosCumpleanosSocioBuscado.length === 0 && <p className="text-sm text-muted-foreground">No hay invitados de cumpleaños registrados para este socio hoy.</p>}
                      </div>
                    </div>
                  )}

                  {solicitudInvitadosDiariosHoySocioBuscado && (
                    <div className="border-t border-border px-4 py-4 mt-6">
                      <h4 className="text-lg font-semibold mb-3 flex items-center">
                          <Users2 className="mr-2 h-5 w-5 text-blue-500" />
                          Invitados Diarios (Hoy: {format(parseISO(todayISO), "dd/MM/yyyy")})
                      </h4>
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
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {invitadosDiariosSocioBuscado.map(invitado => (
                          <Card key={invitado.dni} className={`p-3 ${invitado.ingresado ? 'bg-green-500/10' : 'bg-card'}`}>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                               <div className="flex-1">
                                 <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">{invitado.nombre} {invitado.apellido}</p>
                                    {invitado.ingresado && invitado.metodoPago && getMetodoPagoBadge(invitado.metodoPago)}
                                  </div>
                                  <p className="text-xs text-muted-foreground">DNI: {invitado.dni}</p>
                               </div>
                               {!invitado.ingresado && eventoHabilitadoPorIngresoFamiliarDiario && (
                                <RadioGroup
                                    onValueChange={(value) => handleMetodoPagoChange(invitado.dni, value as MetodoPagoInvitado)}
                                    defaultValue={metodosPagoSeleccionados[invitado.dni] || undefined}
                                    className="flex flex-row gap-2 sm:gap-3 py-1 sm:py-0 items-center"
                                >
                                    {(['Efectivo', 'Transferencia', 'Caja'] as MetodoPagoInvitado[]).map(metodo => (
                                        <div key={metodo} className="flex items-center space-x-1.5">
                                            <RadioGroupItem value={metodo} id={`diario-${invitado.dni}-${metodo}`} className="h-3.5 w-3.5" />
                                            <Label htmlFor={`diario-${invitado.dni}-${metodo}`} className="text-xs font-normal cursor-pointer">{metodo}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                               )}
                               <div className="flex items-center space-x-2 self-end sm:self-center">
                                 <Button
                                   size="sm"
                                   variant={invitado.ingresado ? "outline" : "default"}
                                   onClick={() => handleRegistrarIngresoInvitado(invitado.dni, 'diario')}
                                   disabled={!eventoHabilitadoPorIngresoFamiliarDiario || (!invitado.ingresado && !metodosPagoSeleccionados[invitado.dni])}
                                   className="min-w-[120px]"
                                 >
                                  {invitado.ingresado ? "Anular Ingreso" : "Registrar Ingreso"}
                                 </Button>
                               </div>
                            </div>
                          </Card>
                        ))}
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

      <Card className="w-full max-w-3xl mx-auto shadow-xl">
        <CardHeader>
            <CardTitle className="text-xl flex items-center">
                <CalendarDays className="mr-3 h-6 w-6 text-primary" />
                Festejos de Cumpleaños Programados para Hoy
            </CardTitle>
            <CardDescription>Lista de todos los festejos aprobados para la fecha actual.</CardDescription>
        </CardHeader>
        <CardContent>
            {loadingFestejos && <p>Cargando festejos del día...</p>}
            {!loadingFestejos && festejosDelDia.length === 0 && (
                 <p className="text-sm text-center text-muted-foreground py-4">No hay festejos de cumpleaños programados para hoy.</p>
            )}
            {!loadingFestejos && festejosDelDia.length > 0 && (
                <Accordion type="multiple" className="w-full space-y-2">
                    {festejosDelDia.map((festejo) => (
                        <AccordionItem value={festejo.id} key={festejo.id}>
                            <AccordionTrigger className="p-3 rounded-md hover:bg-muted/50 bg-muted/20 text-left">
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center">
                                        <Cake className="mr-2 h-5 w-5 text-pink-400" />
                                        <div>
                                            <span className="font-semibold text-sm">
                                                Festejo de: {festejo.nombreCumpleanero}
                                            </span>
                                            <p className="text-xs text-muted-foreground">
                                                Socio Titular: {festejo.socioTitularNombreCompleto} (N°: {festejo.idSocioTitular})
                                                {' | '} {festejo.listaInvitados.length} invitado(s)
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant={festejo.titularIngresadoEvento ? "default" : "outline"} className={festejo.titularIngresadoEvento ? "bg-green-500" : ""}>
                                        {festejo.titularIngresadoEvento ? "Grupo Ingresó" : "Grupo Pendiente"}
                                    </Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-0">
                                <div className="border-t border-border px-3 py-3">
                                    {!festejo.titularIngresadoEvento && (
                                        <p className="text-xs text-orange-500 bg-orange-500/10 p-2 rounded-md mb-2">
                                            <Info className="inline mr-1 h-3 w-3" /> Un miembro del grupo familiar del socio titular de este evento aún no ha registrado su ingreso. Los invitados no pueden ingresar hasta que lo haga.
                                        </p>
                                    )}
                                    <h5 className="text-xs font-medium text-muted-foreground mb-2">Invitados Cumpleaños:</h5>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {festejo.listaInvitados.map(invitado => (
                                            <Card key={invitado.dni} className={`p-2 text-xs ${invitado.ingresado ? 'bg-green-500/10' : 'bg-card'}`}>
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                                                    <div className="flex-1">
                                                      <div className="flex items-center justify-between">
                                                        <p className="font-medium">{invitado.nombre} {invitado.apellido}</p>
                                                        {invitado.ingresado && invitado.metodoPago && getMetodoPagoBadge(invitado.metodoPago)}
                                                      </div>
                                                      <p className="text-muted-foreground">DNI: {invitado.dni}</p>
                                                    </div>
                                                    {!invitado.ingresado && festejo.titularIngresadoEvento && (
                                                        <RadioGroup
                                                            onValueChange={(value) => handleMetodoPagoChange(invitado.dni, value as MetodoPagoInvitado)}
                                                            defaultValue={metodosPagoSeleccionados[invitado.dni] || undefined}
                                                            className="flex flex-row gap-1.5 py-0.5 items-center"
                                                        >
                                                            {(['Efectivo', 'Transferencia', 'Caja'] as MetodoPagoInvitado[]).map(metodo => (
                                                                <div key={metodo} className="flex items-center space-x-1">
                                                                    <RadioGroupItem value={metodo} id={`general-cumple-${festejo.id}-${invitado.dni}-${metodo}`} className="h-3 w-3" />
                                                                    <Label htmlFor={`general-cumple-${festejo.id}-${invitado.dni}-${metodo}`} className="text-xs font-normal cursor-pointer">{metodo}</Label>
                                                                </div>
                                                            ))}
                                                        </RadioGroup>
                                                    )}
                                                    <div className="flex items-center space-x-2 self-end sm:self-center">
                                                        <Button
                                                           size="sm"
                                                           variant={invitado.ingresado ? "outline" : "default"}
                                                           onClick={() => handleRegistrarIngresoInvitado(invitado.dni, 'cumpleanos', festejo.id)}
                                                           disabled={!festejo.titularIngresadoEvento || (!invitado.ingresado && !metodosPagoSeleccionados[invitado.dni])}
                                                           className="min-w-[90px] text-xs h-7"
                                                         >
                                                          {invitado.ingresado ? "Anular" : "Ingresar"}
                                                         </Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                        {festejo.listaInvitados.length === 0 && <p className="text-xs text-muted-foreground">No hay invitados en la lista para este festejo.</p>}
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

    
