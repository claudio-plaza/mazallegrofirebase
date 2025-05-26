
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
import type { Socio, RevisionMedica, AptoMedicoInfo } from '@/types';
import { formatDate, getAptoMedicoStatus, generateId } from '@/lib/helpers';
import { addDays, format, formatISO, parseISO } from 'date-fns';
import { CheckCircle2, Search, User, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Label } from '@/components/ui/label'; // Added Label import
import { Card } from '@/components/ui/card'; // Added Card import

const revisionSchema = z.object({
  fechaRevision: z.date({ required_error: 'La fecha de revisión es obligatoria.' }),
  resultado: z.enum(['Apto', 'No Apto'], { required_error: 'El resultado es obligatorio.' }),
  observaciones: z.string().optional(),
});

type RevisionFormValues = z.infer<typeof revisionSchema>;

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
  const [searchedSocio, setSearchedSocio] = useState<Socio | null>(null);
  const [searchMessage, setSearchMessage] = useState('');
  const { toast } = useToast();
  const { userName: medicoName } = useAuth(); // Get logged-in medic's name

  const form = useForm<RevisionFormValues>({
    resolver: zodResolver(revisionSchema),
    defaultValues: {
      fechaRevision: new Date(),
      resultado: undefined,
      observaciones: '',
    },
  });

  const handleSearchSocio = () => {
    if (!searchTerm.trim()) {
      setSearchMessage('Ingrese un N° Socio o DNI.');
      setSearchedSocio(null);
      return;
    }
    const storedSocios = localStorage.getItem('sociosDB');
    if (storedSocios) {
      const socios: Socio[] = JSON.parse(storedSocios);
      const socioFound = socios.find(s => s.numeroSocio === searchTerm.trim() || s.dni === searchTerm.trim());
      if (socioFound) {
        setSearchedSocio(socioFound);
        setSearchMessage('');
      } else {
        setSearchedSocio(null);
        setSearchMessage('Socio no encontrado.');
      }
    } else {
      setSearchedSocio(null);
      setSearchMessage('No hay socios en la base de datos local.');
    }
  };
  
  const onSubmit = (data: RevisionFormValues) => {
    if (!searchedSocio) {
      toast({ title: 'Error', description: 'Debe seleccionar un socio.', variant: 'destructive' });
      return;
    }

    const nuevaRevision: RevisionMedica = {
      id: generateId(),
      fechaRevision: formatISO(data.fechaRevision),
      socioId: searchedSocio.numeroSocio,
      socioNombre: `${searchedSocio.nombre} ${searchedSocio.apellido}`,
      resultado: data.resultado as 'Apto' | 'No Apto',
      observaciones: data.observaciones,
      medicoResponsable: medicoName || 'Médico ClubZenith',
    };

    const aptoMedicoUpdate: AptoMedicoInfo = {
      valido: data.resultado === 'Apto',
      fechaEmision: formatISO(data.fechaRevision),
      observaciones: data.observaciones,
    };

    if (data.resultado === 'Apto') {
      aptoMedicoUpdate.fechaVencimiento = formatISO(addDays(data.fechaRevision, 14)); // Válido por 15 días, se guarda último día válido
      nuevaRevision.fechaVencimientoApto = aptoMedicoUpdate.fechaVencimiento;
    } else {
       aptoMedicoUpdate.razonInvalidez = 'No Apto según última revisión';
       aptoMedicoUpdate.fechaVencimiento = undefined; // O la fecha de revisión si se quiere marcar el día que dejó de ser apto
    }

    // Update localStorage
    const storedSocios = localStorage.getItem('sociosDB');
    if (storedSocios) {
      let socios: Socio[] = JSON.parse(storedSocios);
      socios = socios.map(s => 
        s.id === searchedSocio.id 
        ? { ...s, aptoMedico: aptoMedicoUpdate, ultimaRevisionMedica: formatISO(data.fechaRevision) } 
        : s
      );
      localStorage.setItem('sociosDB', JSON.stringify(socios));
    }

    const storedRevisiones = localStorage.getItem('revisionesDB');
    let revisiones: RevisionMedica[] = storedRevisiones ? JSON.parse(storedRevisiones) : [];
    revisiones.unshift(nuevaRevision); // Add to beginning
    localStorage.setItem('revisionesDB', JSON.stringify(revisiones));
    
    window.dispatchEvent(new Event('sociosDBUpdated'));
    toast({ title: 'Revisión Guardada', description: `La revisión para ${searchedSocio.nombre} ${searchedSocio.apellido} ha sido guardada.` });
    onRevisionGuardada();
    form.reset({ fechaRevision: new Date(), resultado: undefined, observaciones: '' });
    setSearchedSocio(null);
    setSearchTerm('');
    onOpenChange(false);
  };

  const currentSocioAptoStatus = searchedSocio ? getAptoMedicoStatus(searchedSocio.aptoMedico) : null;

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset({ fechaRevision: new Date(), resultado: undefined, observaciones: '' });
      setSearchedSocio(null);
      setSearchTerm('');
      setSearchMessage('');
    }
  }, [open, form]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><CheckCircle2 className="mr-2 h-4 w-4" /> Nueva Revisión</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Revisión Médica</DialogTitle>
          <DialogDescription>Registre una nueva revisión médica para un socio.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex gap-2 items-end">
            <div className="flex-grow">
              <Label htmlFor="searchSocio">Buscar Socio (N° Socio o DNI)</Label>
              <Input 
                id="searchSocio" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ej: 1001 o 12345678"
              />
            </div>
            <Button onClick={handleSearchSocio} type="button"><Search className="mr-2 h-4 w-4" /> Buscar</Button>
          </div>
          {searchMessage && <p className="text-sm text-destructive">{searchMessage}</p>}

          {searchedSocio && (
            <Card className="p-4 bg-muted/50">
              <div className="flex items-center gap-3 mb-2">
                <User className="h-5 w-5 text-primary" />
                <h4 className="font-semibold">{searchedSocio.nombre} {searchedSocio.apellido} (N°: {searchedSocio.numeroSocio})</h4>
              </div>
              {currentSocioAptoStatus && (
                <p className={`text-sm ${currentSocioAptoStatus.colorClass.replace('bg-', 'text-')}`}>
                  Apto actual: {currentSocioAptoStatus.status} - {currentSocioAptoStatus.message}
                </p>
              )}
            </Card>
          )}
        </div>

        {searchedSocio && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="fechaRevision"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Revisión</FormLabel>
                    <FormControl>
                       <Input
                        type="date"
                        value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                        onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)}
                        className="w-full"
                        max={format(new Date(), 'yyyy-MM-dd')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resultado"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Resultado de la Revisión</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Apto" />
                          </FormControl>
                          <FormLabel className="font-normal flex items-center"><CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />Apto</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="No Apto" />
                          </FormControl>
                          <FormLabel className="font-normal flex items-center"><XCircle className="mr-2 h-4 w-4 text-red-500" />No Apto</FormLabel>
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
                    <FormLabel>Observaciones</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Detalles adicionales de la revisión..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button type="submit" disabled={!searchedSocio || form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Guardando..." : "Guardar Revisión"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

    