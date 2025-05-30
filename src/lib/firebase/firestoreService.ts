
'use client';

import type { Socio, RevisionMedica, SolicitudCumpleanos, InvitadoCumpleanos, SolicitudInvitadosDiarios, InvitadoDiario, AptoMedicoInfo } from '@/types';
import { mockSocios, mockRevisiones } from '../mockData'; 
import { generateId } from '../helpers';

const KEYS = {
  SOCIOS: 'firestore/socios',
  REVISIONES: 'firestore/revisionesMedicas',
  CUMPLEANOS: 'firestore/solicitudesCumpleanos',
  INVITADOS_DIARIOS: 'firestore/solicitudesInvitadosDiarios',
};

// Helper function to get data from localStorage
const getDb = <T>(key: string): T[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

// Helper function to save data to localStorage
const saveDb = <T>(key: string, data: T[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
  // Dispatch a custom event to notify other components of DB changes
  window.dispatchEvent(new CustomEvent(`${key}Updated`));
  if (key === KEYS.SOCIOS) { 
      window.dispatchEvent(new CustomEvent('sociosDBUpdated'));
  }
  if (key === KEYS.CUMPLEANOS) {
      window.dispatchEvent(new CustomEvent('cumpleanosDBUpdated'));
  }
  if (key === KEYS.INVITADOS_DIARIOS) {
      window.dispatchEvent(new CustomEvent('invitadosDiariosDBUpdated'));
  }
};


// Initialize DBs if they don't exist
export const initializeSociosDB = (): void => {
  if (typeof window !== 'undefined' && !localStorage.getItem(KEYS.SOCIOS)) {
    saveDb(KEYS.SOCIOS, mockSocios);
  } else if (typeof window !== 'undefined') {
    // saveDb(KEYS.SOCIOS, mockSocios); // Optionally, always refresh for dev
  }
};

export const initializeRevisionesDB = (): void => {
  if (typeof window !== 'undefined' && !localStorage.getItem(KEYS.REVISIONES)) {
    saveDb(KEYS.REVISIONES, mockRevisiones);
  }
};

export const initializeCumpleanosDB = (): void => {
    if (typeof window !== 'undefined' && !localStorage.getItem(KEYS.CUMPLEANOS)) {
        saveDb(KEYS.CUMPLEANOS, []);
    }
};

export const initializeInvitadosDiariosDB = (): void => {
    if (typeof window !== 'undefined' && !localStorage.getItem(KEYS.INVITADOS_DIARIOS)) {
        saveDb(KEYS.INVITADOS_DIARIOS, []);
    }
};


// --- Socios Service ---
export const getSocios = async (): Promise<Socio[]> => {
  return getDb<Socio>(KEYS.SOCIOS);
};

export const getSocioById = async (id: string): Promise<Socio | null> => {
  const socios = await getSocios();
  return socios.find(s => s.id === id) || null;
};

export const getSocioByNumeroSocioOrDNI = async (searchTerm: string): Promise<Socio | null> => {
  const socios = await getSocios();
  const term = searchTerm.toLowerCase().trim();
  return socios.find(s => 
    s.numeroSocio.toLowerCase() === term || 
    s.dni.toLowerCase() === term ||
    s.nombre.toLowerCase().includes(term) ||
    s.apellido.toLowerCase().includes(term) ||
    `${s.nombre.toLowerCase()} ${s.apellido.toLowerCase()}`.includes(term)
  ) || null;
};

export const addSocio = async (socioData: Omit<Socio, 'id' | 'numeroSocio' | 'role'>, isTitularSignup: boolean = false): Promise<Socio> => {
  const socios = await getSocios();
  const newNumeroSocio = `S${(Math.max(0, ...socios.map(s => parseInt(s.numeroSocio.substring(1)))) + 1).toString().padStart(3, '0')}`;
  
  const nuevoSocio: Socio = {
    ...socioData,
    id: generateId(), 
    numeroSocio: newNumeroSocio,
    estadoSocio: isTitularSignup ? 'Pendiente Validacion' : 'Activo', 
    role: 'socio', 
    miembroDesde: new Date().toISOString(), 
    grupoFamiliar: socioData.grupoFamiliar || [], 
    aptoMedico: socioData.aptoMedico || { valido: false, razonInvalidez: 'Pendiente de presentación' }, 
  };
  saveDb(KEYS.SOCIOS, [...socios, nuevoSocio]);
  return nuevoSocio;
};

export const updateSocio = async (updatedSocio: Socio): Promise<Socio | null> => {
  let socios = await getSocios();
  const index = socios.findIndex(s => s.id === updatedSocio.id);
  if (index > -1) {
    socios[index] = updatedSocio;
    saveDb(KEYS.SOCIOS, socios);
    return updatedSocio;
  }
  return null;
};

export const deleteSocio = async (socioId: string): Promise<boolean> => {
  let socios = await getSocios();
  const initialLength = socios.length;
  socios = socios.filter(s => s.id !== socioId);
  if (socios.length < initialLength) {
    saveDb(KEYS.SOCIOS, socios);
    return true;
  }
  return false;
};

// --- Revisiones Medicas Service ---
export const getRevisionesMedicas = async (): Promise<RevisionMedica[]> => {
  return getDb<RevisionMedica>(KEYS.REVISIONES);
};

export const addRevisionMedica = async (revision: Omit<RevisionMedica, 'id'>): Promise<RevisionMedica> => {
  const revisiones = await getRevisionesMedicas();
  const nuevaRevision: RevisionMedica = { ...revision, id: generateId() };
  revisiones.unshift(nuevaRevision); 
  saveDb(KEYS.REVISIONES, revisiones);
  
  const socio = await getSocioByNumeroSocioOrDNI(nuevaRevision.socioId);
  if (socio) {
    const aptoInfo: AptoMedicoInfo = {
      valido: nuevaRevision.resultado === 'Apto',
      fechaEmision: nuevaRevision.fechaRevision,
      fechaVencimiento: nuevaRevision.fechaVencimientoApto,
      observaciones: nuevaRevision.observaciones,
      razonInvalidez: nuevaRevision.resultado === 'No Apto' ? 'No Apto según última revisión' : undefined,
    };
    await updateSocio({ ...socio, aptoMedico: aptoInfo, ultimaRevisionMedica: nuevaRevision.fechaRevision });
  }
  return nuevaRevision;
};

// --- Solicitudes Cumpleanos Service ---
export const getAllSolicitudesCumpleanos = async (): Promise<SolicitudCumpleanos[]> => {
    return getDb<SolicitudCumpleanos>(KEYS.CUMPLEANOS).map(s => ({
      ...s,
      fechaEvento: new Date(s.fechaEvento), 
    }));
};

export const getSolicitudesCumpleanosBySocio = async (idSocioTitular: string): Promise<SolicitudCumpleanos[]> => {
    const todas = await getAllSolicitudesCumpleanos();
    return todas.filter(s => s.idSocioTitular === idSocioTitular);
};

export const addSolicitudCumpleanos = async (solicitud: Omit<SolicitudCumpleanos, 'id' | 'fechaSolicitud' | 'estado' | 'titularIngresadoEvento'>): Promise<SolicitudCumpleanos> => {
    const solicitudes = await getAllSolicitudesCumpleanos();
    const nuevaSolicitud: SolicitudCumpleanos = {
        ...solicitud,
        id: generateId(),
        fechaSolicitud: new Date().toISOString(),
        estado: solicitud.estado || 'Aprobada', 
        titularIngresadoEvento: false,
    };
    saveDb(KEYS.CUMPLEANOS, [...solicitudes, nuevaSolicitud]);
    return nuevaSolicitud;
};

export const updateSolicitudCumpleanos = async (updatedSolicitud: SolicitudCumpleanos): Promise<SolicitudCumpleanos | null> => {
    let solicitudes = await getAllSolicitudesCumpleanos();
    const index = solicitudes.findIndex(s => s.id === updatedSolicitud.id);
    if (index > -1) {
        solicitudes[index] = updatedSolicitud;
        saveDb(KEYS.CUMPLEANOS, solicitudes);
        return updatedSolicitud;
    }
    return null;
};

// --- Solicitudes Invitados Diarios Service ---
export const getAllSolicitudesInvitadosDiarios = async (): Promise<SolicitudInvitadosDiarios[]> => {
    return getDb<SolicitudInvitadosDiarios>(KEYS.INVITADOS_DIARIOS);
};

export const getSolicitudInvitadosDiarios = async (idSocioTitular: string, fechaISO: string): Promise<SolicitudInvitadosDiarios | null> => {
    const todas = await getAllSolicitudesInvitadosDiarios();
    return todas.find(s => s.idSocioTitular === idSocioTitular && s.fecha === fechaISO) || null;
};

export const addOrUpdateSolicitudInvitadosDiarios = async (solicitud: SolicitudInvitadosDiarios): Promise<SolicitudInvitadosDiarios> => {
    let solicitudes = await getAllSolicitudesInvitadosDiarios();
    const index = solicitudes.findIndex(s => s.id === solicitud.id || (s.idSocioTitular === solicitud.idSocioTitular && s.fecha === solicitud.fecha));
    
    if (index > -1) {
        solicitudes[index] = solicitud; 
    } else {
        solicitudes.push(solicitud); 
    }
    saveDb(KEYS.INVITADOS_DIARIOS, solicitudes);
    return solicitud;
};

export const updateSolicitudInvitadosDiarios = async (updatedSolicitud: SolicitudInvitadosDiarios): Promise<SolicitudInvitadosDiarios | null> => {
    let solicitudes = await getAllSolicitudesInvitadosDiarios();
    const index = solicitudes.findIndex(s => s.id === updatedSolicitud.id);
    if (index > -1) {
        solicitudes[index] = updatedSolicitud;
        saveDb(KEYS.INVITADOS_DIARIOS, solicitudes);
        return updatedSolicitud;
    }
    const fallbackIndex = solicitudes.findIndex(s => s.idSocioTitular === updatedSolicitud.idSocioTitular && s.fecha === updatedSolicitud.fecha);
    if (fallbackIndex > -1) {
        solicitudes[fallbackIndex] = {...updatedSolicitud, id: solicitudes[fallbackIndex].id }; 
        saveDb(KEYS.INVITADOS_DIARIOS, solicitudes);
        return solicitudes[fallbackIndex];
    }
    return null;
};

if (typeof window !== 'undefined') {
    initializeSociosDB();
    initializeRevisionesDB();
    initializeCumpleanosDB();
    initializeInvitadosDiariosDB();
}

    