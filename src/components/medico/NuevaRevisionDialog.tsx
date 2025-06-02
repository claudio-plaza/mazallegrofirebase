
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import type { Socio, RevisionMedica, AptoMedicoInfo, Adherente, MiembroFamiliar } from '@/types';
import { formatDate, getAptoMedicoStatus, generateId } from '@/lib/helpers';
import { addDays, format, formatISO, parseISO, differenceInYears, isValid, subYears } from 'date-fns';
import { CheckCircle2, Search, User, XCircle, CalendarDays, Check, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Label } from '@/components/ui/label'; 
import { Card } from '@/components/ui/card'; 
import { siteConfig } from '@/config/site';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const revisionSchema = z.object({
  fechaRevision: z.date({ required_error: 'La fecha de revisión es obligatoria.' }),
  resultado: z.enum(['Apto', 'No Apto'], { required_error: 'El resultado es obligatorio.' }),
  observaciones: z.string().optional(),
});

type RevisionFormValues = z.infer<typeof revisionSchema>;

interface SearchedPerson {
  id: string; 
  nombreCompleto: string;
  fechaNacimiento: string | Date;
  tipo: 'Socio Titular' | 'Familiar' | 'Adherente';
  socioTitularId?: string; 
  aptoMedicoActual?: AptoMedicoInfo;
}

interface NuevaRevisionDialogProps {
  onRevisionGuardada: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NuevaRevisionDialog({ onRevisionGuardada, open: controlledOpen, onOpenChange: controlledOnOpenChange }: NuevaRevisionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const onOpenChange = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen;

  const [searchTerm, setSearchTerm] = useState('');
  const [searchedPerson, setSearchedPerson] = useState<SearchedPerson | null>(null);
  const [searchMessage, setSearchMessage] = useState('');
  const { toast } = useToast();
  const { userName: medicoName } = useAuth(); 
  const [isUnderThree, setIsUnderThree] = useState(false);
  const [maxRevisionDate, setMaxRevisionDate] = useState<string>('');
  const [minRevisionDate, setMinRevisionDate] = useState<string>('');

  useEffect(() => {
    setMaxRevisionDate(format(new Date(), 'yyyy-MM-dd'));
    setMinRevisionDate(format(subYears(new Date(), 1), 'yyyy-MM-dd'));
  }, []);

  const form = useForm<RevisionFormValues>({
    resolver: zodResolver(revisionSchema),
    defaultValues: {
      fechaRevision: new Date(),
      resultado: undefined,
      observaciones: '',
    },
  });

  useEffect(() => {
    if (searchedPerson?.fechaNacimiento) {
      const birthDate = typeof searchedPerson.fechaNacimiento === 'string' ? parseISO(searchedPerson.fechaNacimiento) : searchedPerson.fechaNacimiento;
      if (isValid(birthDate)) {
        const age = differenceInYears(new Date(), birthDate);
        setIsUnderThree(age < 3);
      } else {
        setIsUnderThree(false);
      }
    } else {
      setIsUnderThree(false);
    }
  }, [searchedPerson]);


  const handleSearchSocio = () => {
    if (!searchTerm.trim()) {
      setSearchMessage('Ingrese N° Socio, DNI, Nombre o Apellido.');
      setSearchedPerson(null);
      return;
    }
    const storedSocios = localStorage.getItem('sociosDB');
    if (storedSocios) {
      const socios: Socio[] = JSON.parse(storedSocios);
      const term = searchTerm.trim().toLowerCase();
      let personFound: SearchedPerson | null = null;

      for (const socio of socios) {
        if (socio.numeroSocio.toLowerCase() === term || socio.dni.toLowerCase() === term || `${socio.nombre.toLowerCase()} ${socio.apellido.toLowerCase()}`.includes(term)) {
          personFound = {
            id: socio.numeroSocio, 
            nombreCompleto: `${socio.nombre} ${socio.apellido}`,
            fechaNacimiento: socio.fechaNacimiento,
            tipo: 'Socio Titular',
            aptoMedicoActual: socio.aptoMedico
          };
          break;
        }
        const familiarFound = socio.grupoFamiliar?.find(f => f.dni.toLowerCase() === term || `${f.nombre.toLowerCase()} ${f.apellido.toLowerCase()}`.includes(term));
        if (familiarFound) {
          personFound = {
            id: familiarFound.dni, 
            nombreCompleto: `${familiarFound.nombre} ${familiarFound.apellido}`,
            fechaNacimiento: familiarFound.fechaNacimiento,
            tipo: 'Familiar',
            socioTitularId: socio.numeroSocio,
            aptoMedicoActual: familiarFound.aptoMedico
          };
          break;
        }
        const adherenteFound = socio.adherentes?.find(a => a.dni.toLowerCase() === term || `${a.nombre.toLowerCase()} ${a.apellido.toLowerCase()}`.includes(term));
        if (adherenteFound) {
           personFound = {
            id: adherenteFound.dni, 
            nombreCompleto: `${adherenteFound.nombre} ${adherenteFound.apellido}`,
            fechaNacimiento: adherenteFound.fechaNacimiento,
            tipo: 'Adherente',
            socioTitularId: socio.numeroSocio,
            aptoMedicoActual: adherenteFound.aptoMedico
          };
          break;
        }
      }

      if (personFound) {
        setSearchedPerson(personFound);
        setSearchMessage('');
        form.reset({ fechaRevision: new Date(), resultado: undefined, observaciones: '' });
      } else {
        setSearchedPerson(null);
        setSearchMessage('Persona no encontrada (Socio, Familiar o Adherente).');
      }
    } else {
      setSearchedPerson(null);
      setSearchMessage('No hay socios en la base de datos local.');
    }
  };
  
  const onSubmit = (data: RevisionFormValues) => {
    if (!searchedPerson) {
      toast({ title: 'Error', description: 'Debe seleccionar una persona.', variant: 'destructive' });
      return;
    }
    if (isUnderThree) {
      toast({ title: 'Acción no permitida', description: 'No se puede registrar revisión médica para menores de 3 años.', variant: 'destructive' });
      return;
    }

    const nuevaRevision: RevisionMedica = {
      id: generateId(),
      fechaRevision: formatISO(data.fechaRevision),
      socioId: searchedPerson.id, 
      socioNombre: searchedPerson.nombreCompleto,
      resultado: data.resultado as 'Apto' | 'No Apto',
      observaciones: data.observaciones,
      medicoResponsable: medicoName || `Médico ${siteConfig.name}`,
    };

    const aptoMedicoUpdate: AptoMedicoInfo = {
      valido: data.resultado === 'Apto',
      fechaEmision: formatISO(data.fechaRevision),
      observaciones: data.observaciones,
    };

    if (data.resultado === 'Apto') {
      aptoMedicoUpdate.fechaVencimiento = formatISO(addDays(data.fechaRevision, 14)); 
      nuevaRevision.fechaVencimientoApto = aptoMedicoUpdate.fechaVencimiento;
    } else {
       aptoMedicoUpdate.razonInvalidez = 'No Apto según última revisión';
       aptoMedicoUpdate.fechaVencimiento = undefined; 
    }

    const storedSocios = localStorage.getItem('sociosDB');
    if (storedSocios) {
      let socios: Socio[] = JSON.parse(storedSocios);
      socios = socios.map(s => {
        if (searchedPerson.tipo === 'Socio Titular' && s.numeroSocio === searchedPerson.id) {
          return { ...s, aptoMedico: aptoMedicoUpdate, ultimaRevisionMedica: formatISO(data.fechaRevision) };
        }
        if ((searchedPerson.tipo === 'Familiar' || searchedPerson.tipo === 'Adherente') && s.numeroSocio === searchedPerson.socioTitularId) {
          return {
            ...s,
            grupoFamiliar: s.grupoFamiliar?.map(f => f.dni === searchedPerson.id ? { ...f, aptoMedico: aptoMedicoUpdate } : f),
            adherentes: s.adherentes?.map(a => a.dni === searchedPerson.id ? { ...a, aptoMedico: aptoMedicoUpdate } : a),
          };
        }
        return s;
      });
      localStorage.setItem('sociosDB', JSON.stringify(socios));
    }

    const storedRevisiones = localStorage.getItem('revisionesDB');
    let revisiones: RevisionMedica[] = storedRevisiones ? JSON.parse(storedRevisiones) : [];
    revisiones.unshift(nuevaRevision); 
    localStorage.setItem('revisionesDB', JSON.stringify(revisiones));
    
    window.dispatchEvent(new Event('sociosDBUpdated'));
    toast({ title: 'Revisión Guardada', description: `La revisión para ${searchedPerson.nombreCompleto} ha sido guardada.` });
    onRevisionGuardada();
    form.reset({ fechaRevision: new Date(), resultado: undefined, observaciones: '' });
    setSearchedPerson(null);
    setSearchTerm('');
    onOpenChange(false);
  };

  const currentPersonAptoStatus = searchedPerson ? getAptoMedicoStatus(searchedPerson.aptoMedicoActual, searchedPerson.fechaNacimiento) : null;

  useEffect(() => {
    if (!open) {
      form.reset({ fechaRevision: new Date(), resultado: undefined, observaciones: '' });
      setSearchedPerson(null);
      setSearchTerm('');
      setSearchMessage('');
      setIsUnderThree(false);
    }
  }, [open, form]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><CheckCircle2 className="mr-2 h-4 w-4" /> Nueva Revisión</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <CalendarDays className="mr-2 h-6 w-6 text-primary" />
            Registrar Nueva Revisión Médica
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            Busca un socio, familiar o adherente y registra el resultado. El apto físico será válido por 15 días, incluyendo el día de la revisión. Menores de 3 años no requieren revisión.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4 pb-2">
          <div>
            <Label htmlFor="searchSocio" className="text-sm font-medium">Buscar Persona (N° Socio, DNI, Nombre o Apellido)</Label>
            <div className="flex gap-2 items-center mt-1">
                <Input 
                    id="searchSocio" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Ej: S00123, 30123456 o Juan Pérez"
                    className="flex-grow"
                />
                <Button onClick={handleSearchSocio} type="button" variant="outline" size="icon" className="shrink-0"><Search className="h-4 w-4" /></Button>
            </div>
          </div>
          {searchMessage && <p className="text-sm text-destructive">{searchMessage}</p>}

          {searchedPerson && (
            <Card className="p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm">{searchedPerson.nombreCompleto} ({searchedPerson.tipo})</h4>
              </div>
              {currentPersonAptoStatus && (
                <p className={`text-xs ${currentPersonAptoStatus.colorClass.replace('bg-', 'text-').replace('-100', '-500')}`}>
                  Apto actual: {currentPersonAptoStatus.status} - {currentPersonAptoStatus.message}
                </p>
              )}
            </Card>
          )}
        </div>

        {isUnderThree && searchedPerson && (
          <Alert variant="default" className="bg-blue-500/10 border-blue-500/30 text-blue-700">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertTitle>Menor de 3 Años</AlertTitle>
            <AlertDescription>
              {searchedPerson.nombreCompleto} es menor de 3 años. No se requiere ni se puede registrar una revisión médica.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <fieldset disabled={isUnderThree || !searchedPerson}>
              <FormField
                control={form.control}
                name="fechaRevision"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Fecha de Revisión</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          type="date"
                          value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                          onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)}
                          max={maxRevisionDate}
                          min={minRevisionDate}
                          className="w-full pl-10"
                          disabled={!maxRevisionDate || !minRevisionDate}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resultado"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">Resultado de la Revisión</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Apto" id="apto" />
                          </FormControl>
                          <Label htmlFor="apto" className="font-normal flex items-center cursor-pointer">
                            <Check className="mr-1 h-4 w-4 text-green-600" />Apto
                          </Label>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="No Apto" id="no-apto"/>
                          </FormControl>
                          <Label htmlFor="no-apto" className="font-normal flex items-center cursor-pointer">
                            <X className="mr-1 h-4 w-4 text-red-600" />No Apto
                          </Label>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observaciones"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Observaciones</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Añade notas sobre la revisión (ej: reposo deportivo por 7 días, apto con preexistencia X, etc.)" 
                        {...field} 
                        className="min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>
            <DialogFooter className="pt-2">
              <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={!searchedPerson || form.formState.isSubmitting || isUnderThree}>
                {form.formState.isSubmitting ? "Guardando..." : "Guardar Revisión"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
