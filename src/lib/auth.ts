
'use client';

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth } from './firebase/config';
import type { SignupTitularData } from '@/types';
import { toast } from '@/hooks/use-toast';

export const loginUser = async (email: string, passwordInput: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, passwordInput);
    return userCredential.user;
  } catch (error: any) {
    console.error("Firebase login error:", error);
    toast({
      title: 'Error de Inicio de Sesión',
      description: 'Email o contraseña incorrectos. Por favor, intente de nuevo.',
      variant: 'destructive',
    });
    return null;
  }
};

export const signupUser = async (data: SignupTitularData) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
    // Update Firebase Auth user's display name
    await updateProfile(userCredential.user, {
        displayName: `${data.nombre} ${data.apellido}`
    });
    return userCredential.user;
  } catch (error: any) {
    console.error("Firebase signup error:", error);
    let description = 'Ocurrió un error inesperado al crear la cuenta.';
    if (error.code === 'auth/email-already-in-use') {
        description = 'El email ingresado ya está en uso. Por favor, utilice otro.';
    }
    toast({
      title: 'Error de Registro',
      description: description,
      variant: 'destructive',
    });
    return null;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    toast({
      title: 'Error',
      description: 'No se pudo cerrar la sesión.',
      variant: 'destructive',
    });
  }
};
