
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Socio, MiembroFamiliar, AptoMedicoInfo } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, UserCircle, ShieldCheck, ShieldAlert, CheckCircle, XCircle, User, Users, LogIn, Ticket } from 'lucide-react';
import { formatDate, getAptoMedicoStatus } from '@/lib/helpers';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

// Helper type for displaying member info consistently
type DisplayableMember = {
  id: string;
  nombreCompleto: string;
  dni: string;
  fotoUrl?: string;
  aptoMedico?: AptoMedicoInfo;
  // For titular, estadoSocio is relevant. For familiares, we assume they are active if titular is.
  // Or we might need a separate 'estado' for familiares if they can be inactive independently.
  // For now, access for familiar depends on titular's 'estadoSocio' AND familiar's own 'aptoMedico'.
  estadoSocio?: Socio['estadoSocio']; // Only for titular
  relacion?: string; // For familiares
};

export function ControlAcceso() {
  const [searchTerm, setSearchTerm] = useState('');
  const [socioEncontrado, setSocioEncontrado] = useState<Socio | null>(null);
  const [mensajeBusqueda, setMensajeBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = useCallback(() => {
    if (!searchTerm.trim()) {
      setMensajeBusqueda('Por favor, ingrese un N° Socio, DNI o Nombre para buscar.');
      setSocioEncontrado(null);
      return;
    }
    setLoading(true);
    setSocioEncontrado(null);
    const storedSocios = localStorage.getItem('sociosDB');
    if (storedSocios) {
      const socios: Socio[] = JSON.parse(storedSocios);
      const searchTermLower = searchTerm.trim().toLowerCase();
      const socio = socios.find(s => 
        s.numeroSocio === searchTerm.trim() || 
        s.dni === searchTerm.trim() ||
        s.nombre.toLowerCase().includes(searchTermLower) ||
        s.apellido.toLowerCase().includes(searchTermLower) ||
        `${s.nombre.toLowerCase()} ${s.apellido.toLowerCase()}`.includes(searchTermLower)
      );
      if (socio) {
        setSocioEncontrado(socio);
        setMensajeBusqueda('');
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
    // En una implementación real, aquí se podría abrir un modal con el carnet o navegar a otra página.
  };

  const handleRegistrarIngreso = (member: DisplayableMember, esTitular: boolean) => {
    const aptoStatus = getAptoMedicoStatus(member.aptoMedico);
    const socioActivo = esTitular ? member.estadoSocio === 'Activo' : socioEncontrado?.estadoSocio === 'Activo'; // Familiares dependen del estado del titular
    const aptoValido = aptoStatus.status === 'Válido';

    if (socioActivo && aptoValido) {
      toast({
        title: 'Ingreso Registrado',
        description: `Acceso permitido y registrado para ${member.nombreCompleto}.`,
        variant: 'default', // Shadcn toast doesn't have 'success' by default
      });
      // Aquí se podría llamar a una API para registrar el ingreso
    } else {
      let motivoDenegado = '';
      if (!socioActivo) {
        motivoDenegado = esTitular ? `Socio se encuentra ${member.estadoSocio}.` : `El socio titular se encuentra ${socioEncontrado?.estadoSocio}.`;
      } else { // !aptoValido
        motivoDenegado = `Apto médico ${aptoStatus.status.toLowerCase()}: ${aptoStatus.message}.`;
      }
      toast({
        title: 'Acceso Denegado',
        description: `No se puede registrar ingreso para ${member.nombreCompleto}. Motivo: ${motivoDenegado}`,
        variant: 'destructive',
      });
    }
  };


  // Prepara los datos del titular y familiares para mostrar
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
      } else if (typeof fam.fotoPerfil === 'string') { // Assuming string means it's a URL already
         fotoFamiliar = fam.fotoPerfil;
      }

      displayableMembers.push({
        id: fam.id || fam.dni, // Usar DNI como fallback si no hay ID
        nombreCompleto: `${fam.nombre} ${fam.apellido}`,
        dni: fam.dni,
        fotoUrl: fotoFamiliar,
        aptoMedico: fam.aptoMedico,
        relacion: fam.relacion,
      });
    });
  }
  
  // Estado general de acceso para el titular (para el mensaje grande)
  let accesoGeneralPermitido = false;
  let mensajeAccesoGeneral = '';
  if (socioEncontrado) {
    const titularAptoStatus = getAptoMedicoStatus(socioEncontrado.aptoMedico);
    const titularActivo = socioEncontrado.estadoSocio === 'Activo';
    const titularAptoValido = titularAptoStatus.status === 'Válido';

    if (titularActivo && titularAptoValido) {
      accesoGeneralPermitido = true;
      mensajeAccesoGeneral = 'Socio titular activo y con apto médico vigente.';
    } else if (!titularActivo) {
      mensajeAccesoGeneral = `Socio titular se encuentra ${socioEncontrado.estadoSocio}.`;
    } else { 
      mensajeAccesoGeneral = `Apto médico del titular ${titularAptoStatus.status.toLowerCase()}: ${titularAptoStatus.message}.`;
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
          <>
            {/* Mensaje General de Acceso del Titular */}
            <div className={`mt-6 p-4 rounded-lg text-center ${accesoGeneralPermitido ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500'} border`}>
              {accesoGeneralPermitido ? (
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
              ) : (
                <XCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
              )}
              <h3 className={`text-2xl font-bold ${accesoGeneralPermitido ? 'text-green-700' : 'text-red-700'}`}>
                TITULAR: ACCESO {accesoGeneralPermitido ? 'GENERALMENTE PERMITIDO' : 'GENERALMENTE RESTRINGIDO'}
              </h3>
              <p className={`mt-1 text-sm ${accesoGeneralPermitido ? 'text-green-600' : 'text-red-600'}`}>
                {mensajeAccesoGeneral}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Verifique el estado individual de cada miembro del grupo familiar antes de registrar su ingreso.</p>
            </div>
            
            <Separator className="my-6" />

            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
              <Users className="mr-3 h-6 w-6 text-primary" />
              Miembros del Grupo Familiar
            </h3>
            
            <div className="space-y-4">
              {displayableMembers.map((member, index) => {
                const aptoStatus = getAptoMedicoStatus(member.aptoMedico);
                const esTitular = member.relacion === 'Titular';
                const fotoMember = member.fotoUrl || `https://placehold.co/60x60.png?text=${member.nombreCompleto[0]}${member.nombreCompleto.split(' ')[1]?.[0] || ''}`;
                const puedeIngresar = (esTitular ? member.estadoSocio === 'Activo' : socioEncontrado.estadoSocio === 'Activo') && aptoStatus.status === 'Válido';

                return (
                  <Card key={member.id} className={`p-4 ${puedeIngresar ? 'border-green-300' : 'border-red-300'} bg-card`}>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <Avatar className="h-16 w-16 border-2 border-muted">
                        <AvatarImage src={fotoMember} alt={member.nombreCompleto} data-ai-hint="member photo" />
                        <AvatarFallback className="text-xl">
                          {member.nombreCompleto.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-center sm:text-left">
                        <p className="font-semibold text-lg text-foreground">{member.nombreCompleto} <Badge variant="outline" className="ml-2">{member.relacion}</Badge></p>
                        <p className="text-sm text-muted-foreground">DNI: {member.dni}</p>
                        {esTitular && <p className="text-sm text-muted-foreground">N° Socio: {socioEncontrado.numeroSocio} | Estado: <Badge variant={socioEncontrado.estadoSocio === 'Activo' ? 'default' : 'destructive'} className={socioEncontrado.estadoSocio === 'Activo' ? 'bg-green-600' : 'bg-red-600'}>{socioEncontrado.estadoSocio}</Badge></p>}
                      </div>
                       <div className="flex flex-col sm:flex-row gap-2 items-center sm:items-stretch pt-2 sm:pt-0">
                        <Button variant="outline" size="sm" onClick={() => handleVerCarnet(member.nombreCompleto)} className="w-full sm:w-auto">
                          <Ticket className="mr-2 h-4 w-4" /> Ver Carnet
                        </Button>
                        <Button variant="default" size="sm" onClick={() => handleRegistrarIngreso(member, esTitular)} className="w-full sm:w-auto">
                          <LogIn className="mr-2 h-4 w-4" /> Registrar Ingreso
                        </Button>
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <div className={`p-2 rounded-md text-xs ${aptoStatus.colorClass.replace('text-', 'text-').replace('bg-', 'bg-opacity-10 ')} border ${aptoStatus.colorClass.replace('text-', 'border-')}`}>
                      <span className="font-medium">Apto Médico: {aptoStatus.status}.</span> {aptoStatus.message}.
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

