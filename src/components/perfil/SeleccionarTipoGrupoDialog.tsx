'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Heart, Users } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectTipo: (tipo: 'conyugeEHijos' | 'padresMadres') => void;
}

export function SeleccionarTipoGrupoDialog({ open, onClose, onSelectTipo }: Props) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Seleccionar Tipo de Grupo Familiar</DialogTitle>
          <DialogDescription>
            Elige el tipo de grupo familiar que deseas registrar. Esta selección será permanente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Button
            onClick={() => onSelectTipo('conyugeEHijos')}
            variant="outline"
            className="h-auto py-6 flex flex-col items-center justify-center gap-3 hover:bg-primary/10 hover:border-primary"
          >
            <Heart className="h-12 w-12 text-red-500" />
            <div className="text-center">
              <p className="font-semibold text-lg">Cónyuge e Hijos/as</p>
              <p className="text-xs text-muted-foreground">
                Registra los datos de tu cónyuge y/o hijos
              </p>
            </div>
          </Button>

          <Button
            onClick={() => onSelectTipo('padresMadres')}
            variant="outline"
            className="h-auto py-6 flex flex-col items-center justify-center gap-3 hover:bg-primary/10 hover:border-primary"
          >
            <Users className="h-12 w-12 text-blue-600" />
            <div className="text-center">
              <p className="font-semibold text-lg">Padres/Madres</p>
              <p className="text-xs text-muted-foreground">
                Registra los datos de tus padres o madres
              </p>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
