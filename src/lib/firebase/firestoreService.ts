
'use client';

import type { Socio, RevisionMedica, SolicitudCumpleanos, InvitadoCumpleanos, SolicitudInvitadosDiarios, InvitadoDiario, AptoMedicoInfo, Adherente } from '@/types';
import { mockSocios, mockRevisiones } from '../mockData';
import { generateId } from '../helpers';
import { parseISO, isValid } from 'date-fns';


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

// Helper function to save data to localStorage and dispatch event
const saveDbAndNotify = <T>(key: string, data: T[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(`${key}Updated`)); // Generic event for this specific key
  // Dispatch more general events if other parts of the app need to react broadly
  if (key === KEYS.SOCIOS) {
      window.dispatchEvent(new CustomEvent('sociosDBUpdated'));
  }
  if (key === KEYS.CUMPLEANOS) {
      window.dispatchEvent(new CustomEvent('cumpleanosDBUpdated'));
  }
  if (key === KEYS.INVITADOS_DIARIOS) {
      window.dispatchEvent(new CustomEvent('invitadosDiariosDBUpdated'));
  }
   if (key === KEYS.REVISIONES) {
      window.dispatchEvent(new CustomEvent('revisionesDBUpdated'));
  }
};

// Initialize DBs if they don't exist
export const initializeSociosDB = (): void => {
  if (typeof window !== 'undefined' && !localStorage.getItem(KEYS.SOCIOS)) {
    saveDbAndNotify(KEYS.SOCIOS, mockSocios.map(s => ({
      ...s,
      fechaNacimiento: typeof s.fechaNacimiento === 'string' ? s.fechaNacimiento : s.fechaNacimiento.toISOString(),
      grupoFamiliar: s.grupoFamiliar.map(f => ({...f, fechaNacimiento: typeof f.fechaNacimiento === 'string' ? f.fechaNacimiento : f.fechaNacimiento.toISOString()}))
    })) as unknown as Socio[]);
  }
};

export const initializeRevisionesDB = (): void => {
  if (typeof window !== 'undefined' && !localStorage.getItem(KEYS.REVISIONES)) {
    saveDbAndNotify(KEYS.REVISIONES, mockRevisiones);
  }
};

export const initializeCumpleanosDB = (): void => {
    if (typeof window !== 'undefined' && !localStorage.getItem(KEYS.CUMPLEANOS)) {
        saveDbAndNotify(KEYS.CUMPLEANOS, []);
    }
};

export const initializeInvitadosDiariosDB = (): void => {
    if (typeof window !== 'undefined' && !localStorage.getItem(KEYS.INVITADOS_DIARIOS)) {
        saveDbAndNotify(KEYS.INVITADOS_DIARIOS, []);
    }
};

// --- Socios Service ---
// Function to get socios with dates parsed
const getParsedSocios = (): Socio[] => {
  const sociosRaw = getDb<any>(KEYS.SOCIOS); // Get raw data
  return sociosRaw.map(s => ({
    ...s,
    fechaNacimiento: s.fechaNacimiento ? parseISO(s.fechaNacimiento) : new Date(0),
    grupoFamiliar: s.grupoFamiliar?.map((f: any) => ({
      ...f,
      fechaNacimiento: f.fechaNacimiento ? parseISO(f.fechaNacimiento) : new Date(0),
    })) || [],
  }));
};

export const getSocios = async (): Promise<Socio[]> => {
  return getParsedSocios();
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


export const addSocio = async (socioData: Omit<Socio, 'id' | 'numeroSocio' | 'role' | 'adherentes'>, isTitularSignup: boolean = false): Promise<Socio> => {
  const socios = getDb<Socio>(KEYS.SOCIOS); // Get raw to keep dates as strings
  const newNumeroSocio = `S${(Math.max(0, ...socios.map(s => parseInt(s.numeroSocio.substring(1)))) + 1).toString().padStart(3, '0')}`;

  const nuevoSocio: Socio = {
    ...socioData,
    fechaNacimiento: typeof socioData.fechaNacimiento === 'string' ? socioData.fechaNacimiento : socioData.fechaNacimiento.toISOString(),
    id: generateId(),
    numeroSocio: newNumeroSocio,
    estadoSocio: isTitularSignup ? 'Pendiente Validacion' : 'Activo',
    role: 'socio',
    miembroDesde: new Date().toISOString(),
    grupoFamiliar: socioData.grupoFamiliar?.map(f => ({...f, fechaNacimiento: typeof f.fechaNacimiento === 'string' ? f.fechaNacimiento : (f.fechaNacimiento as Date).toISOString()})) || [],
    adherentes: [], // Initialize with empty adherentes
    aptoMedico: socioData.aptoMedico || { valido: false, razonInvalidez: 'Pendiente de presentación' },
  };
  saveDbAndNotify(KEYS.SOCIOS, [...socios, nuevoSocio]);
  return { ...nuevoSocio, fechaNacimiento: parseISO(nuevoSocio.fechaNacimiento as string) }; // Return with parsed date
};

// Function to update a socio in the raw DB (expects dates as ISO strings)
const updateSocioInDb = (updatedSocioRaw: any): Socio | null => {
  let sociosRaw = getDb<any>(KEYS.SOCIOS);
  const index = sociosRaw.findIndex(s => s.id === updatedSocioRaw.id);
  if (index > -1) {
    sociosRaw[index] = updatedSocioRaw; // updatedSocioRaw already has dates as strings
    saveDbAndNotify(KEYS.SOCIOS, sociosRaw);
    // Return the updated socio with dates parsed for immediate use if needed
    return {
      ...updatedSocioRaw,
      fechaNacimiento: parseISO(updatedSocioRaw.fechaNacimiento),
      cambiosPendientesGrupoFamiliar: updatedSocioRaw.cambiosPendientesGrupoFamiliar ? {
        ...updatedSocioRaw.cambiosPendientesGrupoFamiliar,
        familiares: {
          conyuge: updatedSocioRaw.cambiosPendientesGrupoFamiliar.familiares?.conyuge ? {
            ...updatedSocioRaw.cambiosPendientesGrupoFamiliar.familiares.conyuge,
            fechaNacimiento: parseISO(updatedSocioRaw.cambiosPendientesGrupoFamiliar.familiares.conyuge.fechaNacimiento),
          } : null,
          hijos: updatedSocioRaw.cambiosPendientesGrupoFamiliar.familiares?.hijos?.map((h: any) => ({...h, fechaNacimiento: parseISO(h.fechaNacimiento)})) || [],
          padres: updatedSocioRaw.cambiosPendientesGrupoFamiliar.familiares?.padres?.map((p: any) => ({...p, fechaNacimiento: parseISO(p.fechaNacimiento)})) || [],
        }
      } : null,
      grupoFamiliar: updatedSocioRaw.grupoFamiliar?.map((f: any) => ({
        ...f,
        fechaNacimiento: parseISO(f.fechaNacimiento),
      })) || [],
    };
  }
  return null;
};


export const updateSocio = async (updatedSocio: Socio): Promise<Socio | null> => {
  // Convert dates back to ISO strings before saving
  const socioToSave = {
    ...updatedSocio,
    fechaNacimiento: typeof updatedSocio.fechaNacimiento === 'string' ? updatedSocio.fechaNacimiento : updatedSocio.fechaNacimiento.toISOString(),
    cambiosPendientesGrupoFamiliar: updatedSocio.cambiosPendientesGrupoFamiliar ? {
        ...updatedSocio.cambiosPendientesGrupoFamiliar,
        familiares: {
            conyuge: updatedSocio.cambiosPendientesGrupoFamiliar.familiares?.conyuge ? {
                ...updatedSocio.cambiosPendientesGrupoFamiliar.familiares.conyuge,
                fechaNacimiento: typeof updatedSocio.cambiosPendientesGrupoFamiliar.familiares.conyuge.fechaNacimiento === 'string'
                    ? updatedSocio.cambiosPendientesGrupoFamiliar.familiares.conyuge.fechaNacimiento
                    : (updatedSocio.cambiosPendientesGrupoFamiliar.familiares.conyuge.fechaNacimiento as Date).toISOString(),
            } : null,
            hijos: updatedSocio.cambiosPendientesGrupoFamiliar.familiares?.hijos?.map(h => ({
                ...h,
                fechaNacimiento: typeof h.fechaNacimiento === 'string' ? h.fechaNacimiento : (h.fechaNacimiento as Date).toISOString(),
            })) || [],
            padres: updatedSocio.cambiosPendientesGrupoFamiliar.familiares?.padres?.map(p => ({
                ...p,
                fechaNacimiento: typeof p.fechaNacimiento === 'string' ? p.fechaNacimiento : (p.fechaNacimiento as Date).toISOString(),
            })) || [],
        }
    } : null,
    grupoFamiliar: updatedSocio.grupoFamiliar?.map(f => ({
      ...f,
      fechaNacimiento: typeof f.fechaNacimiento === 'string' ? f.fechaNacimiento : (f.fechaNacimiento as Date).toISOString(),
    })) || [],
     // Adherentes no tienen fechas, se guardan tal cual.
  };
  return updateSocioInDb(socioToSave);
};


export const deleteSocio = async (socioId: string): Promise<boolean> => {
  let socios = getDb<Socio>(KEYS.SOCIOS);
  const initialLength = socios.length;
  socios = socios.filter(s => s.id !== socioId);
  if (socios.length < initialLength) {
    saveDbAndNotify(KEYS.SOCIOS, socios);
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
  saveDbAndNotify(KEYS.REVISIONES, revisiones);

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
      fechaEvento: s.fechaEvento ? parseISO(s.fechaEvento as unknown as string) : new Date(0),
    }));
};

export const getSolicitudesCumpleanosBySocio = async (idSocioTitular: string): Promise<SolicitudCumpleanos[]> => {
    const todas = await getAllSolicitudesCumpleanos();
    return todas.filter(s => s.idSocioTitular === idSocioTitular);
};

export const addSolicitudCumpleanos = async (solicitud: Omit<SolicitudCumpleanos, 'id' | 'fechaSolicitud' | 'estado' | 'titularIngresadoEvento'>): Promise<SolicitudCumpleanos> => {
    const solicitudes = getDb<SolicitudCumpleanos>(KEYS.CUMPLEANOS); // Get raw
    const nuevaSolicitud: SolicitudCumpleanos = {
        ...solicitud,
        id: generateId(),
        fechaSolicitud: new Date().toISOString(),
        estado: solicitud.estado || 'Aprobada',
        titularIngresadoEvento: false,
        fechaEvento: typeof solicitud.fechaEvento === 'string' ? solicitud.fechaEvento : (solicitud.fechaEvento as Date).toISOString(),
    };
    saveDbAndNotify(KEYS.CUMPLEANOS, [...solicitudes, nuevaSolicitud]);
    return {...nuevaSolicitud, fechaEvento: parseISO(nuevaSolicitud.fechaEvento as string)};
};

export const updateSolicitudCumpleanos = async (updatedSolicitud: SolicitudCumpleanos): Promise<SolicitudCumpleanos | null> => {
    let solicitudes = getDb<SolicitudCumpleanos>(KEYS.CUMPLEANOS); // Get raw
    const index = solicitudes.findIndex(s => s.id === updatedSolicitud.id);
    if (index > -1) {
        const solicitudToSave = {
            ...updatedSolicitud,
            fechaEvento: typeof updatedSolicitud.fechaEvento === 'string' ? updatedSolicitud.fechaEvento : (updatedSolicitud.fechaEvento as Date).toISOString(),
        };
        solicitudes[index] = solicitudToSave;
        saveDbAndNotify(KEYS.CUMPLEANOS, solicitudes);
        return {...solicitudToSave, fechaEvento: parseISO(solicitudToSave.fechaEvento as string)};
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
    saveDbAndNotify(KEYS.INVITADOS_DIARIOS, solicitudes);
    return solicitud;
};

export const updateSolicitudInvitadosDiarios = async (updatedSolicitud: SolicitudInvitadosDiarios): Promise<SolicitudInvitadosDiarios | null> => {
    let solicitudes = await getAllSolicitudesInvitadosDiarios();
    const index = solicitudes.findIndex(s => s.id === updatedSolicitud.id);
    if (index > -1) {
        solicitudes[index] = updatedSolicitud;
        saveDbAndNotify(KEYS.INVITADOS_DIARIOS, solicitudes);
        return updatedSolicitud;
    }
    // Fallback for cases where ID might not have been set initially if it was a new record from client
    const fallbackIndex = solicitudes.findIndex(s => s.idSocioTitular === updatedSolicitud.idSocioTitular && s.fecha === updatedSolicitud.fecha);
    if (fallbackIndex > -1) {
        solicitudes[fallbackIndex] = {...updatedSolicitud, id: solicitudes[fallbackIndex].id }; // Ensure ID consistency
        saveDbAndNotify(KEYS.INVITADOS_DIARIOS, solicitudes);
        return solicitudes[fallbackIndex];
    }
    return null;
};

// Initialize DBs on load
if (typeof window !== 'undefined') {
    initializeSociosDB();
    initializeRevisionesDB();
    initializeCumpleanosDB();
    initializeInvitadosDiariosDB();
}
isValid(new Date()); // Keep this import for date-fns
