
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ShieldAlert } from 'lucide-react';

interface EliminarCuentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EliminarCuentaDialog({ open, onOpenChange }: EliminarCuentaDialogProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user || !user.email) {
      toast.error("Error", { description: "No se pudo verificar tu identidad. Por favor, inicia sesión de nuevo." });
      return;
    }
    if (!password) {
      toast.warning("Debes ingresar tu contraseña para confirmar.");
      return;
    }

    setIsDeleting(true);

    try {
      // 1. Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      toast.info("Identidad verificada. Procediendo con la eliminación...");

      // 2. Call the Cloud Function
      const functions = getFunctions();
      const deleteSocioAccount = httpsCallable(functions, 'deleteSocioAccount');
      await deleteSocioAccount();

      toast.success("Tu cuenta ha sido eliminada permanentemente.");
      
      // 3. Logout and redirect
      await logout();
      router.push('/');
      router.refresh();

    } catch (error: any) {
      console.error("Error deleting account:", error);
      if (error.code === 'auth/wrong-password') {
        toast.error("Contraseña incorrecta.", { description: "La contraseña que ingresaste no es correcta. Inténtalo de nuevo." });
      } else if (error.code === 'functions/internal') {
        toast.error("Error del servidor.", { description: "No se pudo completar la eliminación de la cuenta. Contacta a administración." });
      } else {
        toast.error("Ocurrió un error.", { description: "No se pudo completar el proceso de eliminación." });
      }
    } finally {
      setIsDeleting(false);
      setPassword('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-destructive flex items-center">
            <ShieldAlert className="mr-2 h-6 w-6" />
            ¿Estás seguro?
          </DialogTitle>
          <DialogDescription>
            Esta acción es irreversible. Todos tus datos serán eliminados permanentemente.
          </DialogDescription>
        </DialogHeader>
        
        <Alert variant="destructive" className="my-4">
          <AlertTitle className="font-bold">¡Atención!</AlertTitle>
          <AlertDescription>
            Para confirmar la eliminación permanente de tu cuenta, por favor, ingresa tu contraseña actual.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="password-confirm">Contraseña</Label>
          <Input
            id="password-confirm"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingresa tu contraseña"
            disabled={isDeleting}
          />
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteAccount}
            disabled={!password || isDeleting}
          >
            {isDeleting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Eliminando...</>
            ) : (
              'Entiendo, eliminar mi cuenta'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
