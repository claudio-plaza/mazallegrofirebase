
'use client';

import { mockRevisiones, mockSocios } from './mockData';
import { KEYS as FirestoreKeys } from './firebase/firestoreService';
import { formatISO } from 'date-fns';

const formatAptoMedicoToRaw = (apto: any) => {
  if (!apto) return undefined;
  return {
    ...apto,
    fechaEmision: apto.fechaEmision ? formatISO(new Date(apto.fechaEmision)) : undefined,
    fechaVencimiento: apto.fechaVencimiento ? formatISO(new Date(apto.fechaVencimiento)) : undefined,
  };
};

const formatFamiliarToRaw = (familiar: any) => ({
  ...familiar,
  fechaNacimiento: formatISO(new Date(familiar.fechaNacimiento)),
  aptoMedico: formatAptoMedicoToRaw(familiar.aptoMedico),
});

export const initializeDatabases = () => {
  console.log("Initializing mock databases...");
  
  if (typeof window !== 'undefined') {
    // Initialize Socios
    if (!localStorage.getItem(FirestoreKeys.SOCIOS)) {
      const sociosToStore = mockSocios.map(socio => ({
        ...socio,
        fechaNacimiento: formatISO(new Date(socio.fechaNacimiento)),
        miembroDesde: formatISO(new Date(socio.miembroDesde)),
        ultimaRevisionMedica: socio.ultimaRevisionMedica ? formatISO(new Date(socio.ultimaRevisionMedica)) : undefined,
        aptoMedico: formatAptoMedicoToRaw(socio.aptoMedico),
        grupoFamiliar: socio.grupoFamiliar?.map(formatFamiliarToRaw),
        adherentes: socio.adherentes?.map(formatFamiliarToRaw),
      }));
      localStorage.setItem(FirestoreKeys.SOCIOS, JSON.stringify(sociosToStore));
      console.log('Socios DB Initialized.');
    }

    // Initialize Revisiones
    if (!localStorage.getItem(FirestoreKeys.REVISIONES)) {
       const revisionesToStore = mockRevisiones.map(r => ({
          ...r,
          fechaRevision: formatISO(new Date(r.fechaRevision)),
          fechaVencimientoApto: r.fechaVencimientoApto ? formatISO(new Date(r.fechaVencimientoApto)) : undefined,
      }));
       localStorage.setItem(FirestoreKeys.REVISIONES, JSON.stringify(revisionesToStore));
       console.log('Revisiones DB Initialized.');
    }

    // Initialize Cumpleaños
    if (!localStorage.getItem(FirestoreKeys.CUMPLEANOS)) {
        localStorage.setItem(FirestoreKeys.CUMPLEANOS, JSON.stringify([]));
        console.log('Cumpleaños DB Initialized.');
    }

    // Initialize Invitados Diarios
    if (!localStorage.getItem(FirestoreKeys.INVITADOS_DIARIOS)) {
        localStorage.setItem(FirestoreKeys.INVITADOS_DIARIOS, JSON.stringify([]));
        console.log('Invitados Diarios DB Initialized.');
    }

    // Initialize Precios Invitados
    if (!localStorage.getItem(FirestoreKeys.PRECIOS_INVITADOS)) {
        const defaultConfig = { precioInvitadoDiario: 0, precioInvitadoCumpleanos: 0 };
        localStorage.setItem(FirestoreKeys.PRECIOS_INVITADOS, JSON.stringify(defaultConfig));
        console.log('Precios Invitados DB Initialized.');
    }
    
    // Initialize Novedades
    if (!localStorage.getItem(FirestoreKeys.NOVEDADES)) {
        localStorage.setItem(FirestoreKeys.NOVEDADES, JSON.stringify([]));
        console.log('Novedades DB Initialized.');
    }
  }
};
