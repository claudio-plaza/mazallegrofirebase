
'use client';

import type {
  Socio, SocioRaw,
  RevisionMedica, RevisionMedicaRaw,
  SolicitudCumpleanos, SolicitudCumpleanosRaw,
  InvitadoDiario, InvitadoDiarioRaw, SolicitudInvitadosDiarios, SolicitudInvitadosDiariosRaw,
  AptoMedicoInfo, AptoMedicoInfoRaw,
  Adherente, AdherenteRaw,
  PreciosInvitadosConfig,
  TipoPersona,
  Novedad, NovedadRaw,
  AdminEditSocioTitularData,
  MiembroFamiliar, MiembroFamiliarRaw,
  CambiosPendientesGrupoFamiliar, CambiosPendientesGrupoFamiliarRaw
} from '@/types';
import { EstadoSolicitudInvitados } from '@/types';
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

const getDb = <T>(key: string): T[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const getConfig = <T>(key: string, defaultConfig: T): T => {
  if (typeof window === 'undefined') return defaultConfig;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultConfig;
}

const saveDbAndNotify = <T>(key: string, data: T[] | T, isConfig: boolean = false): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(`${key}Updated`));

  const eventMap: Record<string, string> = {
    [KEYS.SOCIOS]: 'sociosDBUpdated',
    [KEYS.CUMPLEANOS]: 'cumpleanosDBUpdated',
    [KEYS.INVITADOS_DIARIOS]: 'firestore/solicitudesInvitadosDiariosUpdated',
    [KEYS.REVISIONES]: 'revisionesDBUpdated',
    [KEYS.PRECIOS_INVITADOS]: 'preciosInvitadosDBUpdated',
    [KEYS.NOVEDADES]: 'firestore/novedadesUpdated',
  };
  if (eventMap[key]) {
    window.dispatchEvent(new CustomEvent(eventMap[key]));
  }
};

// --- Date Conversion Helpers ---
const parseOptionalDate = (dateString?: string | null): Date | undefined => {
  if (!dateString) return undefined;
  const date = parseISO(dateString);
  return isValid(date) ? date : undefined;
};

const parseRequiredDate = (dateString: string): Date => {
  const date = parseISO(dateString);
  return isValid(date) ? date : new Date(0); // Default to epoch if invalid
};

const formatOptionalDate = (date?: Date | string | null): string | undefined => {
  if (!date) return undefined;
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj) ? formatISO(dateObj) : undefined;
};

const formatRequiredDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj) ? formatISO(dateObj) : formatISO(new Date(0));
};

const formatAptoMedicoToRaw = (apto?: AptoMedicoInfo): AptoMedicoInfoRaw | undefined => {
  if (!apto) return undefined;
  return {
    ...apto,
    fechaEmision: formatOptionalDate(apto.fechaEmision),
    fechaVencimiento: formatOptionalDate(apto.fechaVencimiento),
  };
};

const parseAptoMedicoFromRaw = (aptoRaw?: AptoMedicoInfoRaw): AptoMedicoInfo | undefined => {
  if (!aptoRaw) return undefined;
  return {
    ...aptoRaw,
    fechaEmision: parseOptionalDate(aptoRaw.fechaEmision),
    fechaVencimiento: parseOptionalDate(aptoRaw.fechaVencimiento),
  };
};

const formatMiembroFamiliarToRaw = (familiar: MiembroFamiliar): MiembroFamiliarRaw => ({
  ...familiar,
  fechaNacimiento: formatRequiredDate(familiar.fechaNacimiento),
  aptoMedico: formatAptoMedicoToRaw(familiar.aptoMedico),
});

const parseMiembroFamiliarFromRaw = (familiarRaw: MiembroFamiliarRaw): MiembroFamiliar => ({
  ...familiarRaw,
  id: familiarRaw.id || familiarRaw.dni,
  fechaNacimiento: parseRequiredDate(familiarRaw.fechaNacimiento),
  aptoMedico: parseAptoMedicoFromRaw(familiarRaw.aptoMedico),
});

const formatAdherenteToRaw = (adherente: Adherente): AdherenteRaw => ({
  ...adherente,
  fechaNacimiento: formatRequiredDate(adherente.fechaNacimiento),
  aptoMedico: formatAptoMedicoToRaw(adherente.aptoMedico) as AptoMedicoInfoRaw, // Cast because Adherente.aptoMedico is not optional
});

const parseAdherenteFromRaw = (adherenteRaw: AdherenteRaw): Adherente => ({
  ...adherenteRaw,
  id: adherenteRaw.id || adherenteRaw.dni,
  fechaNacimiento: parseRequiredDate(adherenteRaw.fechaNacimiento),
  aptoMedico: parseAptoMedicoFromRaw(adherenteRaw.aptoMedico) as AptoMedicoInfo,
});

const formatCambiosPendientesToRaw = (cambios?: CambiosPendientesGrupoFamiliar | null): CambiosPendientesGrupoFamiliarRaw | null | undefined => {
  if (!cambios) return cambios;
  return {
    ...cambios,
    familiares: cambios.familiares ? {
      conyuge: cambios.familiares.conyuge ? formatMiembroFamiliarToRaw(cambios.familiares.conyuge) : null,
      hijos: cambios.familiares.hijos?.map(formatMiembroFamiliarToRaw),
      padres: cambios.familiares.padres?.map(formatMiembroFamiliarToRaw),
    } : undefined,
  };
};

const parseCambiosPendientesFromRaw = (cambiosRaw?: CambiosPendientesGrupoFamiliarRaw | null): CambiosPendientesGrupoFamiliar | null | undefined => {
  if (!cambiosRaw) return cambiosRaw;
  return {
    ...cambiosRaw,
    familiares: cambiosRaw.familiares ? {
      conyuge: cambiosRaw.familiares.conyuge ? parseMiembroFamiliarFromRaw(cambiosRaw.familiares.conyuge) : null,
      hijos: cambiosRaw.familiares.hijos?.map(parseMiembroFamiliarFromRaw),
      padres: cambiosRaw.familiares.padres?.map(parseMiembroFamiliarFromRaw),
    } : undefined,
  };
};


// --- DB Initialization ---
export const initializeSociosDB = (): void => {
  if (typeof window === 'undefined' || localStorage.getItem(KEYS.SOCIOS)) return;
  const sociosToStore = mockSocios.map(socio => ({
    ...socio,
    fechaNacimiento: formatRequiredDate(socio.fechaNacimiento),
    miembroDesde: formatRequiredDate(socio.miembroDesde),
    ultimaRevisionMedica: formatOptionalDate(socio.ultimaRevisionMedica),
    aptoMedico: formatAptoMedicoToRaw(socio.aptoMedico) as AptoMedicoInfoRaw,
    grupoFamiliar: socio.grupoFamiliar?.map(formatMiembroFamiliarToRaw) || [],
    adherentes: socio.adherentes?.map(formatAdherenteToRaw) || [],
    cambiosPendientesGrupoFamiliar: formatCambiosPendientesToRaw(socio.cambiosPendientesGrupoFamiliar),
  }));
  saveDbAndNotify(KEYS.SOCIOS, sociosToStore);
};

// (Other initializations remain similar, focusing on Socio which is most complex)
export const initializeRevisionesDB = (): void => {
  if (typeof window === 'undefined' || localStorage.getItem(KEYS.REVISIONES)) return;
  const revisionesToStore = mockRevisiones.map(r => ({
      ...r,
      fechaRevision: formatRequiredDate(r.fechaRevision),
      fechaVencimientoApto: formatOptionalDate(r.fechaVencimientoApto),
  }));
  saveDbAndNotify(KEYS.REVISIONES, revisionesToStore);
};

export const initializeCumpleanosDB = (): void => {
  if (typeof window === 'undefined' || localStorage.getItem(KEYS.CUMPLEANOS)) return;
  saveDbAndNotify(KEYS.CUMPLEANOS, []);
};

export const initializeInvitadosDiariosDB = (): void => {
  if (typeof window === 'undefined' || localStorage.getItem(KEYS.INVITADOS_DIARIOS)) return;
  saveDbAndNotify(KEYS.INVITADOS_DIARIOS, []);
};

export const initializePreciosInvitadosDB = (): void => {
  if (typeof window === 'undefined' || localStorage.getItem(KEYS.PRECIOS_INVITADOS)) return;
  const defaultConfig: PreciosInvitadosConfig = {
    precioInvitadoDiario: 0,
    precioInvitadoCumpleanos: 0,
  };
  saveDbAndNotify(KEYS.PRECIOS_INVITADOS, defaultConfig, true);
};

export const initializeNovedadesDB = (): void => {
  if (typeof window === 'undefined' || localStorage.getItem(KEYS.NOVEDADES)) return;
  saveDbAndNotify(KEYS.NOVEDADES, []);
};


// --- Socios Service ---
const getParsedSocios = (): Socio[] => {
  const sociosRaw = getDb<SocioRaw>(KEYS.SOCIOS);
  return sociosRaw.map(sRaw => ({
    ...sRaw,
    fechaNacimiento: parseRequiredDate(sRaw.fechaNacimiento),
    miembroDesde: parseRequiredDate(sRaw.miembroDesde),
    ultimaRevisionMedica: parseOptionalDate(sRaw.ultimaRevisionMedica),
    aptoMedico: parseAptoMedicoFromRaw(sRaw.aptoMedico) as AptoMedicoInfo, // Cast because Socio.aptoMedico is not optional
    grupoFamiliar: sRaw.grupoFamiliar?.map(parseMiembroFamiliarFromRaw) || [],
    adherentes: sRaw.adherentes?.map(parseAdherenteFromRaw) || [],
    cambiosPendientesGrupoFamiliar: parseCambiosPendientesFromRaw(sRaw.cambiosPendientesGrupoFamiliar),
  }));
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
  const sociosRaw = getDb<SocioRaw>(KEYS.SOCIOS);
  const newNumeroSocio = `S${(Math.max(0, ...sociosRaw.map(s => parseInt(s.numeroSocio.substring(1)))) + 1).toString().padStart(3, '0')}`;

  const nuevoSocioRaw: SocioRaw = {
    ...(socioData as Omit<Socio, 'fechaNacimiento' | 'miembroDesde' | 'ultimaRevisionMedica' | 'aptoMedico' | 'grupoFamiliar' | 'adherentes' | 'cambiosPendientesGrupoFamiliar' | 'id' | 'numeroSocio' | 'role'>), // Cast to ensure all base props are there
    id: generateId(),
    numeroSocio: newNumeroSocio,
    role: 'socio',
    estadoSocio: isTitularSignup ? 'Pendiente Validacion' : 'Activo',
    fechaNacimiento: formatRequiredDate(socioData.fechaNacimiento),
    miembroDesde: formatISO(new Date()),
    aptoMedico: formatAptoMedicoToRaw(socioData.aptoMedico) || { valido: false, razonInvalidez: 'Pendiente de presentación' },
    grupoFamiliar: socioData.grupoFamiliar?.map(formatMiembroFamiliarToRaw) || [],
    adherentes: [],
    // fotoUrl will be derived or set based on fotoPerfil
    // ultimaRevisionMedica, cambiosPendientes etc. will be undefined or null initially
  };
  saveDbAndNotify(KEYS.SOCIOS, [...sociosRaw, nuevoSocioRaw]);
  return parseSocioFromRaw(nuevoSocioRaw);
};

const parseSocioFromRaw = (sRaw: SocioRaw): Socio => ({
  ...sRaw,
  fechaNacimiento: parseRequiredDate(sRaw.fechaNacimiento),
  miembroDesde: parseRequiredDate(sRaw.miembroDesde),
  ultimaRevisionMedica: parseOptionalDate(sRaw.ultimaRevisionMedica),
  aptoMedico: parseAptoMedicoFromRaw(sRaw.aptoMedico) as AptoMedicoInfo,
  grupoFamiliar: sRaw.grupoFamiliar?.map(parseMiembroFamiliarFromRaw) || [],
  adherentes: sRaw.adherentes?.map(parseAdherenteFromRaw) || [],
  cambiosPendientesGrupoFamiliar: parseCambiosPendientesFromRaw(sRaw.cambiosPendientesGrupoFamiliar),
});


const updateSocioInDb = (socioId: string, updatedData: Partial<Socio>): Socio | null => {
  let sociosRaw = getDb<SocioRaw>(KEYS.SOCIOS);
  const index = sociosRaw.findIndex(s => s.id === socioId || s.numeroSocio === socioId);

  if (index > -1) {
    const existingSocioRaw = sociosRaw[index];
    const dataToSave: Partial<SocioRaw> = {};

    // Convert Date objects in updatedData to ISO strings for storage
    (Object.keys(updatedData) as Array<keyof Partial<Socio>>).forEach(key => {
      const value = updatedData[key];
      if (key === 'fechaNacimiento' || key === 'miembroDesde' || key === 'ultimaRevisionMedica') {
        (dataToSave as any)[key] = formatOptionalDate(value as Date | string);
      } else if (key === 'aptoMedico') {
        dataToSave.aptoMedico = formatAptoMedicoToRaw(value as AptoMedicoInfo);
      } else if (key === 'grupoFamiliar') {
        dataToSave.grupoFamiliar = (value as MiembroFamiliar[])?.map(formatMiembroFamiliarToRaw);
      } else if (key === 'adherentes') {
        dataToSave.adherentes = (value as Adherente[])?.map(formatAdherenteToRaw);
      } else if (key === 'cambiosPendientesGrupoFamiliar') {
        dataToSave.cambiosPendientesGrupoFamiliar = formatCambiosPendientesToRaw(value as CambiosPendientesGrupoFamiliar | null);
      } else if (key.startsWith('foto') || key === 'fotoUrl') {
        if (value === null) { // Explicitly set to null by form to remove photo
            (dataToSave as any)[key] = null;
        } else if (typeof value === 'string' && value.startsWith('http')) {
            (dataToSave as any)[key] = value;
        } else if (value instanceof FileList && value.length > 0) {
            // Placeholder logic for new files, assuming a string URL is expected in SocioRaw
            (dataToSave as any)[key] = `https://placehold.co/150x150.png?text=NEW_PHOTO_${Date.now()}`;
        } else if (typeof (existingSocioRaw as any)[key] === 'string') {
             // If no new file and not explicitly nulled, keep existing URL
            (dataToSave as any)[key] = (existingSocioRaw as any)[key];
        } else {
            (dataToSave as any)[key] = undefined; // Or null if preferred for cleared photos not yet saved
        }
      } else {
        (dataToSave as any)[key] = value;
      }
    });
    
    sociosRaw[index] = { ...existingSocioRaw, ...dataToSave };

    // Clean up null photo fields before saving if they were meant to be removed
    Object.keys(sociosRaw[index]).forEach(keyStr => {
        const key = keyStr as keyof SocioRaw;
        if ((key.startsWith('foto') || key === 'fotoUrl') && sociosRaw[index][key] === null) {
            delete sociosRaw[index][key];
        }
        if (key === 'grupoFamiliar' && Array.isArray(sociosRaw[index][key])) {
           (sociosRaw[index] as any)[key] = (sociosRaw[index][key] as MiembroFamiliarRaw[]).map((familiar: MiembroFamiliarRaw) => {
                const cleanFamiliar = {...familiar} as any;
                Object.keys(cleanFamiliar).forEach(famKey => {
                    if (famKey.startsWith('foto') && cleanFamiliar[famKey] === null) {
                        delete cleanFamiliar[famKey];
                    }
                });
                return cleanFamiliar;
            });
        }
    });


    saveDbAndNotify(KEYS.SOCIOS, sociosRaw);
    return parseSocioFromRaw(sociosRaw[index]);
  }
  return null;
};

export const updateSocio = async (socioToUpdate: Partial<Socio> & { id: string }): Promise<Socio | null> => {
  return updateSocioInDb(socioToUpdate.id, socioToUpdate);
};

export const deleteSocio = async (socioId: string): Promise<boolean> => {
  let socios = getDb<SocioRaw>(KEYS.SOCIOS);
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
  const revisionesRaw = getDb<RevisionMedicaRaw>(KEYS.REVISIONES);
  return revisionesRaw.map(rRaw => ({
    ...rRaw,
    fechaRevision: parseRequiredDate(rRaw.fechaRevision),
    fechaVencimientoApto: parseOptionalDate(rRaw.fechaVencimientoApto),
  }));
};

export const addRevisionMedica = async (revision: Omit<RevisionMedica, 'id'>): Promise<RevisionMedica> => {
  const revisionesRaw = getDb<RevisionMedicaRaw>(KEYS.REVISIONES);
  const nuevaRevisionRaw: RevisionMedicaRaw = {
    ...revision,
    id: generateId(), // id is generated by this function, not part of Omit
    fechaRevision: formatRequiredDate(revision.fechaRevision),
    fechaVencimientoApto: formatOptionalDate(revision.fechaVencimientoApto),
  };
  revisionesRaw.unshift(nuevaRevisionRaw);
  saveDbAndNotify(KEYS.REVISIONES, revisionesRaw);

  // Update aptoMedico in Socio, Familiar, Adherente, or InvitadoDiario
  if (['Socio Titular', 'Familiar', 'Adherente'].includes(nuevaRevisionRaw.tipoPersona)) {
      const socioIdToUpdate = nuevaRevisionRaw.tipoPersona === 'Socio Titular' ? nuevaRevisionRaw.socioId : nuevaRevisionRaw.idSocioAnfitrion;
      const socio = await getSocioByNumeroSocioOrDNI(socioIdToUpdate!);

      if (socio) {
        const aptoInfo: AptoMedicoInfo = {
          valido: nuevaRevisionRaw.resultado === 'Apto',
          fechaEmision: nuevaRevisionRaw.fechaRevision,
          fechaVencimiento: nuevaRevisionRaw.fechaVencimientoApto,
          observaciones: nuevaRevisionRaw.observaciones,
          razonInvalidez: nuevaRevisionRaw.resultado === 'No Apto' ? (nuevaRevisionRaw.observaciones || 'No Apto según última revisión') : undefined,
        };

        let socioActualizado = { ...socio };
        if (nuevaRevisionRaw.tipoPersona === 'Socio Titular') {
            socioActualizado.aptoMedico = aptoInfo;
            socioActualizado.ultimaRevisionMedica = nuevaRevisionRaw.fechaRevision;
        } else if (nuevaRevisionRaw.tipoPersona === 'Familiar') {
            socioActualizado.grupoFamiliar = socio.grupoFamiliar.map(f =>
                f.dni === nuevaRevisionRaw.socioId ? { ...f, aptoMedico: aptoInfo } : f
            );
        } else if (nuevaRevisionRaw.tipoPersona === 'Adherente') {
            socioActualizado.adherentes = socio.adherentes?.map(a =>
                a.dni === nuevaRevisionRaw.socioId ? { ...a, aptoMedico: aptoInfo } : a
            );
        }
        await updateSocio(socioActualizado);
      }
  } else if (nuevaRevisionRaw.tipoPersona === 'Invitado Diario' && nuevaRevisionRaw.idSocioAnfitrion && nuevaRevisionRaw.fechaRevision) {
    const fechaVisita = formatISO(parseISO(nuevaRevisionRaw.fechaRevision as string), { representation: 'date' });
    const solicitud = await getSolicitudInvitadosDiarios(nuevaRevisionRaw.idSocioAnfitrion, fechaVisita);
    if (solicitud) {
        const aptoInfo: AptoMedicoInfo = {
          valido: nuevaRevisionRaw.resultado === 'Apto',
          fechaEmision: nuevaRevisionRaw.fechaRevision,
          fechaVencimiento: nuevaRevisionRaw.fechaVencimientoApto,
          observaciones: nuevaRevisionRaw.observaciones,
          razonInvalidez: nuevaRevisionRaw.resultado === 'No Apto' ? (nuevaRevisionRaw.observaciones || 'No Apto según última revisión') : undefined,
        };
        const updatedLista = solicitud.listaInvitadosDiarios.map(inv =>
            inv.dni === nuevaRevisionRaw.socioId ? { ...inv, aptoMedico: aptoInfo } : inv
        );
        await addOrUpdateSolicitudInvitadosDiarios({ ...solicitud, listaInvitadosDiarios: updatedLista });
    }
  }
  return {
    ...nuevaRevisionRaw,
    fechaRevision: parseRequiredDate(nuevaRevisionRaw.fechaRevision),
    fechaVencimientoApto: parseOptionalDate(nuevaRevisionRaw.fechaVencimientoApto),
  };
};

// --- Solicitudes Cumpleanos Service ---
export const getAllSolicitudesCumpleanos = async (): Promise<SolicitudCumpleanos[]> => {
    const solicitudesRaw = getDb<SolicitudCumpleanosRaw>(KEYS.CUMPLEANOS);
    return solicitudesRaw.map(sRaw => ({
      ...sRaw,
      fechaEvento: parseRequiredDate(sRaw.fechaEvento),
      fechaSolicitud: parseRequiredDate(sRaw.fechaSolicitud),
    }));
};

export const getSolicitudesCumpleanosBySocio = async (idSocioTitular: string): Promise<SolicitudCumpleanos[]> => {
    const todas = await getAllSolicitudesCumpleanos();
    return todas.filter(s => s.idSocioTitular === idSocioTitular);
};

export const addSolicitudCumpleanos = async (solicitud: Omit<SolicitudCumpleanos, 'id' | 'fechaSolicitud' | 'estado' | 'titularIngresadoEvento'>): Promise<SolicitudCumpleanos> => {
    const solicitudesRaw = getDb<SolicitudCumpleanosRaw>(KEYS.CUMPLEANOS);
    const nuevaSolicitudRaw: SolicitudCumpleanosRaw = {
        ...solicitud,
        id: generateId(),
        fechaSolicitud: formatISO(new Date()),
        estado: solicitud.estado || EstadoSolicitudCumpleanos.APROBADA,
        titularIngresadoEvento: false,
        fechaEvento: formatRequiredDate(solicitud.fechaEvento),
    };
    saveDbAndNotify(KEYS.CUMPLEANOS, [...solicitudesRaw, nuevaSolicitudRaw]);
    return {
        ...nuevaSolicitudRaw,
        fechaEvento: parseRequiredDate(nuevaSolicitudRaw.fechaEvento),
        fechaSolicitud: parseRequiredDate(nuevaSolicitudRaw.fechaSolicitud),
    };
};

export const updateSolicitudCumpleanos = async (updatedSolicitud: SolicitudCumpleanos): Promise<SolicitudCumpleanos | null> => {
    let solicitudesRaw = getDb<SolicitudCumpleanosRaw>(KEYS.CUMPLEANOS);
    const index = solicitudesRaw.findIndex(s => s.id === updatedSolicitud.id);
    if (index > -1) {
        const solicitudToSave: SolicitudCumpleanosRaw = {
            ...updatedSolicitud,
            fechaEvento: formatRequiredDate(updatedSolicitud.fechaEvento),
            fechaSolicitud: formatRequiredDate(updatedSolicitud.fechaSolicitud), // Ensure this is also stringified
        };
        solicitudesRaw[index] = solicitudToSave;
        saveDbAndNotify(KEYS.CUMPLEANOS, solicitudesRaw);
        return {
            ...solicitudToSave,
            fechaEvento: parseRequiredDate(solicitudToSave.fechaEvento),
            fechaSolicitud: parseRequiredDate(solicitudToSave.fechaSolicitud),
        };
    }
    return null;
};

// --- Solicitudes Invitados Diarios Service ---
const parseInvitadoDiarioFromRaw = (invitadoRaw: InvitadoDiarioRaw): InvitadoDiario => ({
    ...invitadoRaw,
    fechaNacimiento: parseOptionalDate(invitadoRaw.fechaNacimiento),
    aptoMedico: parseAptoMedicoFromRaw(invitadoRaw.aptoMedico),
});

const formatInvitadoDiarioToRaw = (invitado: InvitadoDiario): InvitadoDiarioRaw => ({
    ...invitado,
    fechaNacimiento: formatOptionalDate(invitado.fechaNacimiento),
    aptoMedico: formatAptoMedicoToRaw(invitado.aptoMedico),
});

export const getAllSolicitudesInvitadosDiarios = async (): Promise<SolicitudInvitadosDiarios[]> => {
    const solicitudesRaw = getDb<SolicitudInvitadosDiariosRaw>(KEYS.INVITADOS_DIARIOS);
    return solicitudesRaw.map(sRaw => ({
        ...sRaw,
        listaInvitadosDiarios: sRaw.listaInvitadosDiarios.map(parseInvitadoDiarioFromRaw),
        fechaCreacion: parseRequiredDate(sRaw.fechaCreacion),
        fechaUltimaModificacion: parseRequiredDate(sRaw.fechaUltimaModificacion),
    }));
};

export const getSolicitudInvitadosDiarios = async (idSocioTitular: string, fechaISO: string): Promise<SolicitudInvitadosDiarios | null> => {
    const todas = await getAllSolicitudesInvitadosDiarios();
    return todas.find(s => s.idSocioTitular === idSocioTitular && s.fecha === fechaISO) || null;
};

export const addOrUpdateSolicitudInvitadosDiarios = async (solicitud: SolicitudInvitadosDiarios): Promise<SolicitudInvitadosDiarios> => {
    let solicitudesRaw = getDb<SolicitudInvitadosDiariosRaw>(KEYS.INVITADOS_DIARIOS);
    const index = solicitudesRaw.findIndex(s => s.id === solicitud.id || (s.idSocioTitular === solicitud.idSocioTitular && s.fecha === solicitud.fecha));

    const solicitudToSave: SolicitudInvitadosDiariosRaw = {
        ...solicitud,
        fechaCreacion: formatRequiredDate(solicitud.fechaCreacion),
        fechaUltimaModificacion: formatISO(new Date()),
        listaInvitadosDiarios: solicitud.listaInvitadosDiarios.map(formatInvitadoDiarioToRaw),
    };

    if (index > -1) {
        solicitudesRaw[index] = solicitudToSave;
    } else {
        solicitudesRaw.push(solicitudToSave);
    }
    saveDbAndNotify(KEYS.INVITADOS_DIARIOS, solicitudesRaw);

    return {
      ...solicitudToSave,
      listaInvitadosDiarios: solicitudToSave.listaInvitadosDiarios.map(parseInvitadoDiarioFromRaw),
      fechaCreacion: parseRequiredDate(solicitudToSave.fechaCreacion),
      fechaUltimaModificacion: parseRequiredDate(solicitudToSave.fechaUltimaModificacion),
    };
};

export const updateSolicitudInvitadosDiarios = async (updatedSolicitud: SolicitudInvitadosDiarios): Promise<SolicitudInvitadosDiarios | null> => {
    let solicitudesRaw = getDb<SolicitudInvitadosDiariosRaw>(KEYS.INVITADOS_DIARIOS);
    const index = solicitudesRaw.findIndex(s => s.id === updatedSolicitud.id);

    const solicitudToSave: SolicitudInvitadosDiariosRaw = {
        ...updatedSolicitud,
        fechaCreacion: formatRequiredDate(updatedSolicitud.fechaCreacion),
        fechaUltimaModificacion: formatISO(new Date()),
        listaInvitadosDiarios: updatedSolicitud.listaInvitadosDiarios.map(formatInvitadoDiarioToRaw),
    };

    if (index > -1) {
        solicitudesRaw[index] = solicitudToSave;
    } else {
        const fallbackIndex = solicitudesRaw.findIndex(s => s.idSocioTitular === updatedSolicitud.idSocioTitular && s.fecha === updatedSolicitud.fecha);
        if (fallbackIndex > -1) {
            solicitudesRaw[fallbackIndex] = {...solicitudToSave, id: solicitudesRaw[fallbackIndex].id };
            saveDbAndNotify(KEYS.INVITADOS_DIARIOS, solicitudesRaw);
        } else {
          return null; // No se encontró para actualizar
        }
    }
    saveDbAndNotify(KEYS.INVITADOS_DIARIOS, solicitudesRaw);
    return {
      ...solicitudToSave,
      listaInvitadosDiarios: solicitudToSave.listaInvitadosDiarios.map(parseInvitadoDiarioFromRaw),
      fechaCreacion: parseRequiredDate(solicitudToSave.fechaCreacion),
      fechaUltimaModificacion: parseRequiredDate(solicitudToSave.fechaUltimaModificacion),
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
  const novedadesRaw = getDb<NovedadRaw>(KEYS.NOVEDADES);
  return novedadesRaw.map((nRaw: NovedadRaw) => ({
    ...nRaw,
    fechaCreacion: parseRequiredDate(nRaw.fechaCreacion),
    fechaVencimiento: parseOptionalDate(nRaw.fechaVencimiento),
  }));
};

export const getNovedades = async (): Promise<Novedad[]> => {
  return getParsedNovedades().sort((a, b) => {
    return (b.fechaCreacion as Date).getTime() - (a.fechaCreacion as Date).getTime();
  });
};

export const addNovedad = async (novedadData: Omit<Novedad, 'id' | 'fechaCreacion'>): Promise<Novedad> => {
  const novedadesRaw = getDb<NovedadRaw>(KEYS.NOVEDADES);
  const nuevaNovedadRaw: NovedadRaw = {
    ...novedadData,
    id: generateId(),
    fechaCreacion: formatISO(new Date()),
    fechaVencimiento: formatOptionalDate(novedadData.fechaVencimiento),
  };
  saveDbAndNotify(KEYS.NOVEDADES, [...novedadesRaw, nuevaNovedadRaw]);
  return {
    ...nuevaNovedadRaw,
    fechaCreacion: parseRequiredDate(nuevaNovedadRaw.fechaCreacion),
    fechaVencimiento: parseOptionalDate(nuevaNovedadRaw.fechaVencimiento),
  };
};

export const updateNovedad = async (updatedNovedad: Novedad): Promise<Novedad | null> => {
  let novedadesRaw = getDb<NovedadRaw>(KEYS.NOVEDADES);
  const index = novedadesRaw.findIndex((n: NovedadRaw) => n.id === updatedNovedad.id);
  if (index > -1) {
    const novedadToSave: NovedadRaw = {
        ...updatedNovedad,
        fechaCreacion: formatRequiredDate(updatedNovedad.fechaCreacion),
        fechaVencimiento: formatOptionalDate(updatedNovedad.fechaVencimiento),
    };
    novedadesRaw[index] = novedadToSave;
    saveDbAndNotify(KEYS.NOVEDADES, novedadesRaw);
    return {
      ...novedadToSave,
      fechaCreacion: parseRequiredDate(novedadToSave.fechaCreacion),
      fechaVencimiento: parseOptionalDate(novedadToSave.fechaVencimiento),
    };
  }
  return null;
};

export const deleteNovedad = async (novedadId: string): Promise<boolean> => {
  let novedades = getDb<NovedadRaw>(KEYS.NOVEDADES);
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
