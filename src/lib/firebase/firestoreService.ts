'use client';
import { db, auth } from './config';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  Timestamp,
} from 'firebase/firestore';
import type { Socio, Adherente, SolicitudInvitadosDiarios, RevisionMedica, Novedad, PreciosInvitadosConfig, UserRole, AptoMedicoDisplay, UltimoIngreso, EstadoResponsable, RegistroAcceso } from '@/types';
import { normalizeText } from '../helpers';
import { isValid } from 'date-fns';

// --- Helper para conversión de Timestamps ---
function convertTimestamps(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (obj instanceof Timestamp) {
    return obj.toDate();
  }
  if (Array.isArray(obj)) {
    return obj.map(convertTimestamps);
  }
  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      newObj[key] = convertTimestamps(obj[key]);
    }
  }
  return newObj;
}

// Colecciones de Firestore
const sociosCollection = collection(db, 'socios');
const solicitudesInvitadosDiariosCollection = collection(db, 'solicitudesInvitadosDiarios');
const revisionesMedicasCollection = collection(db, 'revisionesMedicas');
const novedadesCollection = collection(db, 'novedades');
const configCollection = collection(db, 'config');
const adminUsersCollection = collection(db, 'adminUsers');
const registrosAccesoCollection = collection(db, 'registros_acceso');
const adherentesCollection = collection(db, 'adherentes');

// --- Funciones de Socios ---
export async function getPaginatedSocios(
  pageSize: number,
  lastVisible?: DocumentSnapshot,
  options?: { estado?: 'Todos' | 'Activo' | 'Inactivo' | 'Pendiente', order?: 'asc' | 'desc' }
) {
  const queryConstraints = [];
  if (options?.estado && options.estado !== 'Todos') {
    queryConstraints.push(where('estadoSocio', '==', options.estado));
  }
  queryConstraints.push(orderBy('numeroSocio', options?.order || 'asc'));
  queryConstraints.push(limit(pageSize));
  if (lastVisible) {
    queryConstraints.push(startAfter(lastVisible));
  }
  const q = query(sociosCollection, ...queryConstraints);
  const documentSnapshots = await getDocs(q);
  const socios = documentSnapshots.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as Socio);
  const newLastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];
  return { socios, lastVisible: newLastVisible };
}

export async function getAllSocios(): Promise<Socio[]> {
  const q = query(sociosCollection, orderBy('numeroSocio'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as Socio);
}

export async function getSocio(id: string): Promise<Socio | null> {
  const docRef = doc(sociosCollection, id);
  const docSnap = await getDocFromServer(docRef);
  if (docSnap.exists()) {
    return convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as Socio;
  }
  return null;
}

export async function addSocio(socio: Socio): Promise<void> {
  await setDoc(doc(sociosCollection, socio.id), socio);
}

export async function updateSocio(socioId: string, dataToUpdate: Partial<Socio>): Promise<void> {
  const cleanedData: { [key: string]: any } = {};
  for (const [key, value] of Object.entries(dataToUpdate)) {
    if (value !== undefined) {
      if (value instanceof Date) {
        cleanedData[key] = Timestamp.fromDate(value);
      } else if (Array.isArray(value)) {
        cleanedData[key] = value.map(item => {
          if (item instanceof Date) return Timestamp.fromDate(item);
          if (typeof item === 'object' && item !== null) {
            return Object.fromEntries(Object.entries(item).filter(([_, v]) => v !== undefined));
          }
          return item;
        });
      } else {
        cleanedData[key] = value;
      }
    }
  }
  const docRef = doc(db, 'socios', socioId);
  await updateDoc(docRef, cleanedData);
}

export async function deleteSocio(id: string): Promise<void> {
  await deleteDoc(doc(sociosCollection, id));
}

export async function getSocioByNumeroSocioOrDNI(searchTerm: string): Promise<Socio | null> {
  if (!searchTerm.trim()) return null;
  const q = query(sociosCollection, where('searchableKeywords', 'array-contains', normalizeText(searchTerm)), limit(1));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return convertTimestamps({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() }) as Socio;
  }
  return null;
}

export async function getSocioByNumeroExacto(numeroSocio: string): Promise<Socio | null> {
  if (!numeroSocio.trim()) return null;
  const q = query(sociosCollection, where('numeroSocio', '==', numeroSocio.trim()), limit(1));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return convertTimestamps({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() }) as Socio;
  }
  return null;
}

export async function getAdherentesByTitularId(titularId: string): Promise<Adherente[]> {
  if (!titularId) return [];
  const q = query(adherentesCollection, where('socioTitularId', '==', titularId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as Adherente);
}

// --- Funciones de Solicitudes de Invitados Diarios ---
export async function addOrUpdateSolicitudInvitadosDiarios(solicitud: SolicitudInvitadosDiarios): Promise<SolicitudInvitadosDiarios> {
  const docRef = doc(solicitudesInvitadosDiariosCollection, solicitud.id);
  const dataToSave = { ...solicitud, fechaUltimaModificacion: new Date() };
  dataToSave.fechaCreacion = solicitud.fechaCreacion ? new Date(solicitud.fechaCreacion) : dataToSave.fechaUltimaModificacion;
  if (dataToSave.listaInvitadosDiarios) {
    dataToSave.listaInvitadosDiarios = dataToSave.listaInvitadosDiarios.map(inv => ({ ...inv, fechaNacimiento: new Date(inv.fechaNacimiento) }));
  }
  await setDoc(docRef, dataToSave);
  return solicitud;
}

export async function getSolicitudInvitadosDiarios(idSocioTitular: string, fecha: string): Promise<SolicitudInvitadosDiarios | null> {
  const q = query(solicitudesInvitadosDiariosCollection, where('idSocioTitular', '==', idSocioTitular), where('fecha', '==', fecha), limit(1));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  return convertTimestamps({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() }) as SolicitudInvitadosDiarios;
}

export async function getAllSolicitudesInvitadosDiarios(filters?: { socioId?: string, fecha?: string }): Promise<SolicitudInvitadosDiarios[]> {
  const queryConstraints = [];
  if (filters?.socioId) queryConstraints.push(where('idSocioTitular', '==', filters.socioId));
  if (filters?.fecha) queryConstraints.push(where('fecha', '==', filters.fecha));
  const q = query(solicitudesInvitadosDiariosCollection, ...queryConstraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as SolicitudInvitadosDiarios);
}

// --- Funciones de Revisiones Médicas ---
export async function getAllRevisionesMedicas(): Promise<RevisionMedica[]> {
  const q = query(revisionesMedicasCollection, orderBy('fechaRevision', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as RevisionMedica);
}

export async function addRevisionMedica(revision: Omit<RevisionMedica, 'id'>): Promise<void> {
  const newDocRef = doc(revisionesMedicasCollection);
  await setDoc(newDocRef, { ...revision, id: newDocRef.id });
}

// --- Funciones de Novedades ---
export async function getNovedades(): Promise<Novedad[]> {
  const q = query(novedadesCollection, orderBy('fechaCreacion', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as Novedad).filter((n): n is Novedad => n !== null);
}

export async function addNovedad(novedad: Omit<Novedad, 'id'>): Promise<void> {
  const newDocRef = doc(novedadesCollection);
  await setDoc(newDocRef, { ...novedad, id: newDocRef.id });
}

export async function updateNovedad(novedad: Novedad): Promise<void> {
  await updateDoc(doc(novedadesCollection, novedad.id), novedad as any);
}

export async function deleteNovedad(id: string): Promise<void> {
  await deleteDoc(doc(novedadesCollection, id));
}

// --- Funciones de Registros de Acceso ---

export async function getRegistrosAccesoPorFecha(fecha: Date): Promise<RegistroAcceso[]> {
  const startOfDay = new Date(fecha.setHours(0, 0, 0, 0));
  const endOfDay = new Date(fecha.setHours(23, 59, 59, 999));
  const q = query(registrosAccesoCollection, where('fecha', '>=', startOfDay), where('fecha', '<=', endOfDay), orderBy('fecha', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as RegistroAcceso);
}

// --- Funciones de Configuración ---
export async function getConfiguracionPrecios(): Promise<PreciosInvitadosConfig | null> {
  const docRef = doc(configCollection, 'precios');
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() as PreciosInvitadosConfig : null;
}

export async function updateConfiguracionPrecios(config: PreciosInvitadosConfig): Promise<void> {
  await setDoc(doc(configCollection, 'precios'), config as any);
}

// --- Funciones de Admin Users ---
export async function getUserRole(uid: string): Promise<{ role: UserRole, name: string } | null> {
  const docRef = doc(adminUsersCollection, uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() as { role: UserRole, name: string } : null;
}

export async function setUserRole(uid: string, role: string, name: string): Promise<void> {
  await setDoc(doc(adminUsersCollection, uid), { role, name });
}




// =================================================================
// HELPER FUNCTIONS FOR CONTROL DE ACCESO
// =================================================================

export const verificarIngresoHoy = async (personaDNI: string): Promise<boolean> => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const q = query(registrosAccesoCollection, where('personaDNI', '==', personaDNI), where('tipoRegistro', '==', 'entrada'), where('fecha', '>=', Timestamp.fromDate(hoy)));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

export const obtenerUltimoIngreso = async (personaDNI: string): Promise<UltimoIngreso | null> => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const q = query(registrosAccesoCollection, where('personaDNI', '==', personaDNI), where('tipoRegistro', '==', 'entrada'), where('fecha', '>=', Timestamp.fromDate(hoy)), orderBy('fecha', 'desc'), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const registro = snapshot.docs[0].data();
  return { hora: registro.fecha.toDate().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), timestamp: registro.fecha };
};

export const verificarResponsableIngreso = async (socioTitularId: string): Promise<EstadoResponsable> => {
  try {
    console.log('🔍 Verificando responsable para socio:', socioTitularId);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Query más amplia sin filtrar por personaTipo
    const q = query(
      registrosAccesoCollection,
      where('socioTitularId', '==', socioTitularId),
      where('tipoRegistro', '==', 'entrada'),
      where('fecha', '>=', Timestamp.fromDate(hoy)),
      orderBy('fecha', 'asc')
    );

    const snapshot = await getDocs(q);
    console.log('📊 Registros de ingreso encontrados para el grupo:', snapshot.size);

    // Filtrar en memoria para excluir solo a los invitados
    const responsables = snapshot.docs.filter(doc => {
      const data = doc.data();
      return data.personaTipo !== 'invitado' && data.personaTipo !== 'invitadoCumpleanos';
    });

    console.log('✅ Responsables válidos encontrados:', responsables.length);

    if (responsables.length === 0) {
      console.log('❌ No se encontró un responsable válido presente.');
      return { hayResponsable: false };
    }

    // Tomar el primer responsable que ingresó
    const primerResponsable = responsables[0].data();
    console.log('✅ Responsable encontrado:', primerResponsable.personaNombre, primerResponsable.personaTipo);

    return {
      hayResponsable: true,
      responsable: {
        nombre: primerResponsable.personaNombre,
        apellido: primerResponsable.personaApellido || '',
        tipo: primerResponsable.personaTipo,
        hora: primerResponsable.fecha.toDate().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      }
    };
  } catch (error) {
    console.error('Error al verificar responsable:', error);
    return { hayResponsable: false };
  }
};