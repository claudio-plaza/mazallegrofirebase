'use client';

import { db, storage } from './config';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  Timestamp,
  limit 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { SolicitudCambioFoto, EstadoSolicitudCambioFoto, TipoFotoSolicitud } from '@/types';

const solicitudesCollection = collection(db, 'solicitudesCambioFoto');

function convertTimestamps(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Timestamp) return obj.toDate();
  if (Array.isArray(obj)) return obj.map(convertTimestamps);
  
  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      newObj[key] = convertTimestamps(obj[key]);
    }
  }
  return newObj;
}

export async function crearSolicitudCambioFoto(
  solicitud: Omit<SolicitudCambioFoto, 'id' | 'fechaSolicitud' | 'estado' | 'fotoNuevaUrl'>,
  fotoFile: File
): Promise<string> {
  console.log('[crearSolicitudCambioFoto] Creando solicitud:', solicitud);
  
  // Subir foto temporal a Storage
  const tempPath = `solicitudes-temp/${solicitud.socioId}/${Date.now()}_${fotoFile.name}`;
  const storageRef = ref(storage, tempPath);
  await uploadBytes(storageRef, fotoFile);
  const fotoNuevaUrl = await getDownloadURL(storageRef);
  
  // Limpiar undefined antes de guardar en Firestore
  const nuevaSolicitud: any = {
    socioId: solicitud.socioId,
    socioNombre: solicitud.socioNombre,
    socioNumero: solicitud.socioNumero,
    tipoPersona: solicitud.tipoPersona,
    tipoFoto: solicitud.tipoFoto,
    fotoActualUrl: solicitud.fotoActualUrl,
    fotoNuevaUrl,
    estado: 'Pendiente',
    fechaSolicitud: Timestamp.now(),
  };

  // Solo agregar familiarId si existe
  if (solicitud.familiarId) {
    nuevaSolicitud.familiarId = solicitud.familiarId;
  }
  
  const docRef = await addDoc(solicitudesCollection, nuevaSolicitud);
  console.log('[crearSolicitudCambioFoto] Solicitud creada con ID:', docRef.id);
  return docRef.id;
}

export async function getSolicitudesPendientes(): Promise<SolicitudCambioFoto[]> {
  const q = query(
    solicitudesCollection,
    where('estado', '==', 'Pendiente'),
    orderBy('fechaSolicitud', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as SolicitudCambioFoto);
}

export async function getAllSolicitudes(): Promise<SolicitudCambioFoto[]> {
  const q = query(solicitudesCollection, orderBy('fechaSolicitud', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as SolicitudCambioFoto);
}

export async function getSolicitudesBySocio(socioId: string): Promise<SolicitudCambioFoto[]> {
  const q = query(
    solicitudesCollection,
    where('socioId', '==', socioId),
    orderBy('fechaSolicitud', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as SolicitudCambioFoto);
}

export async function getSolicitud(solicitudId: string): Promise<SolicitudCambioFoto | null> {
  const docRef = doc(solicitudesCollection, solicitudId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as SolicitudCambioFoto;
  }
  return null;
}

export async function aprobarSolicitud(solicitudId: string): Promise<void> {
  console.log('[aprobarSolicitud] Aprobando solicitud:', solicitudId);
  const docRef = doc(solicitudesCollection, solicitudId);
  await updateDoc(docRef, {
    estado: 'Aprobada',
    fechaRespuesta: Timestamp.now(),
  });
}

export async function rechazarSolicitud(solicitudId: string, motivo: string): Promise<void> {
  console.log('[rechazarSolicitud] Rechazando solicitud:', solicitudId, 'Motivo:', motivo);
  const docRef = doc(solicitudesCollection, solicitudId);
  await updateDoc(docRef, {
    estado: 'Rechazada',
    motivoRechazo: motivo,
    fechaRespuesta: Timestamp.now(),
  });
}

export async function deleteSolicitud(solicitudId: string): Promise<void> {
  const docRef = doc(solicitudesCollection, solicitudId);
  await deleteDoc(docRef);
}

export async function getPendingSolicitudCambioFoto(socioId: string, tipoFoto: TipoFotoSolicitud): Promise<SolicitudCambioFoto | null> {
  const q = query(
    solicitudesCollection,
    where('socioId', '==', socioId),
    where('tipoFoto', '==', tipoFoto),
    where('estado', '==', 'Pendiente'),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return convertTimestamps({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() }) as SolicitudCambioFoto;
  }
  return null;
}