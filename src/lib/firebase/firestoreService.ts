
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
  const q = query(sociosCollection).withConverter(socioConverter);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

export const getSocioById = async (id: string): Promise<Socio | null> => {
  const docRef = doc(db, 'socios', id).withConverter(socioConverter);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
};

export const getSocioByEmail = async (email: string): Promise<Socio | null> => {
    const q = query(sociosCollection, where("email", "==", email), limit(1)).withConverter(socioConverter);
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    return querySnapshot.docs[0].data();
};


export const getSocioByNumeroSocioOrDNI = async (searchTerm: string): Promise<Socio | null> => {
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
};

// Data for admin, medico, portero roles. Stored separately from socios.
export const getAdminUserByEmail = async (email: string) => {
    if (!email) return null;
    const q = query(adminUsersCollection, where("email", "==", email), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as { email: string, name: string, role: UserRole };
};

export const addSocio = async (socioData: Omit<Socio, 'id' | 'numeroSocio' | 'role'>, isTitularSignup: boolean = false): Promise<Socio> => {
  const sociosRef = collection(db, 'socios');
  // Get the last socio number to generate a new one
  const lastSocioQuery = query(sociosRef, orderBy("numeroSocio", "desc"), limit(1));
  const lastSocioSnap = await getDocs(lastSocioQuery);
  const lastNumero = lastSocioSnap.empty ? 1000 : parseInt(lastSocioSnap.docs[0].data().numeroSocio.substring(1));

  const nuevoSocio: Omit<Socio, 'id'> = {
    ...socioData,
    numeroSocio: `S${(lastNumero + 1).toString()}`,
    role: 'socio',
    estadoSocio: isTitularSignup ? 'Pendiente Validacion' : 'Activo',
    miembroDesde: new Date(),
    aptoMedico: { valido: false, razonInvalidez: 'Pendiente de presentación' },
  };
  
  // The document ID for a socio should be their UID from Firebase Auth.
  const socioUid = (socioData as any).uid;
  if (!socioUid) throw new Error("UID is missing from socio data for creation.");

  const docRef = doc(sociosCollection, socioUid).withConverter(socioConverter);
  await setDoc(docRef, nuevoSocio); // Use setDoc for creating a new document with a specific ID.

  return { ...nuevoSocio, id: socioUid };
};

export const updateSocio = async (socioToUpdate: Partial<Socio> & { id: string }): Promise<void> => {
  const { id, ...data } = socioToUpdate;
  const docRef = doc(db, 'socios', id).withConverter(socioConverter);
  await updateDoc(docRef, data);
};

export const deleteSocio = async (socioId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'socios', socioId));
    return true;
  } catch (error) {
    console.error("Error deleting socio: ", error);
    return false;
  }
};

// --- Revisiones Medicas Service ---
export const getRevisionesMedicas = async (): Promise<RevisionMedica[]> => {
  const q = query(revisionesCollection, orderBy("fechaRevision", "desc"), limit(20)).withConverter(revisionConverter);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

export const addRevisionMedica = async (revision: Omit<RevisionMedica, 'id'>): Promise<RevisionMedica> => {
  const docRef = await addDoc(revisionesCollection.withConverter(revisionConverter), revision as RevisionMedica);
  return { ...revision, id: docRef.id };
};

// --- Solicitudes Invitados Diarios Service ---
export const getAllSolicitudesInvitadosDiarios = async (): Promise<SolicitudInvitadosDiarios[]> => {
  const q = query(solicitudesCollection).withConverter(solicitudConverter);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

export const getSolicitudInvitadosDiarios = async (idSocioTitular: string, fechaISO: string): Promise<SolicitudInvitadosDiarios | null> => {
  const q = query(
    solicitudesCollection, 
    where("idSocioTitular", "==", idSocioTitular), 
    where("fecha", "==", fechaISO), 
    limit(1)
  ).withConverter(solicitudConverter);
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty ? null : querySnapshot.docs[0].data();
};

export const addOrUpdateSolicitudInvitadosDiarios = async (solicitud: SolicitudInvitadosDiarios): Promise<SolicitudInvitadosDiarios> => {
  const existingDoc = await getSolicitudInvitadosDiarios(solicitud.idSocioTitular, solicitud.fecha);
  const docId = existingDoc ? existingDoc.id : solicitud.id;

  const docRef = doc(db, 'solicitudesInvitadosDiarios', docId).withConverter(solicitudConverter);
  await updateDoc(docRef, solicitud, { merge: true });

  return { ...solicitud, id: docId };
};

export const updateSolicitudInvitadosDiarios = async (updatedSolicitud: SolicitudInvitadosDiarios): Promise<SolicitudInvitadosDiarios> => {
    return addOrUpdateSolicitudInvitadosDiarios(updatedSolicitud);
};

// --- Precios Invitados Service ---
export const getPreciosInvitados = async (): Promise<PreciosInvitadosConfig> => {
  const docRef = doc(db, 'config', 'preciosInvitados');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as PreciosInvitadosConfig;
  }
  return { precioInvitadoDiario: 0, precioInvitadoCumpleanos: 0 };
};

export const updatePreciosInvitados = async (config: PreciosInvitadosConfig): Promise<void> => {
  const docRef = doc(db, 'config', 'preciosInvitados');
  await updateDoc(docRef, config, { merge: true });
};

// --- Novedades Service ---
export const getNovedades = async (): Promise<Novedad[]> => {
  const q = query(novedadesCollection, orderBy("fechaCreacion", "desc")).withConverter(novedadConverter);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

export const addNovedad = async (novedadData: Omit<Novedad, 'id'>): Promise<Novedad> => {
  const docRef = await addDoc(novedadesCollection.withConverter(novedadConverter), novedadData as Novedad);
  return { ...novedadData, id: docRef.id };
};

export const updateNovedad = async (updatedNovedad: Novedad): Promise<Novedad> => {
  const { id, ...data } = updatedNovedad;
  const docRef = doc(db, 'novedades', id).withConverter(novedadConverter);
  await updateDoc(docRef, data);
  return updatedNovedad;
};

export const deleteNovedad = async (novedadId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'novedades', novedadId));
    return true;
  } catch (error) {
    console.error("Error deleting novedad: ", error);
    return false;
  }
};
