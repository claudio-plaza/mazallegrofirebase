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
import { Calendar as CalendarIcon, Users } from 'lucide-react';
import { getRegistrosAccesoPorFecha } from '@/lib/firebase/firestoreService';
import type { RegistroAcceso } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const TIPO_PERSONA_OPTIONS = ['Todos', 'Titular', 'Familiar', 'Adherente', 'Invitado Diario'];

function RegistrosIngresoDashboard() {
  const [date, setDate] = useState<Date>(new Date());
  const [tipoPersonaFilter, setTipoPersonaFilter] = useState<string>('Todos');

  const { data: registros, isLoading, error } = useQuery({
    queryKey: ['registrosAcceso', format(date, 'yyyy-MM-dd')],
    queryFn: () => getRegistrosAccesoPorFecha(date),
  });

  const filteredRegistros = registros?.filter(r => {
    if (tipoPersonaFilter === 'Todos') return true;
    // El tipo 'invitado' en el registro de acceso corresponde a 'Invitado Diario' en el filtro
    if (tipoPersonaFilter === 'Invitado Diario' && r.personaTipo === 'invitado') return true;
    return r.personaTipo === tipoPersonaFilter;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle className="flex items-center"><Users className="mr-2" />Registro de Ingresos Diarios</CardTitle>
                <CardDescription>Lista de todas las personas que han ingresado al club.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Select value={tipoPersonaFilter} onValueChange={setTipoPersonaFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar por tipo" />
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
                        "w-[280px] justify-start text-left font-normal",
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
          <p className="text-red-500">Error al cargar los registros: {error.message}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
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
                    <TableCell className="font-medium">{registro.personaNombre}</TableCell>
                    <TableCell>{registro.personaDNI}</TableCell>
                    <TableCell><Badge variant="outline">{registro.personaTipo}</Badge></TableCell>
                    <TableCell>{format(registro.fecha, 'HH:mm:ss')}</TableCell>
                    <TableCell>{registro.socioTitularNumero}</TableCell>
                    <TableCell>{registro.registradoPorEmail}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No se encontraron registros para la fecha seleccionada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function RegistrosIngresoPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <RegistrosIngresoDashboard />
    </RoleGuard>
  );
}