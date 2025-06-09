
'use client';

import type { Socio, RevisionMedica, SolicitudCumpleanos, InvitadoCumpleanos, SolicitudInvitadosDiarios, InvitadoDiario, AptoMedicoInfo, Adherente, PreciosInvitadosConfig } from '@/types';
import { mockSocios, mockRevisiones } from '../mockData';
import { generateId } from '../helpers';
import { parseISO, isValid, formatISO } from 'date-fns';


const KEYS = {
  SOCIOS: 'firestore/socios',
  REVISIONES: 'firestore/revisionesMedicas',
  CUMPLEANOS: 'firestore/solicitudesCumpleanos',
  INVITADOS_DIARIOS: 'firestore/solicitudesInvitadosDiarios',
  PRECIOS_INVITADOS: 'firestore/preciosInvitados',
};

// Helper function to get data from localStorage
const getDb = <T>(key: string): T[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

// Helper function to get a single config object
const getConfig = <T>(key: string, defaultConfig: T): T => {
  if (typeof window === 'undefined') return defaultConfig;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultConfig;
}

// Helper function to save data to localStorage and dispatch event
const saveDbAndNotify = <T>(key: string, data: T[] | T, isConfig: boolean = false): void => { // Allow T for config
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(`${key}Updated`)); 

  if (key === KEYS.SOCIOS) window.dispatchEvent(new CustomEvent('sociosDBUpdated'));
  if (key === KEYS.CUMPLEANOS) window.dispatchEvent(new CustomEvent('cumpleanosDBUpdated'));
  if (key === KEYS.INVITADOS_DIARIOS) window.dispatchEvent(new CustomEvent('invitadosDiariosDBUpdated'));
  if (key === KEYS.REVISIONES) window.dispatchEvent(new CustomEvent('revisionesDBUpdated'));
  if (key === KEYS.PRECIOS_INVITADOS) window.dispatchEvent(new CustomEvent('preciosInvitadosDBUpdated'));
};


// Initialize DBs if they don't exist
export const initializeSociosDB = (): void => {
  if (typeof window === 'undefined') return;

  // Always initialize from mockSocios for development to ensure data freshness
  console.log(`Initializing/Re-initializing ${KEYS.SOCIOS} from mockData.ts.`);

  const sociosToStore = mockSocios.map(socio => {
    const stringifyDate = (dateField: string | Date | undefined | null): string | undefined => {
      if (dateField instanceof Date) return dateField.toISOString();
      if (typeof dateField === 'string') return dateField; // Assume already ISO string
      return undefined;
    };
    const stringifyDateOrEpoch = (dateField: string | Date | undefined | null): string => {
      if (dateField instanceof Date) return dateField.toISOString();
      if (typeof dateField === 'string') return dateField;
      return new Date(0).toISOString(); // Default to epoch if undefined/null
    };

    return {
    ...socio,
    fechaNacimiento: stringifyDateOrEpoch(socio.fechaNacimiento),
    miembroDesde: stringifyDateOrEpoch(socio.miembroDesde),
    ultimaRevisionMedica: stringifyDate(socio.ultimaRevisionMedica),
    aptoMedico: socio.aptoMedico ? {
        ...socio.aptoMedico,
        fechaEmision: stringifyDate(socio.aptoMedico.fechaEmision),
        fechaVencimiento: stringifyDate(socio.aptoMedico.fechaVencimiento),
    } : undefined,
    grupoFamiliar: socio.grupoFamiliar?.map(familiar => ({
      ...familiar,
      fechaNacimiento: stringifyDateOrEpoch(familiar.fechaNacimiento),
      aptoMedico: familiar.aptoMedico ? {
          ...familiar.aptoMedico,
          fechaEmision: stringifyDate(familiar.aptoMedico.fechaEmision),
          fechaVencimiento: stringifyDate(familiar.aptoMedico.fechaVencimiento),
      } : undefined,
    })) || [],
    adherentes: socio.adherentes?.map(adherente => ({
      ...adherente,
      fechaNacimiento: stringifyDateOrEpoch(adherente.fechaNacimiento),
      aptoMedico: adherente.aptoMedico ? {
          ...adherente.aptoMedico,
          fechaEmision: stringifyDate(adherente.aptoMedico.fechaEmision),
          fechaVencimiento: stringifyDate(adherente.aptoMedico.fechaVencimiento),
      } : undefined,
    })) || [],
    // Ensure all other potential Date fields are stringified
    // cambiosPendientesGrupoFamiliar and its nested dates would also need similar treatment if they were part of mockSocios directly
    // For now, mockSocios doesn't have cambiosPendientesGrupoFamiliar pre-filled with dates.
    };
  });
  saveDbAndNotify(KEYS.SOCIOS, sociosToStore);
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

export const initializePreciosInvitadosDB = (): void => {
  if (typeof window !== 'undefined' && !localStorage.getItem(KEYS.PRECIOS_INVITADOS)) {
    const defaultConfig: PreciosInvitadosConfig = {
      precioInvitadoDiario: 0,
      precioInvitadoCumpleanos: 0,
    };
    saveDbAndNotify(KEYS.PRECIOS_INVITADOS, defaultConfig, true);
  }
};


// --- Socios Service ---
// Function to get socios with dates parsed
const getParsedSocios = (): Socio[] => {
  const sociosRaw = getDb<any>(KEYS.SOCIOS); // Get raw data
  return sociosRaw.map(s => {
    const parseDateSafe = (dateString?: string | null): Date => {
        if (dateString && isValid(parseISO(dateString))) return parseISO(dateString);
        return new Date(0); // Default or invalid date representation
    };
    const parseOptionalDateSafe = (dateString?: string | null): Date | undefined => {
        if (dateString && isValid(parseISO(dateString))) return parseISO(dateString);
        return undefined;
    };
    return {
    ...s,
    fechaNacimiento: parseDateSafe(s.fechaNacimiento),
    miembroDesde: parseDateSafe(s.miembroDesde),
    ultimaRevisionMedica: parseOptionalDateSafe(s.ultimaRevisionMedica),
    aptoMedico: s.aptoMedico ? {
        ...s.aptoMedico,
        fechaEmision: parseOptionalDateSafe(s.aptoMedico.fechaEmision),
        fechaVencimiento: parseOptionalDateSafe(s.aptoMedico.fechaVencimiento),
    } : undefined,
    grupoFamiliar: s.grupoFamiliar?.map((f: any) => ({
      ...f,
      fechaNacimiento: parseDateSafe(f.fechaNacimiento),
      aptoMedico: f.aptoMedico ? {
          ...f.aptoMedico,
          fechaEmision: parseOptionalDateSafe(f.aptoMedico.fechaEmision),
          fechaVencimiento: parseOptionalDateSafe(f.aptoMedico.fechaVencimiento),
      } : undefined,
    })) || [],
     adherentes: s.adherentes?.map((a: any) => ({
      ...a,
      fechaNacimiento: parseDateSafe(a.fechaNacimiento),
      aptoMedico: a.aptoMedico ? {
          ...a.aptoMedico,
          fechaEmision: parseOptionalDateSafe(a.aptoMedico.fechaEmision),
          fechaVencimiento: parseOptionalDateSafe(a.aptoMedico.fechaVencimiento),
      } : undefined,
    })) || [],
    cambiosPendientesGrupoFamiliar: s.cambiosPendientesGrupoFamiliar ? {
        ...s.cambiosPendientesGrupoFamiliar,
        familiares: {
          conyuge: s.cambiosPendientesGrupoFamiliar.familiares?.conyuge ? {
            ...s.cambiosPendientesGrupoFamiliar.familiares.conyuge,
            fechaNacimiento: parseDateSafe(s.cambiosPendientesGrupoFamiliar.familiares.conyuge.fechaNacimiento),
             aptoMedico: s.cambiosPendientesGrupoFamiliar.familiares.conyuge.aptoMedico ? {
                ...s.cambiosPendientesGrupoFamiliar.familiares.conyuge.aptoMedico,
                fechaEmision: parseOptionalDateSafe(s.cambiosPendientesGrupoFamiliar.familiares.conyuge.aptoMedico.fechaEmision),
                fechaVencimiento: parseOptionalDateSafe(s.cambiosPendientesGrupoFamiliar.familiares.conyuge.aptoMedico.fechaVencimiento),
            } : undefined,
          } : null,
          hijos: s.cambiosPendientesGrupoFamiliar.familiares?.hijos?.map((h: any) => ({
              ...h, 
              fechaNacimiento: parseDateSafe(h.fechaNacimiento),
              aptoMedico: h.aptoMedico ? {
                  ...h.aptoMedico,
                  fechaEmision: parseOptionalDateSafe(h.aptoMedico.fechaEmision),
                  fechaVencimiento: parseOptionalDateSafe(h.aptoMedico.fechaVencimiento),
              } : undefined,
          })) || [],
          padres: s.cambiosPendientesGrupoFamiliar.familiares?.padres?.map((p: any) => ({
              ...p, 
              fechaNacimiento: parseDateSafe(p.fechaNacimiento),
              aptoMedico: p.aptoMedico ? {
                  ...p.aptoMedico,
                  fechaEmision: parseOptionalDateSafe(p.aptoMedico.fechaEmision),
                  fechaVencimiento: parseOptionalDateSafe(p.aptoMedico.fechaVencimiento),
              } : undefined,
          })) || [],
        }
      } : null,
  }});
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
  const sociosRaw = getDb<Socio>(KEYS.SOCIOS); 
  const newNumeroSocio = `S${(Math.max(0, ...sociosRaw.map(s => parseInt(s.numeroSocio.substring(1)))) + 1).toString().padStart(3, '0')}`;

  const stringifyDateOrEpoch = (dateField: string | Date | undefined | null): string => {
    if (dateField instanceof Date) return dateField.toISOString();
    if (typeof dateField === 'string') return dateField; // Assume already ISO string
    return new Date(0).toISOString();
  };

  const nuevoSocioRaw: any = {
    ...socioData,
    fechaNacimiento: stringifyDateOrEpoch(socioData.fechaNacimiento),
    id: generateId(),
    numeroSocio: newNumeroSocio,
    estadoSocio: isTitularSignup ? 'Pendiente Validacion' : 'Activo',
    role: 'socio',
    miembroDesde: new Date().toISOString(),
    grupoFamiliar: socioData.grupoFamiliar?.map(f => ({...f, fechaNacimiento: stringifyDateOrEpoch(f.fechaNacimiento)})) || [],
    adherentes: [], 
    aptoMedico: socioData.aptoMedico ? {
        ...socioData.aptoMedico,
        fechaEmision: socioData.aptoMedico.fechaEmision instanceof Date ? socioData.aptoMedico.fechaEmision.toISOString() : socioData.aptoMedico.fechaEmision,
        fechaVencimiento: socioData.aptoMedico.fechaVencimiento instanceof Date ? socioData.aptoMedico.fechaVencimiento.toISOString() : socioData.aptoMedico.fechaVencimiento,
    } : { valido: false, razonInvalidez: 'Pendiente de presentación' },
  };
  saveDbAndNotify(KEYS.SOCIOS, [...sociosRaw, nuevoSocioRaw]);
  return { ...nuevoSocioRaw, fechaNacimiento: parseISO(nuevoSocioRaw.fechaNacimiento as string) }; 
};

// Function to update a socio in the raw DB (expects dates as ISO strings)
const updateSocioInDb = (updatedSocioRaw: any): Socio | null => {
  let sociosRaw = getDb<any>(KEYS.SOCIOS);
  const index = sociosRaw.findIndex(s => s.id === updatedSocioRaw.id);
  if (index > -1) {
    sociosRaw[index] = updatedSocioRaw; 
    saveDbAndNotify(KEYS.SOCIOS, sociosRaw);
    
    const parseDateSafe = (dateString?: string | null): Date => {
        if (dateString && isValid(parseISO(dateString))) return parseISO(dateString);
        return new Date(0);
    };
     const parseOptionalDateSafe = (dateString?: string | null): Date | undefined => {
        if (dateString && isValid(parseISO(dateString))) return parseISO(dateString);
        return undefined;
    };

    return {
      ...updatedSocioRaw,
      fechaNacimiento: parseDateSafe(updatedSocioRaw.fechaNacimiento),
      miembroDesde: parseDateSafe(updatedSocioRaw.miembroDesde),
      ultimaRevisionMedica: parseOptionalDateSafe(updatedSocioRaw.ultimaRevisionMedica),
      aptoMedico: updatedSocioRaw.aptoMedico ? {
        ...updatedSocioRaw.aptoMedico,
        fechaEmision: parseOptionalDateSafe(updatedSocioRaw.aptoMedico.fechaEmision),
        fechaVencimiento: parseOptionalDateSafe(updatedSocioRaw.aptoMedico.fechaVencimiento),
      } : undefined,
      cambiosPendientesGrupoFamiliar: updatedSocioRaw.cambiosPendientesGrupoFamiliar ? {
        ...updatedSocioRaw.cambiosPendientesGrupoFamiliar,
        familiares: {
          conyuge: updatedSocioRaw.cambiosPendientesGrupoFamiliar.familiares?.conyuge ? {
            ...updatedSocioRaw.cambiosPendientesGrupoFamiliar.familiares.conyuge,
            fechaNacimiento: parseDateSafe(updatedSocioRaw.cambiosPendientesGrupoFamiliar.familiares.conyuge.fechaNacimiento),
             aptoMedico: updatedSocioRaw.cambiosPendientesGrupoFamiliar.familiares.conyuge.aptoMedico ? {
                ...updatedSocioRaw.cambiosPendientesGrupoFamiliar.familiares.conyuge.aptoMedico,
                fechaEmision: parseOptionalDateSafe(updatedSocioRaw.cambiosPendientesGrupoFamiliar.familiares.conyuge.aptoMedico.fechaEmision),
                fechaVencimiento: parseOptionalDateSafe(updatedSocioRaw.cambiosPendientesGrupoFamiliar.familiares.conyuge.aptoMedico.fechaVencimiento),
            } : undefined,
          } : null,
          hijos: updatedSocioRaw.cambiosPendientesGrupoFamiliar.familiares?.hijos?.map((h: any) => ({
              ...h, 
              fechaNacimiento: parseDateSafe(h.fechaNacimiento),
              aptoMedico: h.aptoMedico ? {
                  ...h.aptoMedico,
                  fechaEmision: parseOptionalDateSafe(h.aptoMedico.fechaEmision),
                  fechaVencimiento: parseOptionalDateSafe(h.aptoMedico.fechaVencimiento),
              } : undefined,
          })) || [],
          padres: updatedSocioRaw.cambiosPendientesGrupoFamiliar.familiares?.padres?.map((p: any) => ({
              ...p, 
              fechaNacimiento: parseDateSafe(p.fechaNacimiento),
              aptoMedico: p.aptoMedico ? {
                  ...p.aptoMedico,
                  fechaEmision: parseOptionalDateSafe(p.aptoMedico.fechaEmision),
                  fechaVencimiento: parseOptionalDateSafe(p.aptoMedico.fechaVencimiento),
              } : undefined,
            })) || [],
        }
      } : null,
      grupoFamiliar: updatedSocioRaw.grupoFamiliar?.map((f: any) => ({
        ...f,
        fechaNacimiento: parseDateSafe(f.fechaNacimiento),
        aptoMedico: f.aptoMedico ? {
          ...f.aptoMedico,
          fechaEmision: parseOptionalDateSafe(f.aptoMedico.fechaEmision),
          fechaVencimiento: parseOptionalDateSafe(f.aptoMedico.fechaVencimiento),
        } : undefined,
      })) || [],
      adherentes: updatedSocioRaw.adherentes?.map((a: any) => ({
        ...a,
        fechaNacimiento: parseDateSafe(a.fechaNacimiento),
        aptoMedico: a.aptoMedico ? {
          ...a.aptoMedico,
          fechaEmision: parseOptionalDateSafe(a.aptoMedico.fechaEmision),
          fechaVencimiento: parseOptionalDateSafe(a.aptoMedico.fechaVencimiento),
        } : undefined,
      })) || [],
    };
  }
  return null;
};


export const updateSocio = async (updatedSocio: Socio): Promise<Socio | null> => {
  const stringifyDate = (dateField: string | Date | undefined | null): string | undefined => {
    if (dateField instanceof Date) return dateField.toISOString();
    if (typeof dateField === 'string') return dateField;
    return undefined;
  };
   const stringifyDateOrEpoch = (dateField: string | Date | undefined | null): string => {
    if (dateField instanceof Date) return dateField.toISOString();
    if (typeof dateField === 'string') return dateField; // Assume already ISO string
    return new Date(0).toISOString();
  };

  const socioToSave = {
    ...updatedSocio,
    fechaNacimiento: stringifyDateOrEpoch(updatedSocio.fechaNacimiento),
    miembroDesde: stringifyDateOrEpoch(updatedSocio.miembroDesde),
    ultimaRevisionMedica: stringifyDate(updatedSocio.ultimaRevisionMedica),
    aptoMedico: updatedSocio.aptoMedico ? {
        ...updatedSocio.aptoMedico,
        fechaEmision: stringifyDate(updatedSocio.aptoMedico.fechaEmision),
        fechaVencimiento: stringifyDate(updatedSocio.aptoMedico.fechaVencimiento),
    } : undefined,
    cambiosPendientesGrupoFamiliar: updatedSocio.cambiosPendientesGrupoFamiliar ? {
        ...updatedSocio.cambiosPendientesGrupoFamiliar,
        familiares: {
            conyuge: updatedSocio.cambiosPendientesGrupoFamiliar.familiares?.conyuge ? {
                ...updatedSocio.cambiosPendientesGrupoFamiliar.familiares.conyuge,
                fechaNacimiento: stringifyDateOrEpoch(updatedSocio.cambiosPendientesGrupoFamiliar.familiares.conyuge.fechaNacimiento),
                aptoMedico: updatedSocio.cambiosPendientesGrupoFamiliar.familiares.conyuge.aptoMedico ? {
                    ...updatedSocio.cambiosPendientesGrupoFamiliar.familiares.conyuge.aptoMedico,
                    fechaEmision: stringifyDate(updatedSocio.cambiosPendientesGrupoFamiliar.familiares.conyuge.aptoMedico.fechaEmision),
                    fechaVencimiento: stringifyDate(updatedSocio.cambiosPendientesGrupoFamiliar.familiares.conyuge.aptoMedico.fechaVencimiento),
                } : undefined,
            } : null,
            hijos: updatedSocio.cambiosPendientesGrupoFamiliar.familiares?.hijos?.map(h => ({
                ...h,
                fechaNacimiento: stringifyDateOrEpoch(h.fechaNacimiento),
                aptoMedico: h.aptoMedico ? {
                    ...h.aptoMedico,
                    fechaEmision: stringifyDate(h.aptoMedico.fechaEmision),
                    fechaVencimiento: stringifyDate(h.aptoMedico.fechaVencimiento),
                } : undefined,
            })) || [],
            padres: updatedSocio.cambiosPendientesGrupoFamiliar.familiares?.padres?.map(p => ({
                ...p,
                fechaNacimiento: stringifyDateOrEpoch(p.fechaNacimiento),
                aptoMedico: p.aptoMedico ? {
                    ...p.aptoMedico,
                    fechaEmision: stringifyDate(p.aptoMedico.fechaEmision),
                    fechaVencimiento: stringifyDate(p.aptoMedico.fechaVencimiento),
                } : undefined,
            })) || [],
        }
    } : null,
    grupoFamiliar: updatedSocio.grupoFamiliar?.map(f => ({
      ...f,
      fechaNacimiento: stringifyDateOrEpoch(f.fechaNacimiento),
       aptoMedico: f.aptoMedico ? {
        ...f.aptoMedico,
        fechaEmision: stringifyDate(f.aptoMedico.fechaEmision),
        fechaVencimiento: stringifyDate(f.aptoMedico.fechaVencimiento),
      } : undefined,
    })) || [],
     adherentes: updatedSocio.adherentes?.map(a => ({
        ...a,
        fechaNacimiento: stringifyDateOrEpoch(a.fechaNacimiento),
        aptoMedico: a.aptoMedico ? {
          ...a.aptoMedico,
          fechaEmision: stringifyDate(a.aptoMedico.fechaEmision),
          fechaVencimiento: stringifyDate(a.aptoMedico.fechaVencimiento),
        } : undefined,
    })) || [],
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
  revisiones.unshift(nuevaRevision); // Add to the beginning
  saveDbAndNotify(KEYS.REVISIONES, revisiones);

  const socio = await getSocioByNumeroSocioOrDNI(nuevaRevision.socioId);
  if (socio) {
    const aptoInfo: AptoMedicoInfo = {
      valido: nuevaRevision.resultado === 'Apto',
      fechaEmision: nuevaRevision.fechaRevision, // Already ISO string
      fechaVencimiento: nuevaRevision.fechaVencimientoApto, // Already ISO string or undefined
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
    const solicitudesRaw = getDb<SolicitudCumpleanos>(KEYS.CUMPLEANOS); 
    const solicitudToSave: SolicitudCumpleanos = {
        ...solicitud,
        id: generateId(),
        fechaSolicitud: new Date().toISOString(),
        estado: solicitud.estado || 'Aprobada', // Default if not provided
        titularIngresadoEvento: false,
        fechaEvento: solicitud.fechaEvento instanceof Date ? solicitud.fechaEvento.toISOString() : solicitud.fechaEvento, // Ensure ISO string
    };
    saveDbAndNotify(KEYS.CUMPLEANOS, [...solicitudesRaw, solicitudToSave]);
    return {...solicitudToSave, fechaEvento: parseISO(solicitudToSave.fechaEvento as string)};
};

export const updateSolicitudCumpleanos = async (updatedSolicitud: SolicitudCumpleanos): Promise<SolicitudCumpleanos | null> => {
    let solicitudesRaw = getDb<SolicitudCumpleanos>(KEYS.CUMPLEANOS); 
    const index = solicitudesRaw.findIndex(s => s.id === updatedSolicitud.id);
    if (index > -1) {
        const solicitudToSave = {
            ...updatedSolicitud,
            fechaEvento: updatedSolicitud.fechaEvento instanceof Date ? updatedSolicitud.fechaEvento.toISOString() : updatedSolicitud.fechaEvento,
        };
        solicitudesRaw[index] = solicitudToSave;
        saveDbAndNotify(KEYS.CUMPLEANOS, solicitudesRaw);
        return {...solicitudToSave, fechaEvento: parseISO(solicitudToSave.fechaEvento as string)};
    }
    return null;
};

// --- Solicitudes Invitados Diarios Service ---
export const getAllSolicitudesInvitadosDiarios = async (): Promise<SolicitudInvitadosDiarios[]> => {
    const solicitudesRaw = getDb<SolicitudInvitadosDiarios>(KEYS.INVITADOS_DIARIOS);
    return solicitudesRaw.map(s => ({
        ...s,
        listaInvitadosDiarios: s.listaInvitadosDiarios.map(inv => ({
            ...inv,
            fechaNacimiento: inv.fechaNacimiento && typeof inv.fechaNacimiento === 'string' ? inv.fechaNacimiento : undefined, // Already stored as string or undefined
        }))
    }));
};

export const getSolicitudInvitadosDiarios = async (idSocioTitular: string, fechaISO: string): Promise<SolicitudInvitadosDiarios | null> => {
    const todas = await getAllSolicitudesInvitadosDiarios();
    return todas.find(s => s.idSocioTitular === idSocioTitular && s.fecha === fechaISO) || null;
};

export const addOrUpdateSolicitudInvitadosDiarios = async (solicitud: SolicitudInvitadosDiarios): Promise<SolicitudInvitadosDiarios> => {
    let solicitudesRaw = getDb<SolicitudInvitadosDiarios>(KEYS.INVITADOS_DIARIOS);
    const index = solicitudesRaw.findIndex(s => s.id === solicitud.id || (s.idSocioTitular === solicitud.idSocioTitular && s.fecha === solicitud.fecha));

    const solicitudToSave: SolicitudInvitadosDiarios = {
        ...solicitud,
        listaInvitadosDiarios: solicitud.listaInvitadosDiarios.map(inv => ({
            ...inv,
            fechaNacimiento: inv.fechaNacimiento instanceof Date ? formatISO(inv.fechaNacimiento, {representation: 'date'}) : (typeof inv.fechaNacimiento === 'string' ? inv.fechaNacimiento : undefined)
        }))
    };
    
    if (index > -1) {
        solicitudesRaw[index] = solicitudToSave;
    } else {
        solicitudesRaw.push(solicitudToSave);
    }
    saveDbAndNotify(KEYS.INVITADOS_DIARIOS, solicitudesRaw);
    return solicitudToSave; 
};

export const updateSolicitudInvitadosDiarios = async (updatedSolicitud: SolicitudInvitadosDiarios): Promise<SolicitudInvitadosDiarios | null> => {
    let solicitudesRaw = getDb<SolicitudInvitadosDiarios>(KEYS.INVITADOS_DIARIOS);
    const index = solicitudesRaw.findIndex(s => s.id === updatedSolicitud.id);

    const solicitudToSave: SolicitudInvitadosDiarios = {
        ...updatedSolicitud,
        listaInvitadosDiarios: updatedSolicitud.listaInvitadosDiarios.map(inv => ({
            ...inv,
            fechaNacimiento: inv.fechaNacimiento instanceof Date ? formatISO(inv.fechaNacimiento, {representation: 'date'}) : (typeof inv.fechaNacimiento === 'string' ? inv.fechaNacimiento : undefined)
        }))
    };

    if (index > -1) {
        solicitudesRaw[index] = solicitudToSave;
        saveDbAndNotify(KEYS.INVITADOS_DIARIOS, solicitudesRaw);
        return solicitudToSave;
    }
    // Fallback for cases where ID might not have been set initially if it was a new record from client
    const fallbackIndex = solicitudesRaw.findIndex(s => s.idSocioTitular === updatedSolicitud.idSocioTitular && s.fecha === updatedSolicitud.fecha);
    if (fallbackIndex > -1) {
        solicitudesRaw[fallbackIndex] = {...solicitudToSave, id: solicitudesRaw[fallbackIndex].id }; // Ensure ID consistency
        saveDbAndNotify(KEYS.INVITADOS_DIARIOS, solicitudesRaw);
        return solicitudesRaw[fallbackIndex];
    }
    return null;
};

// --- Precios Invitados Service ---
export const getPreciosInvitados = async (): Promise<PreciosInvitadosConfig> => {
  const defaultConfig: PreciosInvitadosConfig = {
    precioInvitadoDiario: 0,
    precioInvitadoCumpleanos: 0,
  };
  return getConfig<PreciosInvitadosConfig>(KEYS.PRECIOS_INVITADOS, defaultConfig);
};

export const updatePreciosInvitados = async (config: PreciosInvitadosConfig): Promise<void> => {
  saveDbAndNotify(KEYS.PRECIOS_INVITADOS, config, true);
};


// Initialize DBs on load
if (typeof window !== 'undefined') {
    initializeSociosDB();
    initializeRevisionesDB();
    initializeCumpleanosDB();
    initializeInvitadosDiariosDB();
    initializePreciosInvitadosDB();
}
isValid(new Date()); // Keep this import for date-fns

    