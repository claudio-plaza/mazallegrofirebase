'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Socio } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, UserCircle, ShieldCheck, ShieldAlert, CheckCircle, XCircle, User } from 'lucide-react';
import { formatDate, getAptoMedicoStatus } from '@/lib/helpers';
import { Skeleton } from '@/components/ui/skeleton';

export function ControlAcceso() {
  const [searchTerm, setSearchTerm] = useState('');
  const [socioEncontrado, setSocioEncontrado] = useState<Socio | null>(null);
  const [mensajeBusqueda, setMensajeBusqueda] = useState('');
  const [loading, setLoading] = useState(false); // For search operation

  const handleSearch = useCallback(() => {
    if (!searchTerm.trim()) {
      setMensajeBusqueda('Por favor, ingrese un N° Socio o DNI para buscar.');
      setSocioEncontrado(null);
      return;
    }
    setLoading(true);
    setSocioEncontrado(null); // Clear previous result
    const storedSocios = localStorage.getItem('sociosDB');
    if (storedSocios) {
      const socios: Socio[] = JSON.parse(storedSocios);
      const socio = socios.find(s => s.numeroSocio === searchTerm.trim() || s.dni === searchTerm.trim());
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

  // Allow Enter key to trigger search
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  // Listen for DB updates to refresh socio data if one is displayed
  useEffect(() => {
    const handleSociosDBUpdate = () => {
      if (socioEncontrado) {
         // Re-fetch the currently displayed socio to get latest data
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


  let accesoPermitido = false;
  let mensajeAcceso = '';
  let aptoStatus = null;

  if (socioEncontrado) {
    aptoStatus = getAptoMedicoStatus(socioEncontrado.aptoMedico);
    const socioActivo = socioEncontrado.estadoSocio === 'Activo';
    const aptoValido = aptoStatus.status === 'Válido';

    if (socioActivo && aptoValido) {
      accesoPermitido = true;
      mensajeAcceso = 'Socio activo y con apto médico vigente.';
    } else if (!socioActivo) {
      mensajeAcceso = `Socio se encuentra ${socioEncontrado.estadoSocio}.`;
    } else { // socioActivo but !aptoValido
      mensajeAcceso = `Apto médico ${aptoStatus.status.toLowerCase()}: ${aptoStatus.message}.`;
    }
  }

  const fotoSocio = socioEncontrado?.fotoUrl || `https://placehold.co/150x150.png?text=${socioEncontrado?.nombre[0] || 'S'}${socioEncontrado?.apellido[0] || 'N'}`;

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center"><ShieldCheck className="mr-3 h-7 w-7 text-primary" /> Control de Acceso</CardTitle>
        <CardDescription>Verifique el estado de un socio para permitir o denegar el acceso.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="N° Socio o DNI"
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
          <div className="pt-6 border-t">
            <div className="flex flex-col items-center sm:flex-row sm:space-x-6 mb-6">
              <Avatar className="h-28 w-28 border-4 border-primary shadow-md">
                <AvatarImage src={fotoSocio} alt={`${socioEncontrado.nombre} ${socioEncontrado.apellido}`} data-ai-hint="member photo" />
                <AvatarFallback className="text-3xl">
                    {socioEncontrado.nombre[0]}{socioEncontrado.apellido[0]}
                </AvatarFallback>
              </Avatar>
              <div className="mt-4 sm:mt-0 text-center sm:text-left">
                <h3 className="text-2xl font-semibold text-foreground">{socioEncontrado.nombre} {socioEncontrado.apellido}</h3>
                <p className="text-muted-foreground">N° Socio: <span className="font-medium text-foreground">{socioEncontrado.numeroSocio}</span></p>
                <p className="text-muted-foreground">DNI: <span className="font-medium text-foreground">{socioEncontrado.dni}</span></p>
              </div>
            </div>

            <div className="space-y-4">
              <div className={`p-4 rounded-md border ${socioEncontrado.estadoSocio === 'Activo' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Estado del Socio</h4>
                <div className="flex items-center">
                  {socioEncontrado.estadoSocio === 'Activo' ? <User className="h-5 w-5 mr-2 text-green-600" /> : <UserCircle className="h-5 w-5 mr-2 text-red-600" />}
                  <Badge variant={socioEncontrado.estadoSocio === 'Activo' ? 'default' : 'destructive'} className={socioEncontrado.estadoSocio === 'Activo' ? 'bg-green-600' : 'bg-red-600'}>
                    {socioEncontrado.estadoSocio}
                  </Badge>
                </div>
              </div>

              {aptoStatus && (
                 <div className={`p-4 rounded-md border ${aptoStatus.colorClass.includes('green') ? 'border-green-500 bg-green-50' : aptoStatus.colorClass.includes('orange') ? 'border-orange-500 bg-orange-50' : 'border-red-500 bg-red-50'}`}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Apto Médico</h4>
                  <div className="flex items-center">
                     {aptoStatus.status === 'Válido' ? <ShieldCheck className="h-5 w-5 mr-2 text-green-600" /> : <ShieldAlert className="h-5 w-5 mr-2 text-red-600" />}
                     <Badge variant="outline" className={`${aptoStatus.colorClass} border-current`}>
                        {aptoStatus.status}
                     </Badge>
                  </div>
                  <p className={`text-xs mt-1 ${aptoStatus.colorClass.replace('bg-', 'text-')}`}>{aptoStatus.message}</p>
                </div>
              )}
            </div>

            <div className={`mt-8 p-6 rounded-lg text-center ${accesoPermitido ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500'} border`}>
              {accesoPermitido ? (
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              ) : (
                <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              )}
              <h3 className={`text-3xl font-bold ${accesoPermitido ? 'text-green-700' : 'text-red-700'}`}>
                ACCESO {accesoPermitido ? 'PERMITIDO' : 'DENEGADO'}
              </h3>
              <p className={`mt-2 text-sm ${accesoPermitido ? 'text-green-600' : 'text-red-600'}`}>
                {mensajeAcceso}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
