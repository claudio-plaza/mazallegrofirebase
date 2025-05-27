
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Socio, MiembroFamiliar, AptoMedicoInfo } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, UserCircle, ShieldCheck, ShieldAlert, CheckCircle, XCircle, User, Users, LogIn, Ticket, ChevronDown } from 'lucide-react';
import { formatDate, getAptoMedicoStatus } from '@/lib/helpers';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// Helper type for displaying member info consistently
type DisplayableMember = {
  id: string;
  nombreCompleto: string;
  dni: string;
  fotoUrl?: string;
  aptoMedico?: AptoMedicoInfo;
  estadoSocio?: Socio['estadoSocio']; // Solo relevante para el titular en esta estructura
  relacion?: string;
};

export function ControlAcceso() {
  const [searchTerm, setSearchTerm] = useState('');
  const [socioEncontrado, setSocioEncontrado] = useState<Socio | null>(null);
  const [mensajeBusqueda, setMensajeBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [accordionValue, setAccordionValue] = useState<string | undefined>(undefined);

  const handleSearch = useCallback(() => {
    if (!searchTerm.trim()) {
      setMensajeBusqueda('Por favor, ingrese un N° Socio, DNI o Nombre para buscar.');
      setSocioEncontrado(null);
      setAccordionValue(undefined);
      return;
    }
    setLoading(true);
    setSocioEncontrado(null);
    setAccordionValue(undefined);
    const storedSocios = localStorage.getItem('sociosDB');
    if (storedSocios) {
      const socios: Socio[] = JSON.parse(storedSocios);
      const searchTermLower = searchTerm.trim().toLowerCase();
      const socio = socios.find(s =>
        s.numeroSocio === searchTerm.trim() ||
        s.dni === searchTerm.trim() ||
        `${s.nombre.toLowerCase()} ${s.apellido.toLowerCase()}`.includes(searchTermLower) ||
        s.nombre.toLowerCase().includes(searchTermLower) ||
        s.apellido.toLowerCase().includes(searchTermLower)
      );
      if (socio) {
        setSocioEncontrado(socio);
        setMensajeBusqueda('');
        setAccordionValue("socio-info"); 
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
    const handleSociosDBUpdate = () => {
      if (socioEncontrado) {
        const storedSocios = localStorage.getItem('sociosDB');
        if (storedSocios) {
          const socios: Socio[] = JSON.parse(storedSocios);
          const updatedSocio = socios.find(s => s.id === socioEncontrado.id);
          setSocioEncontrado(updatedSocio || null);
        }
      }
    };
    window.addEventListener('sociosDBUpdated', handleSociosDBUpdate);
    return () => {
      window.removeEventListener('sociosDBUpdated', handleSociosDBUpdate);
    };
  }, [socioEncontrado]);

  const handleVerCarnet = (nombre: string) => {
    toast({
      title: 'Carnet Digital',
      description: `Mostrando carnet digital de ${nombre} (Simulado - QR próximamente).`,
    });
  };

  const handleRegistrarIngreso = (member: DisplayableMember) => {
    const aptoStatus = getAptoMedicoStatus(member.aptoMedico);
    // El ingreso SÓLO depende del estado del socio titular.
    const socioTitularActivo = socioEncontrado?.estadoSocio === 'Activo';

    if (socioTitularActivo) {
      toast({
        title: 'Ingreso Registrado',
        description: `Acceso permitido para ${member.nombreCompleto}. Observación Apto Médico: ${aptoStatus.status} (${aptoStatus.message}).`,
        variant: 'default',
      });
    } else {
      toast({
        title: 'Acceso Denegado',
        description: `No se puede registrar ingreso. El socio titular ${socioEncontrado?.nombre} ${socioEncontrado?.apellido} se encuentra ${socioEncontrado?.estadoSocio}.`,
        variant: 'destructive',
      });
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
        // estadoSocio no es relevante aquí para el familiar individualmente para el ingreso, depende del titular
      });
    });
  }

  let accesoGeneralPermitido = false;
  let mensajeAccesoGeneral = '';
  let colorClaseAccesoGeneral = 'bg-red-500/10 hover:bg-red-500/20 border-red-500';
  let iconoAccesoGeneral = <XCircle className="h-8 w-8 text-red-600 mr-3" />;
  let textoColorAccesoGeneral = 'text-red-700';


  if (socioEncontrado) {
    const titularAptoStatus = getAptoMedicoStatus(socioEncontrado.aptoMedico);
    const titularActivo = socioEncontrado.estadoSocio === 'Activo';

    if (titularActivo) {
      accesoGeneralPermitido = true;
      mensajeAccesoGeneral = `Socio titular ACTIVO. Observación Apto: ${titularAptoStatus.status}.`;
      colorClaseAccesoGeneral = 'bg-green-500/10 hover:bg-green-500/20 border-green-500';
      iconoAccesoGeneral = <CheckCircle className="h-8 w-8 text-green-600 mr-3" />;
      textoColorAccesoGeneral = 'text-green-700';
    } else {
      mensajeAccesoGeneral = `Socio titular ${socioEncontrado.estadoSocio.toUpperCase()}. Observación Apto: ${titularAptoStatus.status}.`;
      // Colores y icono ya son los de denegado por defecto.
    }
  }

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center"><ShieldCheck className="mr-3 h-7 w-7 text-primary" /> Control de Acceso</CardTitle>
        <CardDescription>Busque un socio titular (por N° Socio, DNI o Nombre) para verificar su estado y el de su grupo familiar. Registre ingresos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="N° Socio, DNI o Nombre del Titular"
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
                            <p className={`text-sm ${accesoGeneralPermitido ? 'text-green-600' : 'text-red-600'}`}>
                            {mensajeAccesoGeneral}
                            </p>
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
                        // Puede ingresar si el socio titular está activo. El borde de la tarjeta refleja esto.
                        const puedeIngresarVisual = socioEncontrado.estadoSocio === 'Activo';

                        return (
                        <Card key={member.id} className={`p-4 ${puedeIngresarVisual ? 'border-green-300' : 'border-red-300'} bg-card shadow-sm`}>
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
                                {esTitular && <p className="text-sm text-muted-foreground">N° Socio: {socioEncontrado.numeroSocio} | Estado: <Badge variant={socioEncontrado.estadoSocio === 'Activo' ? 'default' : 'destructive'} className={socioEncontrado.estadoSocio === 'Activo' ? 'bg-green-600' : 'bg-red-600'}>{socioEncontrado.estadoSocio}</Badge></p>}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 items-center sm:items-stretch pt-2 sm:pt-0">
                                <Button variant="outline" size="sm" onClick={() => handleVerCarnet(member.nombreCompleto)} className="w-full sm:w-auto">
                                <Ticket className="mr-2 h-4 w-4" /> Ver Carnet
                                </Button>
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  onClick={() => handleRegistrarIngreso(member)} 
                                  className="w-full sm:w-auto"
                                  disabled={socioEncontrado.estadoSocio !== 'Activo'} // Deshabilitar si el titular no está activo
                                >
                                <LogIn className="mr-2 h-4 w-4" /> Registrar Ingreso
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

