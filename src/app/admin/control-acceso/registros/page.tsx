'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarIcon, Users, Search } from 'lucide-react';
import { getRegistrosAccesoPorFecha } from '@/lib/firebase/firestoreService';
import type { RegistroAcceso } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const TIPO_PERSONA_OPTIONS = ['Todos', 'Titular', 'Familiar', 'Adherente', 'Invitado Diario'];

function RegistrosIngresoDashboard() {
  const [date, setDate] = useState<Date>(new Date());
  const [tipoPersonaFilter, setTipoPersonaFilter] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { data: registros, isLoading, error } = useQuery({
    queryKey: ['registrosAcceso', format(date, 'yyyy-MM-dd')],
    queryFn: () => getRegistrosAccesoPorFecha(date),
  });

  const filteredRegistros = registros?.filter(r => {
    // Filtro por tipo
    let matchesTipo = true;
    if (tipoPersonaFilter !== 'Todos') {
      if (tipoPersonaFilter === 'Invitado Diario') {
        matchesTipo = r.personaTipo === 'invitado';
      } else {
        matchesTipo = r.personaTipo.toLowerCase() === tipoPersonaFilter.toLowerCase();
      }
    }

    // Filtro por búsqueda (Número de Socio, Nombre, Apellido o DNI)
    const searchLow = searchTerm.toLowerCase().trim();
    let matchesSearch = true;
    if (searchLow) {
      matchesSearch = 
        r.socioTitularNumero.toLowerCase().includes(searchLow) ||
        r.personaNombre.toLowerCase().includes(searchLow) ||
        (r as any).personaApellido?.toLowerCase().includes(searchLow) ||
        r.personaDNI.includes(searchLow);
    }

    return matchesTipo && matchesSearch;
  });

  const stats = filteredRegistros?.reduce((acc, r) => {
    if (r.personaTipo === 'invitado') {
      acc.invitados++;
    } else {
      acc.socios++;
    }
    return acc;
  }, { socios: 0, invitados: 0 }) || { socios: 0, invitados: 0 };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Socios Ingresados</p>
              <h3 className="text-2xl font-bold text-orange-900">{stats.socios}</h3>
            </div>
            <div className="bg-orange-100 p-2 rounded-full">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Invitados Ingresados</p>
              <h3 className="text-2xl font-bold text-blue-900">{stats.invitados}</h3>
            </div>
            <div className="bg-blue-100 p-2 rounded-full">
              <Search className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Ingresos</p>
              <h3 className="text-2xl font-bold text-green-900">{stats.socios + stats.invitados}</h3>
            </div>
            <div className="bg-green-100 p-2 rounded-full">
              <CalendarIcon className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex-1">
                  <CardTitle className="flex items-center"><Users className="mr-2" />Detalle de Ingresos</CardTitle>
                  <CardDescription>
                    {date ? format(date, "EEEE d 'de' MMMM", { locale: es }) : 'Registros del día'}
                  </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <Input 
                  placeholder="Buscar por N° Socio, DNI o Nombre..." 
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-[250px]"
                />
                <Select value={tipoPersonaFilter} onValueChange={setTipoPersonaFilter}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        {TIPO_PERSONA_OPTIONS.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => setDate(d || new Date())}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Cargando registros...</p>
        ) : error ? (
          <p className="text-red-500">Error al cargar los registros: {(error as any).message}</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Hora Ingreso</TableHead>
                  <TableHead>N° Socio Titular</TableHead>
                  <TableHead>Registrado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistros && filteredRegistros.length > 0 ? (
                  filteredRegistros.map((registro) => (
                    <TableRow key={registro.id}>
                      <TableCell className="font-medium">
                        {registro.personaNombre} {(registro as any).personaApellido || ''}
                      </TableCell>
                      <TableCell>{registro.personaDNI}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{registro.personaTipo}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{format(registro.fecha, 'HH:mm:ss')}</TableCell>
                      <TableCell className="font-bold">{registro.socioTitularNumero}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{registro.registradoPorEmail}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No se encontraron registros que coincidan con los filtros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      </Card>
    </div>
  );
}

export default function RegistrosIngresoPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <RegistrosIngresoDashboard />
    </RoleGuard>
  );
}