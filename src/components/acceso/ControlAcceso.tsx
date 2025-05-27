
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Socio, MiembroFamiliar, AptoMedicoInfo, SolicitudCumpleanos, InvitadoCumpleanos } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, UserCircle, ShieldCheck, ShieldAlert, CheckCircle, XCircle, User, Users, LogIn, Ticket, ChevronDown, Cake, ListFilter, UserCheck, CalendarDays, Info } from 'lucide-react';
import { formatDate, getAptoMedicoStatus } from '@/lib/helpers';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { format, isToday, parseISO } from 'date-fns';


type DisplayableMember = {
  id: string;
  nombreCompleto: string;
  dni: string;
  fotoUrl?: string;
  aptoMedico?: AptoMedicoInfo;
  estadoSocio?: Socio['estadoSocio'];
  relacion?: string;
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
  const [titularIngresadoHoyEventoSocioBuscado, setTitularIngresadoHoyEventoSocioBuscado] = useState(false);

  const [festejosDelDia, setFestejosDelDia] = useState<FestejoHoy[]>([]);
  const [loadingFestejos, setLoadingFestejos] = useState(true);
  const [expandedFestejoId, setExpandedFestejoId] = useState<string | null>(null);


  const loadFestejosDelDia = useCallback(() => {
    setLoadingFestejos(true);
    const storedCumpleanos = localStorage.getItem('cumpleanosDB');
    const storedSocios = localStorage.getItem('sociosDB');
    let todosSocios: Socio[] = [];
    if (storedSocios) {
        todosSocios = JSON.parse(storedSocios);
    }

    if (storedCumpleanos) {
      const todasSolicitudes: SolicitudCumpleanos[] = JSON.parse(storedCumpleanos);
      const festejosHoy = todasSolicitudes.filter(sol =>
        isToday(parseISO(sol.fechaEvento as unknown as string)) &&
        sol.estado === 'Aprobada'
      ).map(festejo => {
        const titularDelFestejo = todosSocios.find(s => s.numeroSocio === festejo.idSocioTitular);
        return {
            ...festejo,
            socioTitularNombreCompleto: titularDelFestejo ? `${titularDelFestejo.nombre} ${titularDelFestejo.apellido}` : 'Socio no encontrado',
            listaInvitados: festejo.listaInvitados.map(inv => ({ ...inv, id: inv.dni }))
        };
      });
      setFestejosDelDia(festejosHoy);
    }
    setLoadingFestejos(false);
  }, []);

  useEffect(() => {
    loadFestejosDelDia();
    window.addEventListener('cumpleanosDBUpdated', loadFestejosDelDia);
    window.addEventListener('sociosDBUpdated', loadFestejosDelDia); // Festejos pueden depender de nombres de socios
    return () => {
      window.removeEventListener('cumpleanosDBUpdated', loadFestejosDelDia);
      window.removeEventListener('sociosDBUpdated', loadFestejosDelDia);
    };
  }, [loadFestejosDelDia]);


  const handleSearch = useCallback(() => {
    if (!searchTerm.trim()) {
      setMensajeBusqueda('Por favor, ingrese un N° Socio, DNI o Nombre para buscar.');
      setSocioEncontrado(null);
      setSolicitudCumpleanosHoySocioBuscado(null);
      setInvitadosCumpleanosSocioBuscado([]);
      setTitularIngresadoHoyEventoSocioBuscado(false);
      setAccordionValue(undefined);
      return;
    }
    setLoading(true);
    setSocioEncontrado(null);
    setSolicitudCumpleanosHoySocioBuscado(null);
    setInvitadosCumpleanosSocioBuscado([]);
    setTitularIngresadoHoyEventoSocioBuscado(false);
    setAccordionValue(undefined);

    const storedSocios = localStorage.getItem('sociosDB');
    if (storedSocios) {
      const socios: Socio[] = JSON.parse(storedSocios);
      const searchTermLower = searchTerm.trim().toLowerCase();
      const socio = socios.find(s =>
        `${s.nombre.toLowerCase()} ${s.apellido.toLowerCase()}`.includes(searchTermLower) ||
        s.numeroSocio === searchTerm.trim() ||
        s.dni === searchTerm.trim() ||
        s.nombre.toLowerCase().includes(searchTermLower) ||
        s.apellido.toLowerCase().includes(searchTermLower)
      );
      if (socio) {
        setSocioEncontrado(socio);
        setMensajeBusqueda('');
        setAccordionValue("socio-info");

        const storedCumpleanos = localStorage.getItem('cumpleanosDB');
        if (storedCumpleanos) {
          const todasSolicitudes: SolicitudCumpleanos[] = JSON.parse(storedCumpleanos);
          const solicitudHoy = todasSolicitudes.find(sol =>
            sol.idSocioTitular === socio.numeroSocio &&
            isToday(parseISO(sol.fechaEvento as unknown as string)) &&
            sol.estado === 'Aprobada'
          );
          if (solicitudHoy) {
            setSolicitudCumpleanosHoySocioBuscado(solicitudHoy);
            setInvitadosCumpleanosSocioBuscado(solicitudHoy.listaInvitados.map(inv => ({...inv, id: inv.dni })));
            setTitularIngresadoHoyEventoSocioBuscado(solicitudHoy.titularIngresadoEvento || false);
          }
        }

      } else {
        setMensajeBusqueda('Socio no encontrado.');
      }
    } else {
      setMensajeBusqueda('No hay datos de socios disponibles.');
    }
    setLoading(false);
  }, [searchTerm]);

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  useEffect(() => {
    const handleDBUpdates = () => {
      if (socioEncontrado) {
          handleSearch();
      }
      loadFestejosDelDia(); // Recargar festejos del día también
    };
    window.addEventListener('sociosDBUpdated', handleDBUpdates);
    window.addEventListener('cumpleanosDBUpdated', handleDBUpdates);
    return () => {
      window.removeEventListener('sociosDBUpdated', handleDBUpdates);
      window.removeEventListener('cumpleanosDBUpdated', handleDBUpdates);
    };
  }, [socioEncontrado, handleSearch, loadFestejosDelDia]);

  const handleVerCarnet = (nombre: string) => {
    toast({
      title: 'Carnet Digital',
      description: `Mostrando carnet digital de ${nombre} (Simulado - QR próximamente).`,
    });
  };

  const handleRegistrarIngresoSocioOFamiliar = (member: DisplayableMember) => {
     if (socioEncontrado?.estadoSocio === 'Activo') {
      toast({
        title: 'Ingreso Registrado (Socio/Familiar)',
        description: `Acceso permitido para ${member.nombreCompleto}. Observación Apto Médico: ${getAptoMedicoStatus(member.aptoMedico).status}.`,
        variant: 'default',
      });

      if (member.id === socioEncontrado.id && solicitudCumpleanosHoySocioBuscado && !titularIngresadoHoyEventoSocioBuscado) {
        setTitularIngresadoHoyEventoSocioBuscado(true);
        const updatedSolicitud = {...solicitudCumpleanosHoySocioBuscado, titularIngresadoEvento: true};
        setSolicitudCumpleanosHoySocioBuscado(updatedSolicitud);
        
        const todasSolicitudes: SolicitudCumpleanos[] = JSON.parse(localStorage.getItem('cumpleanosDB') || '[]');
        const index = todasSolicitudes.findIndex(s => s.id === updatedSolicitud.id);
        if (index > -1) {
            todasSolicitudes[index] = updatedSolicitud;
            localStorage.setItem('cumpleanosDB', JSON.stringify(todasSolicitudes));
            window.dispatchEvent(new Event('cumpleanosDBUpdated'));
        }
      }
    } else {
      toast({
        title: 'Acceso Denegado',
        description: `No se puede registrar ingreso. El socio titular ${socioEncontrado?.nombre} ${socioEncontrado?.apellido} se encuentra ${socioEncontrado?.estadoSocio}.`,
        variant: 'destructive',
      });
    }
  };

  const handleRegistrarIngresoInvitado = (invitadoDni: string, festejoId: string) => {
    let targetFestejo: SolicitudCumpleanos | FestejoHoy | null = null;
    let setTargetFestejo: Function | null = null;
    let targetInvitados: InvitadoCumpleanos[] = [];
    let setTargetInvitados: Function | null = null;
    let targetTitularIngresado: boolean = false;

    if (solicitudCumpleanosHoySocioBuscado && solicitudCumpleanosHoySocioBuscado.id === festejoId) {
        targetFestejo = solicitudCumpleanosHoySocioBuscado;
        setTargetFestejo = setSolicitudCumpleanosHoySocioBuscado;
        targetInvitados = invitadosCumpleanosSocioBuscado;
        setTargetInvitados = setInvitadosCumpleanosSocioBuscado;
        targetTitularIngresado = titularIngresadoHoyEventoSocioBuscado;
    } else {
        const generalFestejo = festejosDelDia.find(f => f.id === festejoId);
        if (generalFestejo) {
            targetFestejo = generalFestejo;
            // For general festejos, we need to update them in the festejosDelDia list directly
            targetInvitados = generalFestejo.listaInvitados;
            targetTitularIngresado = generalFestejo.titularIngresadoEvento || false;
        }
    }
    
    if (!targetFestejo) return;

    if (!targetTitularIngresado) {
      toast({
        title: 'Acceso Denegado (Invitado)',
        description: 'El socio titular del evento debe registrar su ingreso primero para que los invitados puedan acceder.',
        variant: 'destructive',
      });
      return;
    }

    const updatedInvitados = targetInvitados.map(inv =>
        inv.dni === invitadoDni ? { ...inv, ingresado: !inv.ingresado } : inv
    );

    if (setTargetInvitados) setTargetInvitados(updatedInvitados);

    const invitado = updatedInvitados.find(inv => inv.dni === invitadoDni);
    toast({
        title: `Ingreso Invitado ${invitado?.ingresado ? 'Registrado' : 'Anulado'}`,
        description: `${invitado?.nombre} ${invitado?.apellido} (${invitado?.dni}) ha sido ${invitado?.ingresado ? 'marcado como ingresado' : 'desmarcado'}.`,
    });

    const updatedFestejo = { ...targetFestejo, listaInvitados: updatedInvitados };
    if (setTargetFestejo) setTargetFestejo(updatedFestejo);

    const todasSolicitudes: SolicitudCumpleanos[] = JSON.parse(localStorage.getItem('cumpleanosDB') || '[]');
    const index = todasSolicitudes.findIndex(s => s.id === updatedFestejo.id);
    if (index > -1) {
        todasSolicitudes[index] = updatedFestejo;
        localStorage.setItem('cumpleanosDB', JSON.stringify(todasSolicitudes));
        window.dispatchEvent(new Event('cumpleanosDBUpdated')); // This will also trigger reload of festejosDelDia
    }
  };


  const displayableMembers: DisplayableMember[] = [];
  if (socioEncontrado) {
    displayableMembers.push({
      id: socioEncontrado.id,
      nombreCompleto: `${socioEncontrado.nombre} ${socioEncontrado.apellido}`,
      dni: socioEncontrado.dni,
      fotoUrl: socioEncontrado.fotoUrl || `https://placehold.co/60x60.png?text=${socioEncontrado.nombre[0]}${socioEncontrado.apellido[0]}`,
      aptoMedico: socioEncontrado.aptoMedico,
      estadoSocio: socioEncontrado.estadoSocio,
      relacion: 'Titular',
    });
    socioEncontrado.grupoFamiliar?.forEach(fam => {
      let fotoFamiliar = `https://placehold.co/60x60.png?text=${fam.nombre[0]}${fam.apellido[0]}`;
      if (fam.fotoPerfil && fam.fotoPerfil.length > 0 && fam.fotoPerfil[0] instanceof File) {
         fotoFamiliar = URL.createObjectURL(fam.fotoPerfil[0]);
      } else if (typeof fam.fotoPerfil === 'string') {
         fotoFamiliar = fam.fotoPerfil;
      }

      displayableMembers.push({
        id: fam.id || fam.dni,
        nombreCompleto: `${fam.nombre} ${fam.apellido}`,
        dni: fam.dni,
        fotoUrl: fotoFamiliar,
        aptoMedico: fam.aptoMedico,
        relacion: fam.relacion,
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
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="mr-2 h-4 w-4" /> {loading ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>

          {mensajeBusqueda && <p className="text-sm text-center text-muted-foreground">{mensajeBusqueda}</p>}

          {loading && (
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
                              <div className="text-xs text-muted-foreground mt-1">Apto Médico Titular (Obs.): {getAptoMedicoStatus(socioEncontrado.aptoMedico).status}.</div>
                          </div>
                      </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-0">
                  <div className="border-t border-border px-4 py-4">
                      <p className="text-xs text-muted-foreground mb-4 text-center">Verifique el estado individual y registre el ingreso de cada miembro. El ingreso general depende del estado del socio titular.</p>
                      <div className="space-y-4">
                      {displayableMembers.map((member) => {
                          const aptoStatus = getAptoMedicoStatus(member.aptoMedico);
                          const esTitular = member.relacion === 'Titular';
                          const fotoMember = member.fotoUrl || `https://placehold.co/60x60.png?text=${member.nombreCompleto[0]}${member.nombreCompleto.split(' ')[1]?.[0] || ''}`;
                          
                          return (
                          <Card key={member.id} className={`p-4 ${socioEncontrado.estadoSocio === 'Activo' ? 'border-green-300' : 'border-red-300'} bg-card shadow-sm`}>
                              <div className="flex flex-col sm:flex-row items-center gap-4">
                              <Avatar className="h-16 w-16 border-2 border-muted">
                                  <AvatarImage src={fotoMember} alt={member.nombreCompleto} data-ai-hint="member photo"/>
                                  <AvatarFallback className="text-xl">
                                  {member.nombreCompleto.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 text-center sm:text-left">
                                <div className="font-semibold text-lg text-foreground flex items-center">
                                  {member.nombreCompleto}
                                  <Badge variant="outline" className="ml-2 align-middle">{member.relacion}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">DNI: {member.dni}</p>
                                {esTitular && (
                                  <div className="text-sm text-muted-foreground">
                                    N° Socio: {socioEncontrado.numeroSocio} | Estado: <Badge variant={socioEncontrado.estadoSocio === 'Activo' ? 'default' : 'destructive'} className={socioEncontrado.estadoSocio === 'Activo' ? 'bg-green-600' : 'bg-red-600'}>{socioEncontrado.estadoSocio}</Badge>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2 items-center sm:items-stretch pt-2 sm:pt-0">
                                  <Button variant="outline" size="sm" onClick={() => handleVerCarnet(member.nombreCompleto)} className="w-full sm:w-auto">
                                  <Ticket className="mr-2 h-4 w-4" /> Ver Carnet
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleRegistrarIngresoSocioOFamiliar(member)}
                                    className="w-full sm:w-auto"
                                    disabled={socioEncontrado.estadoSocio !== 'Activo'}
                                  >
                                  <LogIn className="mr-2 h-4 w-4" /> Registrar Ingreso Socio/Familiar
                                  </Button>
                              </div>
                              </div>
                              <Separator className="my-3" />
                              <div className={`p-2 rounded-md text-xs ${aptoStatus.colorClass.replace('text-', 'text-').replace('bg-', 'bg-opacity-10 ')} border ${aptoStatus.colorClass.replace('text-', 'border-')}`}>
                              <span className="font-medium">Apto Médico (Obs.): {aptoStatus.status}.</span> {aptoStatus.message}.
                              </div>
                          </Card>
                          );
                      })}
                      </div>
                  </div>
                  
                  {solicitudCumpleanosHoySocioBuscado && (
                    <div className="border-t border-border px-4 py-4 mt-6">
                      <h4 className="text-lg font-semibold mb-3 flex items-center">
                          <Cake className="mr-2 h-5 w-5 text-pink-500" />
                          Invitados Cumpleaños (Hoy: {formatDate(solicitudCumpleanosHoySocioBuscado.fechaEvento as unknown as string)})
                      </h4>
                      {!titularIngresadoHoyEventoSocioBuscado && (
                          <p className="text-sm text-orange-600 bg-orange-100 p-2 rounded-md mb-3">
                              <ShieldAlert className="inline mr-1 h-4 w-4" /> El socio titular ({socioEncontrado.nombre} {socioEncontrado.apellido}) debe registrar su ingreso primero para habilitar el registro de invitados.
                          </p>
                      )}
                       {titularIngresadoHoyEventoSocioBuscado && (
                          <p className="text-sm text-green-600 bg-green-100 p-2 rounded-md mb-3">
                              <UserCheck className="inline mr-1 h-4 w-4" /> El socio titular ya registró su ingreso para el evento. Puede proceder con los invitados.
                          </p>
                      )}
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {invitadosCumpleanosSocioBuscado.map(invitado => (
                          <Card key={invitado.dni} className={`p-3 ${invitado.ingresado ? 'bg-green-50' : 'bg-card'}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{invitado.nombre} {invitado.apellido}</p>
                                <p className="text-xs text-muted-foreground">DNI: {invitado.dni}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                 <Checkbox
                                   id={`guest-socio-${invitado.dni}`}
                                   checked={invitado.ingresado}
                                   onCheckedChange={() => handleRegistrarIngresoInvitado(invitado.dni, solicitudCumpleanosHoySocioBuscado!.id)}
                                   disabled={!titularIngresadoHoyEventoSocioBuscado}
                                 />
                                 <Label htmlFor={`guest-socio-${invitado.dni}`} className="text-xs cursor-pointer">
                                  {invitado.ingresado ? "Ingresado" : "Marcar Ingreso"}
                                 </Label>
                              </div>
                            </div>
                          </Card>
                        ))}
                        {invitadosCumpleanosSocioBuscado.length === 0 && <p className="text-sm text-muted-foreground">No hay invitados registrados para este evento del socio buscado.</p>}
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
                                        {festejo.titularIngresadoEvento ? "Titular Ingresó" : "Titular Pendiente"}
                                    </Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-0">
                                <div className="border-t border-border px-3 py-3">
                                    {!festejo.titularIngresadoEvento && (
                                        <p className="text-xs text-orange-500 bg-orange-500/10 p-2 rounded-md mb-2">
                                            <Info className="inline mr-1 h-3 w-3" /> El socio titular de este evento aún no ha registrado su ingreso. Los invitados no pueden ingresar hasta que el titular lo haga.
                                        </p>
                                    )}
                                    <h5 className="text-xs font-medium text-muted-foreground mb-2">Invitados:</h5>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {festejo.listaInvitados.map(invitado => (
                                            <Card key={invitado.dni} className={`p-2 text-xs ${invitado.ingresado ? 'bg-green-500/10' : 'bg-card'}`}>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium">{invitado.nombre} {invitado.apellido}</p>
                                                        <p className="text-muted-foreground">DNI: {invitado.dni}</p>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`guest-general-${festejo.id}-${invitado.dni}`}
                                                            checked={invitado.ingresado}
                                                            onCheckedChange={() => handleRegistrarIngresoInvitado(invitado.dni, festejo.id)}
                                                            disabled={!festejo.titularIngresadoEvento}
                                                        />
                                                        <Label htmlFor={`guest-general-${festejo.id}-${invitado.dni}`} className="text-xs cursor-pointer">
                                                            {invitado.ingresado ? "Ingresó" : "Marcar"}
                                                        </Label>
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
