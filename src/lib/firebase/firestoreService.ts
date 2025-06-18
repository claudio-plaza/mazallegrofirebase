
'use client';

import type { Socio, RevisionMedica, SolicitudCumpleanos, InvitadoCumpleanos, SolicitudInvitadosDiarios, InvitadoDiario, AptoMedicoInfo, Adherente, PreciosInvitadosConfig, TipoPersona, Novedad, AdminEditSocioTitularData } from '@/types';
import { EstadoSolicitudInvitados } from '@/types'; // Importar el nuevo enum
import { mockSocios, mockRevisiones } from '../mockData';
import { generateId, normalizeText } from '../helpers';
import { parseISO, isValid, formatISO } from 'date-fns';


const KEYS = {
  SOCIOS: 'firestore/socios',
  REVISIONES: 'firestore/revisionesMedicas',
  CUMPLEANOS: 'firestore/solicitudesCumpleanos',
  INVITADOS_DIARIOS: 'firestore/solicitudesInvitadosDiarios',
  PRECIOS_INVITADOS: 'firestore/preciosInvitados',
  NOVEDADES: 'firestore/novedades',
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
const saveDbAndNotify = <T>(key: string, data: T[] | T, isConfig: boolean = false): void => { 
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(`${key}Updated`)); 

  if (key === KEYS.SOCIOS) window.dispatchEvent(new CustomEvent('sociosDBUpdated'));
  if (key === KEYS.CUMPLEANOS) window.dispatchEvent(new CustomEvent('cumpleanosDBUpdated'));
  if (key === KEYS.INVITADOS_DIARIOS) window.dispatchEvent(new CustomEvent('firestore/solicitudesInvitadosDiariosUpdated')); // Asegurarse que el evento sea consistente
  if (key === KEYS.REVISIONES) window.dispatchEvent(new CustomEvent('revisionesDBUpdated'));
  if (key === KEYS.PRECIOS_INVITADOS) window.dispatchEvent(new CustomEvent('preciosInvitadosDBUpdated'));
  if (key === KEYS.NOVEDADES) window.dispatchEvent(new CustomEvent('firestore/novedadesUpdated'));
};


// Initialize DBs if they don't exist
export const initializeSociosDB = (): void => {
  if (typeof window === 'undefined') return;


  const sociosToStore = mockSocios.map(socio => {
    const stringifyDate = (dateField: string | Date | undefined | null): string | undefined => {
      if (dateField instanceof Date) return dateField.toISOString();
      if (typeof dateField === 'string' && isValid(parseISO(dateField))) return dateField; 
      if (typeof dateField === 'string' && isValid(new Date(dateField))) return new Date(dateField).toISOString(); 
      return undefined;
    };
    const stringifyDateOrEpoch = (dateField: string | Date | undefined | null): string => {
      if (dateField instanceof Date) return dateField.toISOString();
      if (typeof dateField === 'string' && isValid(parseISO(dateField))) return dateField;
      if (typeof dateField === 'string' && isValid(new Date(dateField))) return new Date(dateField).toISOString();
      return new Date(0).toISOString(); 
    };

    const processedSocio = {
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
    };
    
    return processedSocio;
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

export const initializeNovedadesDB = (): void => {
  if (typeof window !== 'undefined' && !localStorage.getItem(KEYS.NOVEDADES)) {
    saveDbAndNotify(KEYS.NOVEDADES, []);
  }
};


// --- Socios Service ---
// Function to get socios with dates parsed
const getParsedSocios = (): Socio[] => {
  const sociosRaw = getDb<any>(KEYS.SOCIOS); 
  return sociosRaw.map(s => {
    const parseDateSafe = (dateString?: string | null): Date => {
        if (dateString && isValid(parseISO(dateString))) return parseISO(dateString);
        return new Date(0); 
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
  return socios.find(s => s.id === id || s.numeroSocio === id) || null;
};

export const getSocioByNumeroSocioOrDNI = async (searchTerm: string): Promise<Socio | null> => {
  const socios = await getSocios();
  const normalizedSearchTerm = normalizeText(searchTerm);
  return socios.find(s =>
    normalizeText(s.numeroSocio).includes(normalizedSearchTerm) ||
    normalizeText(s.dni).includes(normalizedSearchTerm) ||
    normalizeText(s.nombre).includes(normalizedSearchTerm) ||
    normalizeText(s.apellido).includes(normalizedSearchTerm) ||
    normalizeText(`${s.nombre} ${s.apellido}`).includes(normalizedSearchTerm)
  ) || null;
};


export const addSocio = async (socioData: Omit<Socio, 'id' | 'numeroSocio' | 'role' | 'adherentes'>, isTitularSignup: boolean = false): Promise<Socio> => {
  const sociosRaw = getDb<Socio>(KEYS.SOCIOS); 
  const newNumeroSocio = `S${(Math.max(0, ...sociosRaw.map(s => parseInt(s.numeroSocio.substring(1)))) + 1).toString().padStart(3, '0')}`;

  const stringifyDateOrEpoch = (dateField: string | Date | undefined | null): string => {
    if (dateField instanceof Date) return dateField.toISOString();
    if (typeof dateField === 'string' && isValid(parseISO(dateField))) return dateField;
    if (typeof dateField === 'string' && isValid(new Date(dateField))) return new Date(dateField).toISOString();
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

const updateSocioInDb = (socioId: string, updatedData: Partial<Socio>): Socio | null => {
  let sociosRaw = getDb<any>(KEYS.SOCIOS);
  const index = sociosRaw.findIndex(s => s.id === socioId || s.numeroSocio === socioId);
  
  if (index > -1) {
    const stringifyDate = (dateField: string | Date | undefined | null): string | undefined => {
        if (dateField instanceof Date) return dateField.toISOString();
        if (typeof dateField === 'string' && (isValid(parseISO(dateField)) || isValid(new Date(dateField)))) return dateField;
        return undefined;
    };
     const stringifyDateOrEpoch = (dateField: string | Date | undefined | null): string => {
        if (dateField instanceof Date) return dateField.toISOString();
        if (typeof dateField === 'string' && (isValid(parseISO(dateField)) || isValid(new Date(dateField)))) return dateField;
        return new Date(0).toISOString();
    };

    const dataToSave = { ...updatedData };
    // Stringify dates coming from the form if they are Date objects
    if (dataToSave.fechaNacimiento instanceof Date) dataToSave.fechaNacimiento = formatISO(dataToSave.fechaNacimiento);
    if (dataToSave.miembroDesde instanceof Date) dataToSave.miembroDesde = formatISO(dataToSave.miembroDesde);
    if (dataToSave.ultimaRevisionMedica instanceof Date) dataToSave.ultimaRevisionMedica = formatISO(dataToSave.ultimaRevisionMedica);
    
    if (dataToSave.aptoMedico) {
        if (dataToSave.aptoMedico.fechaEmision instanceof Date) dataToSave.aptoMedico.fechaEmision = formatISO(dataToSave.aptoMedico.fechaEmision);
        if (dataToSave.aptoMedico.fechaVencimiento instanceof Date) dataToSave.aptoMedico.fechaVencimiento = formatISO(dataToSave.aptoMedico.fechaVencimiento);
    }
    if (dataToSave.grupoFamiliar) {
        dataToSave.grupoFamiliar = dataToSave.grupoFamiliar.map(f => ({
            ...f,
            fechaNacimiento: f.fechaNacimiento instanceof Date ? formatISO(f.fechaNacimiento) : stringifyDateOrEpoch(f.fechaNacimiento),
            aptoMedico: f.aptoMedico ? {
                ...f.aptoMedico,
                fechaEmision: f.aptoMedico.fechaEmision instanceof Date ? formatISO(f.aptoMedico.fechaEmision) : stringifyDate(f.aptoMedico.fechaEmision),
                fechaVencimiento: f.aptoMedico.fechaVencimiento instanceof Date ? formatISO(f.aptoMedico.fechaVencimiento) : stringifyDate(f.aptoMedico.fechaVencimiento),
            } : undefined,
        }));
    }
     if (dataToSave.adherentes) {
        dataToSave.adherentes = dataToSave.adherentes.map(a => ({
            ...a,
            fechaNacimiento: a.fechaNacimiento instanceof Date ? formatISO(a.fechaNacimiento) : stringifyDateOrEpoch(a.fechaNacimiento),
            aptoMedico: a.aptoMedico ? {
                ...a.aptoMedico,
                fechaEmision: a.aptoMedico.fechaEmision instanceof Date ? formatISO(a.aptoMedico.fechaEmision) : stringifyDate(a.aptoMedico.fechaEmision),
                fechaVencimiento: a.aptoMedico.fechaVencimiento instanceof Date ? formatISO(a.aptoMedico.fechaVencimiento) : stringifyDate(a.aptoMedico.fechaVencimiento),
            } : undefined,
        }));
    }
     if (dataToSave.cambiosPendientesGrupoFamiliar && dataToSave.cambiosPendientesGrupoFamiliar.familiares) {
        if (dataToSave.cambiosPendientesGrupoFamiliar.familiares.conyuge) {
            const conyuge = dataToSave.cambiosPendientesGrupoFamiliar.familiares.conyuge;
            conyuge.fechaNacimiento = conyuge.fechaNacimiento instanceof Date ? formatISO(conyuge.fechaNacimiento) : stringifyDateOrEpoch(conyuge.fechaNacimiento);
        }
        if (dataToSave.cambiosPendientesGrupoFamiliar.familiares.hijos) {
            dataToSave.cambiosPendientesGrupoFamiliar.familiares.hijos = dataToSave.cambiosPendientesGrupoFamiliar.familiares.hijos.map(h => ({
                ...h,
                fechaNacimiento: h.fechaNacimiento instanceof Date ? formatISO(h.fechaNacimiento) : stringifyDateOrEpoch(h.fechaNacimiento),
            }));
        }
        if (dataToSave.cambiosPendientesGrupoFamiliar.familiares.padres) {
            dataToSave.cambiosPendientesGrupoFamiliar.familiares.padres = dataToSave.cambiosPendientesGrupoFamiliar.familiares.padres.map(p => ({
                ...p,
                fechaNacimiento: p.fechaNacimiento instanceof Date ? formatISO(p.fechaNacimiento) : stringifyDateOrEpoch(p.fechaNacimiento),
            }));
        }
    }

    // Merge ensuring that only fields present in dataToSave update the existing socio
    const existingSocio = sociosRaw[index];
    sociosRaw[index] = { ...existingSocio, ...dataToSave };
    
    // Preserve fields that should not be overwritten by partial updates if not present in dataToSave
    // e.g. fotoUrl, fotoDniFrente, fotoDniDorso, etc.
    // This simple merge assumes dataToSave contains all fields intended for update.
    // For selective photo updates, more complex logic would be needed here or in the calling component
    // to decide whether to keep old photo URLs or use new FileLists.
    // For now, if a photo field is NOT in dataToSave, it means it's not being changed.
    // If a photo field IS in dataToSave but is null/undefined, it means clear it.
    // If it's a FileList, means upload new. (This part is not handled by AdminEditSocioForm yet)

    saveDbAndNotify(KEYS.SOCIOS, sociosRaw);
    
    const parseDateSafe = (dateString?: string | null): Date => {
        if (dateString && isValid(parseISO(dateString))) return parseISO(dateString);
        return new Date(0);
    };
    const parseOptionalDateSafe = (dateString?: string | null): Date | undefined => {
        if (dateString && isValid(parseISO(dateString))) return parseISO(dateString);
        return undefined;
    };

    const resultSocio = sociosRaw[index];
    return {
      ...resultSocio,
      fechaNacimiento: parseDateSafe(resultSocio.fechaNacimiento),
      miembroDesde: parseDateSafe(resultSocio.miembroDesde),
      ultimaRevisionMedica: parseOptionalDateSafe(resultSocio.ultimaRevisionMedica),
      aptoMedico: resultSocio.aptoMedico ? {
        ...resultSocio.aptoMedico,
        fechaEmision: parseOptionalDateSafe(resultSocio.aptoMedico.fechaEmision),
        fechaVencimiento: parseOptionalDateSafe(resultSocio.aptoMedico.fechaVencimiento),
      } : undefined,
       grupoFamiliar: resultSocio.grupoFamiliar?.map((f: any) => ({
        ...f,
        fechaNacimiento: parseDateSafe(f.fechaNacimiento),
        aptoMedico: f.aptoMedico ? {
          ...f.aptoMedico,
          fechaEmision: parseOptionalDateSafe(f.aptoMedico.fechaEmision),
          fechaVencimiento: parseOptionalDateSafe(f.aptoMedico.fechaVencimiento),
        } : undefined,
      })) || [],
      adherentes: resultSocio.adherentes?.map((a: any) => ({
        ...a,
        fechaNacimiento: parseDateSafe(a.fechaNacimiento),
        aptoMedico: a.aptoMedico ? {
          ...a.aptoMedico,
          fechaEmision: parseOptionalDateSafe(a.aptoMedico.fechaEmision),
          fechaVencimiento: parseOptionalDateSafe(a.aptoMedico.fechaVencimiento),
        } : undefined,
      })) || [],
       cambiosPendientesGrupoFamiliar: resultSocio.cambiosPendientesGrupoFamiliar ? {
        ...resultSocio.cambiosPendientesGrupoFamiliar,
        familiares: {
          conyuge: resultSocio.cambiosPendientesGrupoFamiliar.familiares?.conyuge ? {
            ...resultSocio.cambiosPendientesGrupoFamiliar.familiares.conyuge,
            fechaNacimiento: parseDateSafe(resultSocio.cambiosPendientesGrupoFamiliar.familiares.conyuge.fechaNacimiento),
          } : null,
          hijos: resultSocio.cambiosPendientesGrupoFamiliar.familiares?.hijos?.map((h: any) => ({ ...h, fechaNacimiento: parseDateSafe(h.fechaNacimiento) })) || [],
          padres: resultSocio.cambiosPendientesGrupoFamiliar.familiares?.padres?.map((p: any) => ({ ...p, fechaNacimiento: parseDateSafe(p.fechaNacimiento) })) || [],
        }
      } : null,
    };
  }
  return null;
};


export const updateSocio = async (socioToUpdate: Partial<Socio> & { id: string }): Promise<Socio | null> => {
  return updateSocioInDb(socioToUpdate.id, socioToUpdate);
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

  if (['Socio Titular', 'Familiar', 'Adherente'].includes(nuevaRevision.tipoPersona)) {
      const socioIdToUpdate = nuevaRevision.tipoPersona === 'Socio Titular' ? nuevaRevision.socioId : nuevaRevision.idSocioAnfitrion;
      const socio = await getSocioByNumeroSocioOrDNI(socioIdToUpdate!); 
      
      if (socio) {
        const aptoInfo: AptoMedicoInfo = {
          valido: nuevaRevision.resultado === 'Apto',
          fechaEmision: nuevaRevision.fechaRevision, 
          fechaVencimiento: nuevaRevision.fechaVencimientoApto, 
          observaciones: nuevaRevision.observaciones,
          razonInvalidez: nuevaRevision.resultado === 'No Apto' ? (nuevaRevision.observaciones || 'No Apto según última revisión') : undefined,
        };

        let socioActualizado = { ...socio };
        if (nuevaRevision.tipoPersona === 'Socio Titular') {
            socioActualizado.aptoMedico = aptoInfo;
            socioActualizado.ultimaRevisionMedica = nuevaRevision.fechaRevision;
        } else if (nuevaRevision.tipoPersona === 'Familiar') {
            socioActualizado.grupoFamiliar = socio.grupoFamiliar.map(f => 
                f.dni === nuevaRevision.socioId ? { ...f, aptoMedico: aptoInfo } : f
            );
        } else if (nuevaRevision.tipoPersona === 'Adherente') {
            socioActualizado.adherentes = socio.adherentes?.map(a => 
                a.dni === nuevaRevision.socioId ? { ...a, aptoMedico: aptoInfo } : a
            );
        }
        await updateSocio(socioActualizado);
      }
  } else if (nuevaRevision.tipoPersona === 'Invitado Diario' && nuevaRevision.idSocioAnfitrion && nuevaRevision.fechaRevision) {
    const fechaVisita = formatISO(parseISO(nuevaRevision.fechaRevision as string), { representation: 'date' });
    const solicitud = await getSolicitudInvitadosDiarios(nuevaRevision.idSocioAnfitrion, fechaVisita);
    if (solicitud) {
        const aptoInfo: AptoMedicoInfo = {
          valido: nuevaRevision.resultado === 'Apto',
          fechaEmision: nuevaRevision.fechaRevision,
          fechaVencimiento: nuevaRevision.fechaVencimientoApto,
          observaciones: nuevaRevision.observaciones,
          razonInvalidez: nuevaRevision.resultado === 'No Apto' ? (nuevaRevision.observaciones || 'No Apto según última revisión') : undefined,
        };
        const updatedLista = solicitud.listaInvitadosDiarios.map(inv => 
            inv.dni === nuevaRevision.socioId ? { ...inv, aptoMedico: aptoInfo } : inv
        );
        await addOrUpdateSolicitudInvitadosDiarios({ ...solicitud, listaInvitadosDiarios: updatedLista });
    }
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
        estado: solicitud.estado || 'Aprobada', 
        titularIngresadoEvento: false,
        fechaEvento: solicitud.fechaEvento instanceof Date ? solicitud.fechaEvento.toISOString() : solicitud.fechaEvento, 
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
    const parseOptionalDateSafe = (dateString?: string | Date | null): string | undefined => {
        if (!dateString) return undefined;
        if (dateString instanceof Date && isValid(dateString)) return formatISO(dateString, { representation: 'date' });
        if (typeof dateString === 'string' && isValid(parseISO(dateString))) return dateString; // Already ISO
        return undefined;
    };
    const parseAptoMedico = (apto?: AptoMedicoInfo): AptoMedicoInfo | undefined => {
      if (!apto) return undefined;
      return {
        ...apto,
        fechaEmision: parseOptionalDateSafe(apto.fechaEmision),
        fechaVencimiento: parseOptionalDateSafe(apto.fechaVencimiento),
      };
    };

    const solicitudesRaw = getDb<SolicitudInvitadosDiarios>(KEYS.INVITADOS_DIARIOS);
    return solicitudesRaw.map(s => ({
        ...s,
        listaInvitadosDiarios: s.listaInvitadosDiarios.map(inv => ({
            ...inv,
            fechaNacimiento: inv.fechaNacimiento && typeof inv.fechaNacimiento === 'string' ? inv.fechaNacimiento : undefined,
            aptoMedico: parseAptoMedico(inv.aptoMedico),
        }))
    }));
};

export const getSolicitudInvitadosDiarios = async (idSocioTitular: string, fechaISO: string): Promise<SolicitudInvitadosDiarios | null> => {
    const todas = await getAllSolicitudesInvitadosDiarios();
    return todas.find(s => s.idSocioTitular === idSocioTitular && s.fecha === fechaISO) || null;
};

export const addOrUpdateSolicitudInvitadosDiarios = async (solicitud: SolicitudInvitadosDiarios): Promise<SolicitudInvitadosDiarios> => {
    let solicitudesRaw = getDb<any>(KEYS.INVITADOS_DIARIOS); // Usar any temporalmente para la base de datos raw
    const index = solicitudesRaw.findIndex(s => s.id === solicitud.id || (s.idSocioTitular === solicitud.idSocioTitular && s.fecha === solicitud.fecha));

    const stringifyDate = (dateField: string | Date | undefined | null): string | undefined => {
      if (!dateField) return undefined;
      if (dateField instanceof Date && isValid(dateField)) return formatISO(dateField, { representation: 'date' });
      if (typeof dateField === 'string' && isValid(parseISO(dateField))) return dateField;
      return undefined;
    };

    const stringifyAptoMedico = (apto?: AptoMedicoInfo): AptoMedicoInfo | undefined => {
      if (!apto) return undefined;
      return {
        ...apto,
        fechaEmision: stringifyDate(apto.fechaEmision),
        fechaVencimiento: stringifyDate(apto.fechaVencimiento),
      };
    };

    const solicitudToSave: SolicitudInvitadosDiarios = {
        ...solicitud,
        fechaCreacion: solicitud.fechaCreacion ? (isValid(parseISO(solicitud.fechaCreacion as string)) ? solicitud.fechaCreacion as string : formatISO(new Date())) : formatISO(new Date()),
        fechaUltimaModificacion: formatISO(new Date()),
        listaInvitadosDiarios: solicitud.listaInvitadosDiarios.map(inv => ({
            ...inv,
            fechaNacimiento: stringifyDate(inv.fechaNacimiento),
            aptoMedico: stringifyAptoMedico(inv.aptoMedico),
        }))
    };
    
    if (index > -1) {
        solicitudesRaw[index] = solicitudToSave;
    } else {
        solicitudesRaw.push(solicitudToSave);
    }
    saveDbAndNotify(KEYS.INVITADOS_DIARIOS, solicitudesRaw);
    
    // Devolver con fechas parseadas
    const parseDateSafe = (dateString?: string | null): Date => {
        if (dateString && isValid(parseISO(dateString))) return parseISO(dateString);
        return new Date(0); 
    };
    const parseOptionalDateSafe = (dateString?: string | null): Date | undefined => {
        if (dateString && isValid(parseISO(dateString))) return parseISO(dateString);
        return undefined;
    };
    
    return {
      ...solicitudToSave,
      fechaCreacion: parseISO(solicitudToSave.fechaCreacion as string),
      fechaUltimaModificacion: parseISO(solicitudToSave.fechaUltimaModificacion as string),
      listaInvitadosDiarios: solicitudToSave.listaInvitadosDiarios.map(inv => ({
        ...inv,
        fechaNacimiento: inv.fechaNacimiento ? parseDateSafe(inv.fechaNacimiento) : undefined,
        aptoMedico: inv.aptoMedico ? {
            ...inv.aptoMedico,
            fechaEmision: parseOptionalDateSafe(inv.aptoMedico.fechaEmision),
            fechaVencimiento: parseOptionalDateSafe(inv.aptoMedico.fechaVencimiento),
        } : undefined,
      }))
    };
};

export const updateSolicitudInvitadosDiarios = async (updatedSolicitud: SolicitudInvitadosDiarios): Promise<SolicitudInvitadosDiarios | null> => {
    let solicitudesRaw = getDb<any>(KEYS.INVITADOS_DIARIOS);
    const index = solicitudesRaw.findIndex(s => s.id === updatedSolicitud.id);

    const stringifyDate = (dateField: string | Date | undefined | null): string | undefined => {
        if (!dateField) return undefined;
        if (dateField instanceof Date && isValid(dateField)) return formatISO(dateField, { representation: 'date' });
        if (typeof dateField === 'string' && isValid(parseISO(dateField))) return dateField;
        return undefined;
    };
     const stringifyAptoMedico = (apto?: AptoMedicoInfo): AptoMedicoInfo | undefined => {
      if (!apto) return undefined;
      return {
        ...apto,
        fechaEmision: stringifyDate(apto.fechaEmision),
        fechaVencimiento: stringifyDate(apto.fechaVencimiento),
      };
    };

    const solicitudToSave: SolicitudInvitadosDiarios = {
        ...updatedSolicitud,
        fechaCreacion: updatedSolicitud.fechaCreacion ? (isValid(parseISO(updatedSolicitud.fechaCreacion as string)) ? updatedSolicitud.fechaCreacion as string : formatISO(new Date())) : formatISO(new Date()),
        fechaUltimaModificacion: formatISO(new Date()),
        listaInvitadosDiarios: updatedSolicitud.listaInvitadosDiarios.map(inv => ({
            ...inv,
            fechaNacimiento: stringifyDate(inv.fechaNacimiento),
            aptoMedico: stringifyAptoMedico(inv.aptoMedico),
        }))
    };

    if (index > -1) {
        solicitudesRaw[index] = solicitudToSave;
        saveDbAndNotify(KEYS.INVITADOS_DIARIOS, solicitudesRaw);
    } else {
        const fallbackIndex = solicitudesRaw.findIndex(s => s.idSocioTitular === updatedSolicitud.idSocioTitular && s.fecha === updatedSolicitud.fecha);
        if (fallbackIndex > -1) {
            solicitudesRaw[fallbackIndex] = {...solicitudToSave, id: solicitudesRaw[fallbackIndex].id }; 
            saveDbAndNotify(KEYS.INVITADOS_DIARIOS, solicitudesRaw);
        } else {
          return null; // No se encontró para actualizar
        }
    }
    
    const parseDateSafe = (dateString?: string | null): Date => {
        if (dateString && isValid(parseISO(dateString))) return parseISO(dateString);
        return new Date(0); 
    };
    const parseOptionalDateSafe = (dateString?: string | null): Date | undefined => {
        if (dateString && isValid(parseISO(dateString))) return parseISO(dateString);
        return undefined;
    };

     return {
      ...solicitudToSave,
      fechaCreacion: parseISO(solicitudToSave.fechaCreacion as string),
      fechaUltimaModificacion: parseISO(solicitudToSave.fechaUltimaModificacion as string),
      listaInvitadosDiarios: solicitudToSave.listaInvitadosDiarios.map(inv => ({
        ...inv,
        fechaNacimiento: inv.fechaNacimiento ? parseDateSafe(inv.fechaNacimiento) : undefined,
        aptoMedico: inv.aptoMedico ? {
            ...inv.aptoMedico,
            fechaEmision: parseOptionalDateSafe(inv.aptoMedico.fechaEmision),
            fechaVencimiento: parseOptionalDateSafe(inv.aptoMedico.fechaVencimiento),
        } : undefined,
      }))
    };
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

// --- Novedades Service ---
const getParsedNovedades = (): Novedad[] => {
  const novedadesRaw = getDb<any>(KEYS.NOVEDADES);
  return novedadesRaw.map((n: any) => ({
    ...n,
    fechaCreacion: parseISO(n.fechaCreacion as string),
    fechaVencimiento: n.fechaVencimiento ? parseISO(n.fechaVencimiento as string) : null,
  }));
};

export const getNovedades = async (): Promise<Novedad[]> => {
  return getParsedNovedades().sort((a, b) => {
    return new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime();
  });
};

export const addNovedad = async (novedadData: Omit<Novedad, 'id' | 'fechaCreacion'>): Promise<Novedad> => {
  const novedadesRaw = getDb<any>(KEYS.NOVEDADES);
  const nuevaNovedad: Novedad = {
    ...novedadData,
    id: generateId(),
    fechaCreacion: formatISO(new Date()),
    fechaVencimiento: novedadData.fechaVencimiento ? formatISO(new Date(novedadData.fechaVencimiento)) : null,
  };
  saveDbAndNotify(KEYS.NOVEDADES, [...novedadesRaw, nuevaNovedad]);
  return {
    ...nuevaNovedad,
    fechaCreacion: parseISO(nuevaNovedad.fechaCreacion as string),
    fechaVencimiento: nuevaNovedad.fechaVencimiento ? parseISO(nuevaNovedad.fechaVencimiento as string) : null,
  };
};

export const updateNovedad = async (updatedNovedad: Novedad): Promise<Novedad | null> => {
  let novedadesRaw = getDb<any>(KEYS.NOVEDADES);
  const index = novedadesRaw.findIndex((n: any) => n.id === updatedNovedad.id);
  if (index > -1) {
    const novedadToSave = {
        ...updatedNovedad,
        fechaCreacion: formatISO(new Date(updatedNovedad.fechaCreacion)),
        fechaVencimiento: updatedNovedad.fechaVencimiento ? formatISO(new Date(updatedNovedad.fechaVencimiento)) : null,
    };
    novedadesRaw[index] = novedadToSave;
    saveDbAndNotify(KEYS.NOVEDADES, novedadesRaw);
    return {
      ...novedadToSave,
      fechaCreacion: parseISO(novedadToSave.fechaCreacion),
      fechaVencimiento: novedadToSave.fechaVencimiento ? parseISO(novedadToSave.fechaVencimiento) : null,
    };
  }
  return null;
};

export const deleteNovedad = async (novedadId: string): Promise<boolean> => {
  let novedades = getDb<Novedad>(KEYS.NOVEDADES);
  const initialLength = novedades.length;
  novedades = novedades.filter(n => n.id !== novedadId);
  if (novedades.length < initialLength) {
    saveDbAndNotify(KEYS.NOVEDADES, novedades);
    return true;
  }
  return false;
};


if (typeof window !== 'undefined') {
    initializeSociosDB();
    initializeRevisionesDB();
    initializeCumpleanosDB();
    initializeInvitadosDiariosDB();
    initializePreciosInvitadosDB();
    initializeNovedadesDB();
}
isValid(new Date());
