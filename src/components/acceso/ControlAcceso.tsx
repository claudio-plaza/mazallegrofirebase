'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Socio, MiembroFamiliar, AptoMedicoInfo, SolicitudInvitadosDiarios, InvitadoDiario, Adherente, MetodoPagoInvitado } from '@/types';
import { EstadoSolicitudInvitados } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, ShieldCheck, ShieldAlert, CheckCircle, XCircle, LogIn, LogOut, Ticket, UserCheck, CalendarDays, Info, Users2, FileText, CreditCard, Banknote, Archive, Baby, Gift, AlertTriangle as AlertTriangleIcon } from 'lucide-react';
import { formatDate, getAptoMedicoStatus, esCumpleanosHoy, normalizeText, esFechaRestringidaParaCumpleanos, generateId } from '@/lib/helpers';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { format, isToday, parseISO, formatISO, differenceInYears, isValid } from 'date-fns';
import {
  getSocioByNumeroSocioOrDNI,
  getAllSolicitudesInvitadosDiarios,
  updateSolicitudInvitadosDiarios,
  addOrUpdateSolicitudInvitadosDiarios
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
  const router = useRouter();

  const [solicitudInvitadosDiariosHoySocioBuscado, setSolicitudInvitadosDiariosHoySocioBuscado] = useState<SolicitudInvitadosDiarios | null>(null);
  const [invitadosDiariosSocioBuscado, setInvitadosDiariosSocioBuscado] = useState<InvitadoDiario[]>([]);

  const [metodosPagoSeleccionados, setMetodosPagoSeleccionados] = useState<Record<string, MetodoPagoInvitado | null>>({});
  const [invitadosCumpleanosCheckboxState, setInvitadosCumpleanosCheckboxState] = useState<Record<string, boolean>>({});

  const [countCumpleanerosEnGrupo, setCountCumpleanerosEnGrupo] = useState(0);
  const [cupoTotalInvitadosCumple, setCupoTotalInvitadosCumple] = useState(0);

  const todayISO = formatISO(new Date(), { representation: 'date' });
  const hoyEsFechaRestringida = useMemo(() => esFechaRestringidaParaCumpleanos(new Date()), []);

  const eventoHabilitadoPorIngresoFamiliar = useMemo(() => {
    return !!(solicitudInvitadosDiariosHoySocioBuscado?.ingresosMiembros && solicitudInvitadosDiariosHoySocioBuscado.ingresosMiembros.length > 0);
  }, [solicitudInvitadosDiariosHoySocioBuscado]);


  const displayablePeople = useMemo(() => {
    if (!socioEncontrado) return [];
    const people: DisplayablePerson[] = [];
    people.push({
      id: socioEncontrado.id,
      nombreCompleto: `${socioEncontrado.nombre} ${socioEncontrado.apellido}`,
      dni: socioEncontrado.dni,
      fotoUrl: socioEncontrado.fotoUrl || undefined || `https://placehold.co/60x60.png`,
      aptoMedico: socioEncontrado.aptoMedico || undefined,
      fechaNacimiento: socioEncontrado.fechaNacimiento,
      estadoSocioTitular: socioEncontrado.estadoSocio,
      relacion: 'Titular',
      isTitular: true,
      isFamiliar: false,
      isAdherente: false,
    });
    socioEncontrado.grupoFamiliar?.forEach(fam => {
      let fotoFamiliar = `https://placehold.co/60x60.png`;
      if (fam.fotoPerfil && typeof fam.fotoPerfil === 'string') {
         fotoFamiliar = fam.fotoPerfil;
      }
      people.push({
        id: fam.id || fam.dni,
        nombreCompleto: `${fam.nombre} ${fam.apellido}`,
        dni: fam.dni,
        fotoUrl: fotoFamiliar || undefined,
        aptoMedico: fam.aptoMedico || undefined,
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
        fotoUrl: (adh.fotoPerfil && typeof adh.fotoPerfil === 'string' ? adh.fotoPerfil : undefined) || `https://placehold.co/60x60.png`,
        aptoMedico: adh.aptoMedico || undefined,
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


  const handleSearch = useCallback(async (isRefresh = false) => {
    const termToSearch = isRefresh && socioEncontrado ? (normalizeText(socioEncontrado.numeroSocio) || normalizeText(socioEncontrado.dni)) : normalizeText(searchTerm);
    if (!termToSearch.trim()) {
      setMensajeBusqueda('Por favor, ingrese un N° Socio, DNI o Nombre para buscar.');
      setSocioEncontrado(null);
      setSolicitudInvitadosDiariosHoySocioBuscado(null);
      setInvitadosDiariosSocioBuscado([]);
      setAccordionValue(undefined);
      setMetodosPagoSeleccionados({});
      setInvitadosCumpleanosCheckboxState({});
      setCountCumpleanerosEnGrupo(0);
      setCupoTotalInvitadosCumple(0);
      return;
    }
    setLoading(true);
    if(!isRefresh) {
      setSocioEncontrado(null);
      setSolicitudInvitadosDiariosHoySocioBuscado(null);
      setInvitadosDiariosSocioBuscado([]);
      setAccordionValue(undefined);
      setMetodosPagoSeleccionados({});
      setInvitadosCumpleanosCheckboxState({});
      setCountCumpleanerosEnGrupo(0);
      setCupoTotalInvitadosCumple(0);
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

        const todasSolicitudesDiarias = await getAllSolicitudesInvitadosDiarios();
        const solicitudHoyDiaria = todasSolicitudesDiarias.find(sol =>
            sol.idSocioTitular === socio.numeroSocio &&
            sol.fecha === todayISO &&
            (sol.estado === EstadoSolicitudInvitados.ENVIADA || sol.estado === EstadoSolicitudInvitados.PROCESADA)
        );

        const initialCheckboxState: Record<string,boolean> = {};

        if (solicitudHoyDiaria) {
            solicitudHoyDiaria.listaInvitadosDiarios.forEach(inv => {
                initialCheckboxState[inv.dni] = hoyEsFechaRestringida ? false : !!inv.esDeCumpleanos;
            });
            setSolicitudInvitadosDiariosHoySocioBuscado(solicitudHoyDiaria);
            setInvitadosDiariosSocioBuscado(solicitudHoyDiaria.listaInvitadosDiarios);
        } else {
          setSolicitudInvitadosDiariosHoySocioBuscado(null);
          setInvitadosDiariosSocioBuscado([]);
        }
        setInvitadosCumpleanosCheckboxState(initialCheckboxState);

      } else {
        setMensajeBusqueda('Persona no encontrada. Verifique los datos e intente nuevamente.');
        setSocioEncontrado(null);
      }
    } catch (error) {
      console.error("Error buscando socio:", error);
      toast({ title: "Error de Búsqueda", description: "No se pudo completar la búsqueda.", variant: "destructive"});
      setSocioEncontrado(null);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, todayISO, socioEncontrado, toast, hoyEsFechaRestringida]);

  useEffect(() => {
    const refreshData = async () => {
        if (socioEncontrado) await handleSearch(true);
    };

    window.addEventListener('firestore/solicitudesInvitadosDiariosUpdated', refreshData);
    window.addEventListener('sociosDBUpdated', refreshData);

    return () => {
        window.removeEventListener('firestore/solicitudesInvitadosDiariosUpdated', refreshData);
        window.removeEventListener('sociosDBUpdated', refreshData);
    };
  }, [socioEncontrado, handleSearch]); 

  const cupoUtilizado = useMemo(() => {
    return invitadosDiariosSocioBuscado.reduce((count, inv) => {
      const isCheckedInState = invitadosCumpleanosCheckboxState[inv.dni];
      if (isCheckedInState === true) {
        return count + 1;
      }
      if (isCheckedInState === false) {
        return count;
      }
      if (inv.esDeCumpleanos && inv.ingresado) {
        return count + 1;
      }
      return count;
    }, 0);
  }, [invitadosDiariosSocioBuscado, invitadosCumpleanosCheckboxState]);

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

  const handleRegistrarIngreso = async (member: DisplayablePerson) => {
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
      const solicitudActual = solicitudInvitadosDiariosHoySocioBuscado;
      const updatedIngresos = [...new Set([...(solicitudActual?.ingresosMiembros || []), member.dni])];
      
      const dataToSave: SolicitudInvitadosDiarios = solicitudActual 
        ? {
            ...solicitudActual,
            ingresosMiembros: updatedIngresos,
            titularIngresadoEvento: true,
            fechaUltimaModificacion: new Date()
          }
        : {
            id: generateId(),
            idSocioTitular: socioEncontrado.numeroSocio,
            nombreSocioTitular: `${socioEncontrado.nombre} ${socioEncontrado.apellido}`,
            fecha: todayISO,
            listaInvitadosDiarios: [],
            estado: EstadoSolicitudInvitados.PROCESADA,
            fechaCreacion: new Date(),
            fechaUltimaModificacion: new Date(),
            titularIngresadoEvento: true,
            ingresosMiembros: [member.dni]
          };
      
      try {
        const savedSolicitud = await addOrUpdateSolicitudInvitadosDiarios(dataToSave);
        setSolicitudInvitadosDiariosHoySocioBuscado(savedSolicitud);
      } catch (error) {
        console.error("Error updating member entry status:", error);
        toast({ title: "Error de Base de Datos", description: "No se pudo registrar el ingreso en la base de datos.", variant: "destructive" });
        return;
      }
    }

    toast({
      title: puedeIngresar ? 'Ingreso Registrado' : 'Acceso Denegado',
      description: `${mensajeIngreso}${mensajeAdvertenciaApto}`,
      variant: puedeIngresar ? (mensajeAdvertenciaApto.includes('ADVERTENCIA') && aptoStatus.status !== 'No Aplica' && aptoStatus.status !== 'Válido' ? 'default' : 'default') : 'destructive',
      duration: (mensajeAdvertenciaApto.includes('ADVERTENCIA') && aptoStatus.status !== 'No Aplica' && aptoStatus.status !== 'Válido') || !puedeIngresar ? 7000 : 5000,
    });
  };

  const handleAnularIngreso = async (member: DisplayablePerson) => {
    if (!solicitudInvitadosDiariosHoySocioBuscado) return;

    const updatedIngresos = solicitudInvitadosDiariosHoySocioBuscado.ingresosMiembros?.filter(dni => dni !== member.dni) || [];
    const dataToSave: SolicitudInvitadosDiarios = {
        ...solicitudInvitadosDiariosHoySocioBuscado,
        ingresosMiembros: updatedIngresos,
        fechaUltimaModificacion: new Date()
    };
    
    try {
        const savedSolicitud = await addOrUpdateSolicitudInvitadosDiarios(dataToSave);
        setSolicitudInvitadosDiariosHoySocioBuscado(savedSolicitud);
        toast({
          title: 'Ingreso Anulado',
          description: `Se anuló el registro de ingreso para ${member.nombreCompleto}.`,
          variant: 'default',
        });
    } catch (error) {
        console.error("Error updating member entry status:", error);
        toast({ title: "Error de Base de Datos", description: "No se pudo anular el ingreso en la base de datos.", variant: "destructive" });
    }
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
    
    if (checked) {
      const cupoActual = invitadosDiariosSocioBuscado.reduce((count, inv) => {
        const isChecked = invitadosCumpleanosCheckboxState[inv.dni];
        if (isChecked === true) return count + 1;
        if (isChecked === false) return count;
        if (inv.esDeCumpleanos && inv.ingresado) return count + 1;
        return count;
      }, 0);
      
      if(cupoActual >= cupoTotalInvitadosCumple) {
        toast({ title: "Cupo Excedido", description: "Se ha alcanzado el límite de invitados de cumpleaños para este grupo familiar hoy.", variant: "destructive" });
        return;
      }
    }

    setInvitadosCumpleanosCheckboxState(prev => ({...prev, [invitadoDni]: checked}));
     if (!checked) {
      setMetodosPagoSeleccionados(prev => ({...prev, [invitadoDni]: null }));
    }
  };

  const handleRegistrarIngresoInvitado = async (invitadoDni: string) => {
    if (!solicitudInvitadosDiariosHoySocioBuscado) {
      toast({ title: "Error", description: "No hay una lista de invitados diarios activa.", variant: "destructive" });
      return;
    }
    const invitadoOriginal = solicitudInvitadosDiariosHoySocioBuscado.listaInvitadosDiarios.find(inv => inv.dni === invitadoDni);

    if (!invitadoOriginal) {
        toast({ title: "Error", description: "No se encontró al invitado para registrar el ingreso.", variant: "destructive" });
        return;
    }

    if (!eventoHabilitadoPorIngresoFamiliar) {
        toast({ title: 'Acceso Denegado', description: 'Un miembro responsable (titular, familiar o adherente) debe registrar su ingreso primero.', variant: 'destructive' });
        return;
    }
    
    const esDeCumpleanosSeleccionado = !!invitadosCumpleanosCheckboxState[invitadoDni];
    
    if (!invitadoOriginal.ingresado && esDeCumpleanosSeleccionado) {
        const cupoUtilizadoAntesDeEste = invitadosDiariosSocioBuscado.reduce((count, inv) => {
            const isChecked = invitadosCumpleanosCheckboxState[inv.dni];
            if (isChecked === true) return count + 1;
            if (isChecked === false) return count;
            if (inv.esDeCumpleanos && inv.ingresado) return count + 1;
            return count;
        }, 0);

        if (cupoUtilizadoAntesDeEste >= cupoTotalInvitadosCumple) {
            toast({ title: "Cupo Excedido", description: "Se ha alcanzado el límite de invitados de cumpleaños para este grupo familiar hoy.", variant: "destructive" });
            return;
        }
    }

    if (!invitadoOriginal.ingresado) {
        let esMenorDeTresSinCosto = false;
        if (invitadoOriginal.fechaNacimiento && isValid(new Date(invitadoOriginal.fechaNacimiento))) {
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

    const nuevoEstadoIngreso = !invitadoOriginal.ingresado;

    let esMenorDeTresParaPago = false;
    if (invitadoOriginal.fechaNacimiento && isValid(new Date(invitadoOriginal.fechaNacimiento))) {
        const edad = differenceInYears(new Date(), new Date(invitadoOriginal.fechaNacimiento));
        if (edad < 3) esMenorDeTresParaPago = true;
    }

    const invitadoActualizado = {
        ...invitadoOriginal,
        ingresado: nuevoEstadoIngreso,
        esDeCumpleanos: esDeCumpleanosSeleccionado,
        metodoPago: nuevoEstadoIngreso ? (esDeCumpleanosSeleccionado || esMenorDeTresParaPago ? null : metodosPagoSeleccionados[invitadoDni]) : invitadoOriginal.metodoPago
    };

    try {
        const updatedSolicitud = {
            ...solicitudInvitadosDiariosHoySocioBuscado,
            listaInvitadosDiarios: solicitudInvitadosDiariosHoySocioBuscado.listaInvitadosDiarios.map(inv => inv.dni === invitadoDni ? invitadoActualizado : inv) as InvitadoDiario[],
        };
        await updateSolicitudInvitadosDiarios(updatedSolicitud);
        setInvitadosDiariosSocioBuscado(updatedSolicitud.listaInvitadosDiarios);
        setSolicitudInvitadosDiariosHoySocioBuscado(updatedSolicitud);
        
        toast({
            title: `Ingreso Invitado ${nuevoEstadoIngreso ? 'Registrado' : 'Anulado'}`,
            description: `${invitadoActualizado.nombre} ${invitadoActualizado.apellido} ha sido ${nuevoEstadoIngreso ? 'marcado como ingresado' : 'desmarcado'}.`,
        });

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
    const yaIngreso = solicitudInvitadosDiariosHoySocioBuscado?.ingresosMiembros?.includes(person.dni);

    if (person.isTitular || person.isFamiliar) {
        statusBadge = <Badge variant={socioEncontrado?.estadoSocio === 'Activo' ? 'default' : 'destructive'} className={socioEncontrado?.estadoSocio === 'Activo' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}>{socioEncontrado?.estadoSocio}</Badge>;
        aptoMedicoDisplay = (
            <div className={`p-2 rounded-md text-xs ${aptoStatus.colorClass.replace('text-', 'text-').replace('bg-', 'bg-opacity-10 ')} border ${aptoStatus.colorClass.replace('text-', 'border-')}`}>
                <span className="font-medium">Apto Médico (Obs.): ${aptoStatus.status}.</span> ${aptoStatus.message}.
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
                <span className="font-medium">Apto Médico (Adh.): ${aptoStatus.status}.</span> ${aptoStatus.message}.
            </div>
        );
        puedeIngresarIndividualmente = socioEncontrado?.estadoSocio === 'Activo' && person.estadoAdherente === 'Activo';
        cardBorderClass = (socioEncontrado?.estadoSocio === 'Activo' && person.estadoAdherente === 'Activo') ? 'border-green-300' : 'border-red-300';
        if (socioEncontrado?.estadoSocio === 'Activo' && person.estadoAdherente === 'Activo' && aptoStatus.status !== 'Válido' && aptoStatus.status !== 'No Aplica') {
             cardBorderClass = 'border-orange-300';
        }
    }

    const fotoToShow = person.fotoUrl || `https://placehold.co/60x60.png`;

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
            {yaIngreso ? (
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
          <CardDescription>Busque cualquier socio, familiar o adherente por su DNI, Nombre, Apellido o N° de Socio (del titular).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder="Buscar por DNI, Nombre o N° Socio de cualquier miembro"
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
                              Socio Titular: {socioEncontrado.nombre} {socioEncontrado.apellido} (N°: {socioEncontrado.numeroSocio})
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
                            Utilizado hoy: {cupoUtilizado}. Disponibles: {Math.max(0, cupoTotalInvitadosCumple - cupoUtilizado)}.
                        </p>
                      ) : (
                         <p className="text-sm text-blue-600 bg-blue-100 p-2 rounded-md mb-3">
                            <Info className="inline mr-1 h-4 w-4" /> Este grupo familiar no tiene cumpleañeros hoy, por lo que no aplica el cupo especial de invitados de cumpleaños.
                        </p>
                      )}
                      {!eventoHabilitadoPorIngresoFamiliar && (
                          <p className="text-sm text-orange-600 bg-orange-100 p-2 rounded-md mb-3">
                              <ShieldAlert className="inline mr-1 h-4 w-4" /> Un miembro responsable (titular, familiar o adherente) debe registrar su ingreso primero para habilitar el registro de invitados diarios.
                          </p>
                      )}
                       {eventoHabilitadoPorIngresoFamiliar && (
                          <p className="text-sm text-green-600 bg-green-100 p-2 rounded-md mb-3">
                              <UserCheck className="inline mr-1 h-4 w-4" /> Un miembro responsable ya registró su ingreso. Puede proceder con los invitados diarios.
                          </p>
                      )}
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                        {invitadosDiariosSocioBuscado.map(invitado => {
                          let esMenorDeTres = false;
                          if (isValid(invitado.fechaNacimiento)) {
                            const edad = differenceInYears(new Date(), invitado.fechaNacimiento);
                            if (edad < 3) {
                              esMenorDeTres = true;
                            }
                          }
                          const cupoAlcanzado = cupoUtilizado >= cupoTotalInvitadosCumple;
                          const isCurrentlyChecked = !!invitadosCumpleanosCheckboxState[invitado.dni];
                          const checkboxCumpleDisabled = hoyEsFechaRestringida || countCumpleanerosEnGrupo === 0 || (cupoAlcanzado && !isCurrentlyChecked);

                          return (
                            <Card key={invitado.dni} className={`p-3 ${invitado.ingresado ? 'bg-green-500/10' : 'bg-card'}`}>
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                 <div className="flex-1">
                                   <div className="flex items-center justify-between">
                                      <p className="font-medium text-sm flex items-center">
                                        {invitado.nombre} {invitado.apellido}
                                        {esMenorDeTres && <Baby className="ml-2 h-4 w-4 text-purple-500" />}
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
                                    {!invitado.ingresado && eventoHabilitadoPorIngresoFamiliar && !esMenorDeTres && (
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
                                    {!invitado.ingresado && eventoHabilitadoPorIngresoFamiliar && !esMenorDeTres && !invitadosCumpleanosCheckboxState[invitado.dni] && (
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
                                     onClick={() => handleRegistrarIngresoInvitado(invitado.dni)}
                                     disabled={
                                       !eventoHabilitadoPorIngresoFamiliar ||
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
