
'use client';

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  orderBy,
  Timestamp,
  CollectionReference,
  DocumentData,
  setDoc,
} from 'firebase/firestore';
import { db } from './config';
import type {
  Socio,
  RevisionMedica,
  SolicitudInvitadosDiarios,
  PreciosInvitadosConfig,
  Novedad,
  UserRole,
} from '@/types';
import { generateId, normalizeText } from '../helpers';

// Helper function for logging Firestore errors
const logFirestoreError = (error: any, context: string) => {
  console.error(`Firestore error in ${context}:`, error);
  // The "offline" error often masks a permissions issue.
  if (error.code === 'permission-denied' || error.message.includes('offline')) {
    console.error(
      'PERMISSION DENIED OR OFFLINE: This is very likely a Firestore rules issue or the database has not been created correctly. \n1. Go to your Firebase Console -> Firestore Database. \n2. Ensure you have created a database in a specific region (e.g., us-central). \n3. Go to the "Rules" tab and ensure they allow access for authenticated users. A good starting point for testing is:\n\nrules_version = \'2\';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if request.auth != null;\n    }\n  }\n}'
    );
  }
};


// --- Collection References ---
const sociosCollection = collection(db, 'socios') as CollectionReference<Socio, DocumentData>;
const revisionesCollection = collection(db, 'revisionesMedicas') as CollectionReference<RevisionMedica, DocumentData>;
const solicitudesCollection = collection(db, 'solicitudesInvitadosDiarios') as CollectionReference<SolicitudInvitadosDiarios, DocumentData>;
const novedadesCollection = collection(db, 'novedades') as CollectionReference<Novedad, DocumentData>;
const adminUsersCollection = collection(db, 'adminUsers');

// --- Data Converters (handle Date <-> Timestamp) ---
const createConverter = <T extends { [key: string]: any }>() => ({
  toFirestore: (data: T): DocumentData => {
    const firestoreData: DocumentData = { ...data };
    for (const key in firestoreData) {
      if (firestoreData[key] instanceof Date) {
        firestoreData[key] = Timestamp.fromDate(firestoreData[key]);
      }
    }
    return firestoreData;
  },
  fromFirestore: (snapshot: any, options: any): T => {
    const data = snapshot.data(options);
    const appData: { [key: string]: any } = { ...data, id: snapshot.id };
    for (const key in appData) {
      if (appData[key] instanceof Timestamp) {
        appData[key] = appData[key].toDate();
      }
    }
    return appData as T;
  },
});

const socioConverter = createConverter<Socio>();
const revisionConverter = createConverter<RevisionMedica>();
const solicitudConverter = createConverter<SolicitudInvitadosDiarios>();
const novedadConverter = createConverter<Novedad>();

// --- Socios Service ---
export const getSocios = async (): Promise<Socio[]> => {
  try {
    const q = query(sociosCollection).withConverter(socioConverter);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    logFirestoreError(error, 'getSocios');
    throw error;
  }
};

export const getSocioById = async (id: string): Promise<Socio | null> => {
  if (!id) return null;
  try {
    const docRef = doc(db, 'socios', id).withConverter(socioConverter);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    // A permissions error on getDoc often doesn't throw but results in a non-existent snapshot.
    // If it *does* throw (e.g., offline), we log it but still return null to allow auth flow to continue.
    logFirestoreError(error, `getSocioById for id: ${id}`);
    return null;
  }
};

export const getSocioByEmail = async (email: string): Promise<Socio | null> => {
  try {
    const q = query(sociosCollection, where("email", "==", email), limit(1)).withConverter(socioConverter);
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    return querySnapshot.docs[0].data();
  } catch (error) {
    logFirestoreError(error, `getSocioByEmail for email: ${email}`);
    throw error;
  }
};


export const getSocioByNumeroSocioOrDNI = async (searchTerm: string): Promise<Socio | null> => {
  try {
    const normalizedSearchTerm = normalizeText(searchTerm);
    
    // Try by DNI first
    let q = query(sociosCollection, where('dni', '==', normalizedSearchTerm), limit(1)).withConverter(socioConverter);
    let querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) return querySnapshot.docs[0].data();
    
    // Try by NumeroSocio
    q = query(sociosCollection, where('numeroSocio', '==', searchTerm.toUpperCase()), limit(1)).withConverter(socioConverter);
    querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) return querySnapshot.docs[0].data();

    // Fallback to searching all and filtering (less efficient)
    const allSocios = await getSocios();
    return allSocios.find(s =>
      normalizeText(s.nombre).includes(normalizedSearchTerm) ||
      normalizeText(s.apellido).includes(normalizedSearchTerm)
    ) || null;
  } catch(error) {
    logFirestoreError(error, `getSocioByNumeroSocioOrDNI for term: ${searchTerm}`);
    throw error;
  }
};

// Data for admin, medico, portero roles. Stored separately from socios.
export const getAdminUserById = async (uid: string): Promise<{ email: string; name: string; role: UserRole } | null> => {
  if (!uid) return null;
  try {
    const docRef = doc(db, 'adminUsers', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as { email: string; name: string; role: UserRole };
    }
    return null;
  } catch (error) {
    logFirestoreError(error, `getAdminUserById for uid: ${uid}`);
    return null;
  }
};


export const addSocio = async (uid: string, socioData: Omit<Socio, 'id' | 'numeroSocio' | 'role' | 'estadoSocio' | 'miembroDesde' | 'aptoMedico'>, isTitularSignup: boolean = false): Promise<Socio> => {
  try {
    const sociosRef = collection(db, 'socios');
    const lastSocioQuery = query(sociosRef, orderBy("numeroSocio", "desc"), limit(1));
    const lastSocioSnap = await getDocs(lastSocioQuery);
    const lastNumero = lastSocioSnap.empty ? 1000 : parseInt(lastSocioSnap.docs[0].data().numeroSocio.substring(1));

    const nuevoSocio: Omit<Socio, 'id'> = {
      ...(socioData),
      numeroSocio: `S${(lastNumero + 1).toString()}`,
      role: 'socio',
      estadoSocio: isTitularSignup ? 'Pendiente Validacion' : 'Activo',
      miembroDesde: new Date(),
      aptoMedico: { valido: false, razonInvalidez: 'Pendiente de presentación' },
    };
    
    const socioUid = uid;
    if (!socioUid) throw new Error("UID is missing for socio creation.");

    const docRef = doc(sociosCollection, socioUid).withConverter(socioConverter);
    await setDoc(docRef, nuevoSocio);

    return { ...nuevoSocio, id: socioUid };
  } catch(error) {
    logFirestoreError(error, `addSocio for user UID: ${uid}`);
    throw error;
  }
};

export const updateSocio = async (socioToUpdate: Partial<Socio> & { id: string }): Promise<void> => {
  try {
    const { id, ...data } = socioToUpdate;
    const docRef = doc(db, 'socios', id).withConverter(socioConverter);
    await updateDoc(docRef, data);
  } catch (error) {
    logFirestoreError(error, `updateSocio for id: ${socioToUpdate.id}`);
    throw error;
  }
};

export const deleteSocio = async (socioId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'socios', socioId));
    return true;
  } catch (error) {
    logFirestoreError(error, `deleteSocio for id: ${socioId}`);
    return false;
  }
};

// --- Revisiones Medicas Service ---
export const getRevisionesMedicas = async (): Promise<RevisionMedica[]> => {
  try {
    const q = query(revisionesCollection, orderBy("fechaRevision", "desc"), limit(20)).withConverter(revisionConverter);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch(error) {
    logFirestoreError(error, 'getRevisionesMedicas');
    throw error;
  }
};

export const addRevisionMedica = async (revision: Omit<RevisionMedica, 'id'>): Promise<RevisionMedica> => {
  try {
    const docRef = await addDoc(revisionesCollection.withConverter(revisionConverter), revision as RevisionMedica);
    return { ...revision, id: docRef.id };
  } catch(error) {
    logFirestoreError(error, `addRevisionMedica for socio: ${revision.socioNombre}`);
    throw error;
  }
};

// --- Solicitudes Invitados Diarios Service ---
export const getAllSolicitudesInvitadosDiarios = async (): Promise<SolicitudInvitadosDiarios[]> => {
  try {
    const q = query(solicitudesCollection).withConverter(solicitudConverter);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch(error) {
    logFirestoreError(error, 'getAllSolicitudesInvitadosDiarios');
    throw error;
  }
};

export const getSolicitudInvitadosDiarios = async (idSocioTitular: string, fechaISO: string): Promise<SolicitudInvitadosDiarios | null> => {
  try {
    const q = query(
      solicitudesCollection, 
      where("idSocioTitular", "==", idSocioTitular), 
      where("fecha", "==", fechaISO), 
      limit(1)
    ).withConverter(solicitudConverter);
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty ? null : querySnapshot.docs[0].data();
  } catch(error) {
    logFirestoreError(error, `getSolicitudInvitadosDiarios for socio: ${idSocioTitular} on date: ${fechaISO}`);
    throw error;
  }
};

export const addOrUpdateSolicitudInvitadosDiarios = async (solicitud: SolicitudInvitadosDiarios): Promise<SolicitudInvitadosDiarios> => {
  try {
    const existingDoc = await getSolicitudInvitadosDiarios(solicitud.idSocioTitular, solicitud.fecha);
    const docId = existingDoc ? existingDoc.id : solicitud.id;

    const docRef = doc(db, 'solicitudesInvitadosDiarios', docId).withConverter(solicitudConverter);
    await setDoc(docRef, solicitud, { merge: true });

    return { ...solicitud, id: docId };
  } catch(error) {
    logFirestoreError(error, `addOrUpdateSolicitudInvitadosDiarios for socio: ${solicitud.idSocioTitular}`);
    throw error;
  }
};

export const updateSolicitudInvitadosDiarios = async (updatedSolicitud: SolicitudInvitadosDiarios): Promise<SolicitudInvitadosDiarios> => {
    return addOrUpdateSolicitudInvitadosDiarios(updatedSolicitud);
};

// --- Precios Invitados Service ---
export const getPreciosInvitados = async (): Promise<PreciosInvitadosConfig> => {
  try {
    const docRef = doc(db, 'config', 'preciosInvitados');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as PreciosInvitadosConfig;
    }
    return { precioInvitadoDiario: 0, precioInvitadoCumpleanos: 0 };
  } catch(error) {
    logFirestoreError(error, 'getPreciosInvitados');
    throw error;
  }
};

export const updatePreciosInvitados = async (config: PreciosInvitadosConfig): Promise<void> => {
  try {
    const docRef = doc(db, 'config', 'preciosInvitados');
    await setDoc(docRef, config, { merge: true });
  } catch(error) {
    logFirestoreError(error, 'updatePreciosInvitados');
    throw error;
  }
};

// --- Novedades Service ---
export const getNovedades = async (): Promise<Novedad[]> => {
  try {
    const q = query(novedadesCollection, orderBy("fechaCreacion", "desc")).withConverter(novedadConverter);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch(error) {
    logFirestoreError(error, 'getNovedades');
    throw error;
  }
};

export const addNovedad = async (novedadData: Omit<Novedad, 'id' | 'fechaCreacion'>): Promise<Novedad> => {
  try {
    const dataToSave = { ...novedadData, fechaCreacion: new Date() };
    const docRef = await addDoc(novedadesCollection.withConverter(novedadConverter), dataToSave as Novedad);
    return { ...dataToSave, id: docRef.id };
  } catch(error) {
    logFirestoreError(error, `addNovedad with title: ${novedadData.titulo}`);
    throw error;
  }
};

export const updateNovedad = async (updatedNovedad: Novedad): Promise<Novedad> => {
  try {
    const { id, ...data } = updatedNovedad;
    const docRef = doc(db, 'novedades', id).withConverter(novedadConverter);
    await updateDoc(docRef, data);
    return updatedNovedad;
  } catch (error) {
    logFirestoreError(error, `updateNovedad for id: ${updatedNovedad.id}`);
    throw error;
  }
};

export const deleteNovedad = async (novedadId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'novedades', novedadId));
    return true;
  } catch (error) {
    logFirestoreError(error, `deleteNovedad for id: ${novedadId}`);
    return false;
  }
};
