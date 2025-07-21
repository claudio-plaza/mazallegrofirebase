
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
import { addSocio, uploadFile } from './firebase/firestoreService';

export const loginUser = async (email: string, passwordInput: string) => {
  try {
    if (!auth) throw new Error("Auth service not initialized.");
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
    if (!auth) throw new Error("Auth service not initialized.");
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const user = userCredential.user;
    await updateProfile(user, {
        displayName: `${data.nombre} ${data.apellido}`
    });

    const uploadAndGetUrl = async (file: File | null | undefined, pathSuffix: string): Promise<string | null> => {
        if (file instanceof File) {
            return uploadFile(file, `socios/${user.uid}/${pathSuffix}`);
        }
        return null;
    };

    const [fotoPerfilUrl, fotoDniFrenteUrl, fotoDniDorsoUrl, fotoCarnetUrl] = await Promise.all([
        uploadAndGetUrl(data.fotoPerfil, 'fotoPerfil.jpg'),
        uploadAndGetUrl(data.fotoDniFrente, 'fotoDniFrente.jpg'),
        uploadAndGetUrl(data.fotoDniDorso, 'fotoDniDorso.jpg'),
        uploadAndGetUrl(data.fotoCarnet, 'fotoCarnet.jpg'),
    ]);

    const socioData = {
      email: data.email,
      nombre: data.nombre,
      apellido: data.apellido,
      fechaNacimiento: data.fechaNacimiento,
      dni: data.dni,
      empresa: data.empresa,
      telefono: data.telefono,
      direccion: data.direccion,
      fotoUrl: fotoPerfilUrl,
      fotoPerfil: fotoPerfilUrl,
      fotoDniFrente: fotoDniFrenteUrl,
      fotoDniDorso: fotoDniDorsoUrl,
      fotoCarnet: fotoCarnetUrl,
      grupoFamiliar: [],
    };
    
    await addSocio(user.uid, socioData, true);

    return user;
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
    if (!auth) throw new Error("Auth service not initialized.");
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
