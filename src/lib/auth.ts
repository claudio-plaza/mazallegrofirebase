'use client';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  deleteUser,
  User
} from 'firebase/auth';
import { auth, db } from './firebase/config'; // Usar config en lugar de clientApp
import type { SignupTitularData } from '@/types';
import { toast } from '@/hooks/use-toast';
import { uploadFile } from './firebase/storageService';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

export const loginUser = async (email: string, passwordInput: string) => {
  try {
    if (!auth) throw new Error("Auth service not initialized.");
    const trimmedEmail = email.trim();
    console.log('DEBUG: Intentando iniciar sesión con el email:', trimmedEmail); // Corregido
    const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, passwordInput);
    return userCredential.user;
  } catch (error: any) {
    console.error("Firebase login error:", error); // Log completo del error

    // Mensaje de error más específico
    let description = 'Email o contraseña incorrectos. Por favor, intente de nuevo.';
    if (error.code) {
      description = `Error: ${error.code}. Por favor, verifique sus credenciales.`;
    }

    toast({
      title: 'Error de Inicio de Sesión',
      description: description,
      variant: 'destructive',
    });
    return null;
  }
};

export const signupUser = async (data: SignupTitularData) => {
  let user: User | null = null; // Definido aquí para que esté disponible en el catch

  try {
    console.log('DEBUG: Iniciando registro...');

    // FIX 2: Normalizar email ANTES de cualquier operación
    const normalizedEmail = data.email.trim().toLowerCase();

    // 1. Crear usuario en Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      normalizedEmail, // Usar email normalizado
      data.password
    );
    user = userCredential.user;
    console.log('✅ Usuario creado en Auth:', user.uid);

    // FIX 3: Bloque try anidado para implementar el rollback
    try {
      // 2. Obtener número de socio
      let numeroSocio = '';
      try {
        console.log('🔄 Obteniendo siguiente número de socio...');
        const functions = getFunctions();
        const getNextNumber = httpsCallable(functions, 'getNextSocioNumber');
        const result: any = await getNextNumber();
        numeroSocio = result.data.numeroSocio;
        console.log('✅ Número de socio obtenido:', numeroSocio);
      } catch (numeroError: any) {
        console.error('❌ Error al obtener número de socio. Se continuará con número vacío.', numeroError);
      }

      // 3. Subir fotos a Storage
      const uploadAndGetUrl = async (file: File | string | null | undefined, fileName: string): Promise<string | null> => {
        if (!(file instanceof File)) return null;
        const path = `socios/${user!.uid}/${fileName}`;
        return await uploadFile(file, path);
      };

      const [fotoPerfil, fotoDniFrente, fotoDniDorso] = await Promise.all([
        uploadAndGetUrl(data.fotoPerfil, 'fotoPerfil.jpg'),
        uploadAndGetUrl(data.fotoDniFrente, 'fotoDniFrente.jpg'),
        uploadAndGetUrl(data.fotoDniDorso, 'fotoDniDorso.jpg'),
      ]);
      console.log('✅ Fotos subidas a Storage');

      // 4. Crear documento en Firestore
      const socioData = {
        id: user.uid,
        email: normalizedEmail, // Usar email normalizado
        nombre: data.nombre.trim(),
        apellido: data.apellido.trim(),
        dni: data.dni.trim(),
        fechaNacimiento: Timestamp.fromDate(data.fechaNacimiento),
        telefono: data.telefono?.trim() || '',
        direccion: data.direccion?.trim() || '',
        empresa: data.empresa?.trim() || '',
        fotoPerfil: fotoPerfil || '',
        fotoDniFrente: fotoDniFrente || '',
        fotoDniDorso: fotoDniDorso || '',
        fotoUrl: fotoPerfil || '',
        numeroSocio: numeroSocio,
        estadoSocio: 'Pendiente',
        grupoFamiliar: [],
        adherentes: [],
        miembroDesde: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        aptoMedico: null,
        documentosCompletos: false, // FIX 1: Añadido
      };

      await setDoc(doc(db, 'socios', user.uid), socioData);
      console.log('✅ Documento de socio creado en Firestore');

      // 5. Crear documento en adminUsers
      const adminUserData = {
        uid: user.uid,
        email: normalizedEmail, // Usar email normalizado
        nombre: data.nombre.trim(),
        apellido: data.apellido.trim(),
        role: 'socio',
        createdAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'adminUsers', user.uid), adminUserData);
      console.log('✅ Documento de adminUsers creado');

    } catch (operationError) {
      console.error('❌ Error durante operaciones post-autenticación. Iniciando rollback...', operationError);
      if (user) {
        await deleteUser(user);
        console.log('🔄 Rollback completado: Usuario eliminado de Auth.');
      }
      // Propagar el error para que el catch externo lo maneje
      throw operationError;
    }

    // 6. Enviar verificación de email (opcional)
    try {
      await sendEmailVerification(user);
      console.log('✅ Email de verificación enviado');
    } catch (emailError) {
      console.warn('⚠️ No se pudo enviar email de verificación:', emailError);
    }

    // 7. Desloguear al usuario para evitar race condition
    await signOut(auth);
    console.log('✅ Usuario deslogueado - debe iniciar sesión manualmente');

    return { success: true, uid: user.uid, requiresLogin: true };

  } catch (error: any) {
    console.error('❌ Error en signup:', error);
    // Propagar el error para que el formulario lo maneje
    throw error;
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

export const sendPasswordReset = async (email: string) => {
  try {
    if (!auth) throw new Error("Auth service not initialized.");
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error: any) {
    console.error("Firebase password reset error:", error);

    let mensajeError = 'No se pudo enviar el correo de restablecimiento. Por favor, intente de nuevo.';

    if (error.code === 'auth/user-not-found') {
      mensajeError = 'No existe ninguna cuenta registrada con este correo electrónico.';
    } else if (error.code === 'auth/invalid-email') {
      mensajeError = 'El formato del correo electrónico no es válido.';
    } else if (error.code === 'auth/too-many-requests') {
      mensajeError = 'Demasiados intentos. Por favor intente más tarde.';
    }

    toast({
      title: 'Error',
      description: mensajeError,
      variant: 'destructive',
    });
    return false;
  }
};