
import { z } from 'zod';
import { subYears, parseISO, isValid, formatISO } from 'date-fns';

export type UserRole = 'socio' | 'portero' | 'medico' | 'administrador';

export const MAX_HIJOS = 12;
export const MAX_PADRES = 2;
export const MAX_INVITADOS_CUMPLEANOS = 15;

export enum RelacionFamiliar {
  CONYUGE = "Conyuge",
  HIJO_A = "Hijo/a",
  PADRE_MADRE = "Padre/Madre",
}

export enum EstadoValidacionFamiliar {
  PENDIENTE = "Pendiente",
  APROBADO = "Aprobado",
  RECHAZADO = "Rechazado",
}

export enum EstadoSolicitudSocio {
  BORRADOR = "Borrador",
  ENVIADA = "Enviada",
  EN_REVISION = "En Revisión",
  APROBADA = "Aprobada",
  RECHAZADA = "Rechazada",
}

export enum EstadoSolicitudCumpleanos {
  PENDIENTE_APROBACION = "Pendiente Aprobación",
  APROBADA = "Aprobada",
  RECHAZADA = "Rechazada",
  REALIZADO = "Realizado",
  CANCELADA = "Cancelada",
}

export enum EstadoCambioGrupoFamiliar {
  NINGUNO = "Ninguno",
  PENDIENTE = "Pendiente",
  APROBADO = "Aprobado",
  RECHAZADO = "Rechazado",
}

export enum EstadoAdherente {
  ACTIVO = "Activo",
  INACTIVO = "Inactivo",
}

export enum EstadoSolicitudAdherente {
  PENDIENTE = "Pendiente",
  APROBADO = "Aprobado",
  RECHAZADO = "Rechazado",
  PENDIENTE_ELIMINACION = "Pendiente Eliminación",
}

export type MetodoPagoInvitado = 'Efectivo' | 'Transferencia' | 'Caja';

export enum EstadoSolicitudInvitados {
  BORRADOR = "Borrador",
  ENVIADA = "Enviada",
  PROCESADA = "Procesada",
  CANCELADA_SOCIO = "Cancelada por Socio",
  CANCELADA_ADMIN = "Cancelada por Admin",
  VENCIDA = "Vencida",
}

export enum TipoNovedad {
  INFO = "info",
  ALERTA = "alerta",
  EVENTO = "evento",
}

export interface AptoMedicoInfo {
  valido: boolean;
  fechaEmision?: string | Date;
  fechaVencimiento?: string | Date;
  razonInvalidez?: string;
  observaciones?: string;
}

// Raw type for localStorage storage where dates are strings
export interface AptoMedicoInfoRaw extends Omit<AptoMedicoInfo, 'fechaEmision' | 'fechaVencimiento'> {
  fechaEmision?: string;
  fechaVencimiento?: string;
}

export interface DocumentoSocioGeneral {
  id: string;
  nombreArchivo: string;
  tipoDocumento: string;
  url?: string;
  fechaCarga: string;
}

export interface CuentaSocio {
  estadoCuenta: 'Al Dia' | 'Con Deuda' | 'Suspendida';
  fechaUltimoPago?: string;
  saldoActual?: number;
}

export interface MiembroFamiliar {
  id?: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: Date | string; // Runtime: Date preferred, supports string for initial
  relacion: RelacionFamiliar;
  direccion?: string;
  telefono?: string;
  email?: string;
  fotoPerfil?: FileList | null | string;
  fotoDniFrente?: FileList | null | string;
  fotoDniDorso?: FileList | null | string;
  fotoCarnet?: FileList | null | string;
  estadoValidacion?: EstadoValidacionFamiliar;
  aptoMedico?: AptoMedicoInfo;
}

export interface MiembroFamiliarRaw extends Omit<MiembroFamiliar, 'fechaNacimiento' | 'aptoMedico'> {
  fechaNacimiento: string; // Stored as ISO string
  aptoMedico?: AptoMedicoInfoRaw;
}

export interface Adherente {
  id?: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: Date | string;
  empresa: string;
  telefono?: string;
  direccion?: string;
  email?: string;
  fotoDniFrente?: FileList | null | string;
  fotoDniDorso?: FileList | null | string;
  fotoPerfil?: FileList | null | string;
  fotoCarnet?: FileList | null | string;
  estadoAdherente: EstadoAdherente;
  estadoSolicitud: EstadoSolicitudAdherente;
  motivoRechazo?: string;
  aptoMedico: AptoMedicoInfo;
}

export interface AdherenteRaw extends Omit<Adherente, 'fechaNacimiento' | 'aptoMedico'> {
  fechaNacimiento: string; // Stored as ISO string
  aptoMedico: AptoMedicoInfoRaw;
}

export interface CambiosPendientesGrupoFamiliar {
  tipoGrupoFamiliar?: "conyugeEHijos" | "padresMadres";
  familiares?: {
    conyuge?: MiembroFamiliar | null;
    hijos?: MiembroFamiliar[];
    padres?: MiembroFamiliar[];
  }
}
export interface CambiosPendientesGrupoFamiliarRaw extends Omit<CambiosPendientesGrupoFamiliar, 'familiares'> {
   familiares?: {
    conyuge?: MiembroFamiliarRaw | null;
    hijos?: MiembroFamiliarRaw[];
    padres?: MiembroFamiliarRaw[];
  }
}


export interface PreciosInvitadosConfig {
  precioInvitadoDiario: number;
  precioInvitadoCumpleanos: number;
}

export interface Novedad {
  id: string;
  titulo: string;
  contenido: string;
  fechaCreacion: string | Date;
  fechaVencimiento?: string | Date | null;
  activa: boolean;
  tipo: TipoNovedad;
}

export interface NovedadRaw extends Omit<Novedad, 'fechaCreacion' | 'fechaVencimiento'> {
  fechaCreacion: string;
  fechaVencimiento?: string | null;
}


const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const FileListInstance = typeof window !== 'undefined' ? FileList : Object;

export interface FileSchemaConfig {
  typeError: string;
  sizeError: string;
  mimeTypeError: string;
  mimeTypes: string[];
}

export const dniFileSchemaConfig: FileSchemaConfig = {
  typeError: "Debe seleccionar un archivo de imagen o PDF.",
  sizeError: `El archivo DNI no debe exceder ${MAX_FILE_SIZE_MB}MB.`,
  mimeTypeError: "Tipo de archivo inválido. Solo se permiten PNG, JPG, o PDF para DNI.",
  mimeTypes: ["image/png", "image/jpeg", "application/pdf"],
};

export const profileFileSchemaConfig: FileSchemaConfig = {
  typeError: "Debe seleccionar un archivo de imagen.",
  sizeError: `La foto de perfil no debe exceder ${MAX_FILE_SIZE_MB}MB.`,
  mimeTypeError: "Tipo de archivo inválido. Solo se permiten PNG o JPG para foto de perfil.",
  mimeTypes: ["image/png", "image/jpeg"],
};

const filePreprocess = (val: unknown) => {
  if (val === undefined) return null;
  return val;
};

const baseFileContentValidation = (file: File, config: FileSchemaConfig, ctx: z.RefinementCtx) => {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    ctx.addIssue({ code: z.ZodIssueCode.too_big, type: "array", maximum: MAX_FILE_SIZE_BYTES, inclusive: true, message: config.sizeError });
  }
  if (!config.mimeTypes.includes(file.type)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: config.mimeTypeError });
  }
};

export const requiredFileField = (config: FileSchemaConfig, requiredMessage: string) =>
  z.any().superRefine((val, ctx) => {
    const processedVal = filePreprocess(val);

    if (processedVal === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: requiredMessage });
      return;
    }

    if (typeof processedVal === 'string') {
      if (!z.string().url().min(1).safeParse(processedVal).success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "URL de archivo inválida." });
      }
      return;
    }

    if (processedVal instanceof FileListInstance) {
      if (processedVal.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: requiredMessage });
        return;
      }
      if (processedVal.length > 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Solo se puede seleccionar un archivo." });
        return;
      }
      const file = processedVal[0];
      if (!file || typeof file.size !== 'number' || typeof file.type !== 'string') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: config.typeError });
        return;
      }
      baseFileContentValidation(file, config, ctx);
      return;
    }
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: config.typeError });
  });

export const optionalFileField = (config: FileSchemaConfig) =>
  z.any().superRefine((val, ctx) => {
    const processedVal = filePreprocess(val);

    if (processedVal === null || (processedVal instanceof FileListInstance && processedVal.length === 0)) {
      return; 
    }

    if (typeof processedVal === 'string') {
      if (!z.string().url().min(1).safeParse(processedVal).success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "URL de archivo inválida." });
      }
      return;
    }

    if (processedVal instanceof FileListInstance) {
      if (processedVal.length > 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Solo se puede seleccionar un archivo." });
        return;
      }
      const file = processedVal[0];
      if (!file || typeof file.size !== 'number' || typeof file.type !== 'string') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: config.typeError });
        return;
      }
      baseFileContentValidation(file, config, ctx);
      return;
    }
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: config.typeError });
  }).nullable().optional();


export const signupTitularSchema = z.object({
  apellido: z.string().min(2, "Apellido es requerido."),
  nombre: z.string().min(2, "Nombre es requerido."),
  fechaNacimiento: z.date({ required_error: "Fecha de nacimiento es requerida.", invalid_type_error: "Fecha de nacimiento inválida."}).refine(date => {
    return date <= subYears(new Date(), 18);
  }, "Debe ser mayor de 18 años."),
  dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos numéricos."),
  empresa: z.string().min(1, "Empresa / Sindicato es requerido."),
  telefono: z.string().min(10, "Teléfono debe tener al menos 10 caracteres numéricos.").regex(/^\d+$/, "Teléfono solo debe contener números."),
  direccion: z.string().min(5, "Dirección es requerida."),
  email: z.string().email("Email inválido."),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres.'),
  confirmPassword: z.string(),
  fotoDniFrente: requiredFileField(dniFileSchemaConfig, "Se requiere foto del DNI (frente)."),
  fotoDniDorso: requiredFileField(dniFileSchemaConfig, "Se requiere foto del DNI (dorso)."),
  fotoPerfil: requiredFileField(profileFileSchemaConfig, "Se requiere foto de perfil."),
  fotoCarnet: optionalFileField(profileFileSchemaConfig),
  aceptaTerminos: z.boolean().refine(value => value === true, {
    message: "Debe aceptar el reglamento interno para registrarse.",
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmPassword'],
});
export type SignupTitularData = z.infer<typeof signupTitularSchema>;

export const titularSchema = z.object({
  apellido: z.string().min(2, "Apellido es requerido."),
  nombre: z.string().min(2, "Nombre es requerido."),
  fechaNacimiento: z.date({ errorMap: () => ({ message: "Fecha de nacimiento es requerida."})}).refine(date => {
    return date <= subYears(new Date(), 18);
  }, "Debe ser mayor de 18 años."),
  dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos numéricos."),
  empresa: z.string().min(1, "Empresa / Sindicato es requerido."),
  telefono: z.string().min(10, "Teléfono debe tener al menos 10 caracteres numéricos.").regex(/^\d+$/, "Teléfono solo debe contener números."),
  direccion: z.string().min(5, "Dirección es requerida."),
  email: z.string().email("Email inválido."),
  fotoDniFrente: requiredFileField(dniFileSchemaConfig, "Se requiere foto del DNI (frente)."),
  fotoDniDorso: requiredFileField(dniFileSchemaConfig, "Se requiere foto del DNI (dorso)."),
  fotoPerfil: requiredFileField(profileFileSchemaConfig, "Se requiere foto de perfil."),
  fotoCarnet: optionalFileField(profileFileSchemaConfig),
});
export type TitularData = z.infer<typeof titularSchema>;

export interface Socio extends TitularData {
  id: string;
  numeroSocio: string;
  fotoUrl?: string; 
  estadoSocio: 'Activo' | 'Inactivo' | 'Pendiente Validacion';
  aptoMedico: AptoMedicoInfo;
  miembroDesde: string | Date; // Runtime: Date
  ultimaRevisionMedica?: string | Date; // Runtime: Date
  grupoFamiliar: MiembroFamiliar[];
  adherentes?: Adherente[];
  cuenta?: CuentaSocio;
  documentos?: DocumentoSocioGeneral[];
  estadoSolicitud?: EstadoSolicitudSocio;
  role: Extract<UserRole, 'socio'>;
  cambiosPendientesGrupoFamiliar?: CambiosPendientesGrupoFamiliar | null;
  estadoCambioGrupoFamiliar?: EstadoCambioGrupoFamiliar;
  motivoRechazoCambioGrupoFamiliar?: string;
}

// Raw type for Socio as stored in localStorage
export interface SocioRaw extends Omit<Socio, 'fechaNacimiento' | 'miembroDesde' | 'ultimaRevisionMedica' | 'aptoMedico' | 'grupoFamiliar' | 'adherentes' | 'cambiosPendientesGrupoFamiliar'> {
  fechaNacimiento: string; // ISO string
  miembroDesde: string; // ISO string
  ultimaRevisionMedica?: string; // ISO string
  aptoMedico: AptoMedicoInfoRaw;
  grupoFamiliar: MiembroFamiliarRaw[];
  adherentes?: AdherenteRaw[];
  cambiosPendientesGrupoFamiliar?: CambiosPendientesGrupoFamiliarRaw | null;
}


export type TipoPersona = 'Socio Titular' | 'Familiar' | 'Adherente' | 'Invitado Diario';

export interface RevisionMedica {
  id: string;
  fechaRevision: string | Date;
  socioId: string; // DNI or NumeroSocio depending on TipoPersona
  socioNombre: string;
  tipoPersona: TipoPersona;
  idSocioAnfitrion?: string; // NumeroSocio of titular if familiar, adherente, invitado
  resultado: 'Apto' | 'No Apto';
  fechaVencimientoApto?: string | Date;
  observaciones?: string;
  medicoResponsable?: string;
}

export interface RevisionMedicaRaw extends Omit<RevisionMedica, 'fechaRevision' | 'fechaVencimientoApto'> {
  fechaRevision: string;
  fechaVencimientoApto?: string;
}


export const familiarBaseSchema = z.object({
  id: z.string().optional(),
  apellido: z.string().min(2, "Apellido es requerido."),
  nombre: z.string().min(2, "Nombre es requerido."),
  fechaNacimiento: z.union([z.date(), z.string()]).transform(val => typeof val === 'string' ? parseISO(val) : val)
    .refine(date => isValid(date), "Fecha de nacimiento inválida."),
  dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos numéricos."),
  fotoDniFrente: optionalFileField(dniFileSchemaConfig),
  fotoDniDorso: optionalFileField(dniFileSchemaConfig),
  fotoPerfil: optionalFileField(profileFileSchemaConfig),
  fotoCarnet: optionalFileField(profileFileSchemaConfig),
  direccion: z.string().min(5, "Dirección es requerida.").optional().or(z.literal('')),
  telefono: z.string().min(10, "Teléfono debe tener al menos 10 caracteres numéricos.").regex(/^\d+$/, "Teléfono solo debe contener números.").optional().or(z.literal('')),
  email: z.string().email("Email inválido.").optional().or(z.literal('')),
  relacion: z.nativeEnum(RelacionFamiliar),
  aptoMedico: z.custom<AptoMedicoInfo>().optional(),
  estadoValidacion: z.nativeEnum(EstadoValidacionFamiliar).optional(),
});

export const conyugeSchema = familiarBaseSchema.extend({
  relacion: z.literal(RelacionFamiliar.CONYUGE),
});
export type ConyugeData = z.infer<typeof conyugeSchema>;

export const hijoSchema = familiarBaseSchema.extend({
  relacion: z.literal(RelacionFamiliar.HIJO_A),
});
export type HijoData = z.infer<typeof hijoSchema>;

export const padreSchema = familiarBaseSchema.extend({
  relacion: z.literal(RelacionFamiliar.PADRE_MADRE),
});
export type PadreData = z.infer<typeof padreSchema>;

export const familiaresDetallesSchema = z.object({
  conyuge: conyugeSchema.optional().nullable(),
  hijos: z.array(hijoSchema).max(MAX_HIJOS, `No puede agregar más de ${MAX_HIJOS} hijos.`).optional(),
  padres: z.array(padreSchema).max(MAX_PADRES, `No puede agregar más de ${MAX_PADRES} padres.`).optional(),
});
export type FamiliaresDetallesData = z.infer<typeof familiaresDetallesSchema>;

export const agregarFamiliaresSchema = z.object({
  tipoGrupoFamiliar: z.enum(["conyugeEHijos", "padresMadres"], {
    required_error: "Debe seleccionar un tipo de grupo familiar.",
  }),
  familiares: familiaresDetallesSchema,
});
export type AgregarFamiliaresData = z.infer<typeof agregarFamiliaresSchema>;

export const altaSocioSchema = titularSchema.merge(z.object({ familiares: familiaresDetallesSchema }));
export type AltaSocioData = z.infer<typeof altaSocioSchema>;

export interface QuickAccessFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  roles: UserRole[];
  image?: string;
  imageHint?: string;
}

export const invitadoCumpleanosSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().min(1, "Nombre es requerido."),
  apellido: z.string().min(1, "Apellido es requerido."),
  dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos."),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido.").optional().or(z.literal('')),
  ingresado: z.boolean().default(false),
  metodoPago: z.nativeEnum(['Efectivo', 'Transferencia', 'Caja']).nullable().optional(),
});
export type InvitadoCumpleanos = z.infer<typeof invitadoCumpleanosSchema>;

export interface SolicitudCumpleanos {
  id: string;
  idSocioTitular: string;
  nombreSocioTitular: string;
  idCumpleanero: string;
  nombreCumpleanero: string;
  fechaEvento: Date | string; // Runtime: Date
  listaInvitados: InvitadoCumpleanos[];
  estado: EstadoSolicitudCumpleanos;
  fechaSolicitud: string | Date; // Runtime: Date
  titularIngresadoEvento: boolean;
}

export interface SolicitudCumpleanosRaw extends Omit<SolicitudCumpleanos, 'fechaEvento' | 'fechaSolicitud'> {
  fechaEvento: string; // ISO string
  fechaSolicitud: string; // ISO string
}

export const solicitudCumpleanosSchema = z.object({
  id: z.string().default(() => `evt-${Date.now().toString(36)}`),
  idSocioTitular: z.string({ required_error: "ID del socio titular es requerido."}),
  nombreSocioTitular: z.string({ required_error: "Nombre del socio titular es requerido."}),
  idCumpleanero: z.string({ required_error: "Debe seleccionar quién cumple años." }),
  nombreCumpleanero: z.string({ required_error: "Nombre del cumpleañero es requerido." }),
  fechaEvento: z.union([z.date(), z.string()]).transform(val => typeof val === 'string' ? parseISO(val) : val)
    .refine(date => isValid(date), "Fecha de evento inválida."),
  listaInvitados: z.array(invitadoCumpleanosSchema)
    .min(1, "Debe agregar al menos un invitado.")
    .max(MAX_INVITADOS_CUMPLEANOS, `No puede agregar más de ${MAX_INVITADOS_CUMPLEANOS} invitados.`),
  estado: z.nativeEnum(EstadoSolicitudCumpleanos).default(EstadoSolicitudCumpleanos.APROBADA),
  fechaSolicitud: z.string().default(() => new Date().toISOString()),
  titularIngresadoEvento: z.boolean().default(false),
});
// Type for form data is derived from schema
// export type SolicitudCumpleanosFormData = z.infer<typeof solicitudCumpleanosSchema>;


export interface InvitadoDiario {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento?: Date | string; // Runtime: Date
  ingresado: boolean;
  metodoPago: MetodoPagoInvitado | null;
  aptoMedico?: AptoMedicoInfo | null;
  esDeCumpleanos?: boolean;
}

export interface InvitadoDiarioRaw extends Omit<InvitadoDiario, 'fechaNacimiento' | 'aptoMedico'> {
  fechaNacimiento?: string; // ISO string
  aptoMedico?: AptoMedicoInfoRaw | null;
}

export const invitadoDiarioSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().min(1, "Nombre es requerido."),
  apellido: z.string().min(1, "Apellido es requerido."),
  dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos."),
  fechaNacimiento: z.union([z.date({required_error: "Fecha de nacimiento es requerida.", invalid_type_error: "Fecha de nacimiento inválida."}), z.string()])
    .transform(val => typeof val === 'string' ? parseISO(val) : val)
    .refine(date => isValid(date), { message: "Fecha de nacimiento inválida." }),
  ingresado: z.boolean().default(false),
  metodoPago: z.nativeEnum(['Efectivo', 'Transferencia', 'Caja']).nullable().optional(),
  aptoMedico: z.custom<AptoMedicoInfo>().optional().nullable(),
  esDeCumpleanos: z.boolean().optional(), 
});
// export type InvitadoDiarioFormData = z.infer<typeof invitadoDiarioSchema>;


export interface SolicitudInvitadosDiarios {
  id: string;
  idSocioTitular: string;
  nombreSocioTitular: string;
  fecha: string; // ISO Date string YYYY-MM-DD
  listaInvitadosDiarios: InvitadoDiario[];
  estado: EstadoSolicitudInvitados;
  fechaCreacion: string | Date; // Runtime: Date
  fechaUltimaModificacion: string | Date; // Runtime: Date
  titularIngresadoEvento: boolean;
}

export interface SolicitudInvitadosDiariosRaw extends Omit<SolicitudInvitadosDiarios, 'listaInvitadosDiarios' | 'fechaCreacion' | 'fechaUltimaModificacion'> {
  listaInvitadosDiarios: InvitadoDiarioRaw[];
  fechaCreacion: string; // ISO string
  fechaUltimaModificacion: string; // ISO string
}


export const solicitudInvitadosDiariosSchema = z.object({
  id: z.string().default(() => `invd-${Date.now().toString(36)}`),
  idSocioTitular: z.string({ required_error: "ID del socio titular es requerido."}),
  nombreSocioTitular: z.string({ required_error: "Nombre del socio titular es requerido."}),
  fecha: z.string({ required_error: "La fecha es obligatoria (ISO date string)." }).refine(val => isValid(parseISO(val)), { message: "Fecha inválida."}),
  listaInvitadosDiarios: z.array(invitadoDiarioSchema)
    .min(1, "Debe agregar al menos un invitado."),
  estado: z.nativeEnum(EstadoSolicitudInvitados).default(EstadoSolicitudInvitados.BORRADOR),
  fechaCreacion: z.string().default(() => formatISO(new Date())),
  fechaUltimaModificacion: z.string().default(() => formatISO(new Date())),
  titularIngresadoEvento: z.boolean().default(false),
});
// export type SolicitudInvitadosDiariosFormData = z.infer<typeof solicitudInvitadosDiariosSchema>;


export const adherenteFormSchema = z.object({
    nombre: z.string().min(2, "Nombre es requerido."),
    apellido: z.string().min(2, "Apellido es requerido."),
    fechaNacimiento: z.date({ required_error: "Fecha de nacimiento es requerida.", invalid_type_error: "Fecha de nacimiento inválida."}),
    dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos numéricos."),
    empresa: z.string().min(1, "Empresa / Sindicato es requerido."),
    telefono: z.string().min(10, "Teléfono debe tener al menos 10 caracteres numéricos.").regex(/^\d+$/, "Teléfono solo debe contener números.").optional().or(z.literal('')),
    direccion: z.string().min(5, "Dirección es requerida.").optional().or(z.literal('')),
    email: z.string().email("Email inválido.").optional().or(z.literal('')),
    fotoDniFrente: optionalFileField(dniFileSchemaConfig),
    fotoDniDorso: optionalFileField(dniFileSchemaConfig),
    fotoPerfil: optionalFileField(profileFileSchemaConfig),
    fotoCarnet: optionalFileField(profileFileSchemaConfig),
});
export type AdherenteFormData = z.infer<typeof adherenteFormSchema>;

export const adherenteSchema = adherenteFormSchema.extend({
  id: z.string().optional(),
  estadoAdherente: z.nativeEnum(EstadoAdherente),
  estadoSolicitud: z.nativeEnum(EstadoSolicitudAdherente),
  motivoRechazo: z.string().optional(),
  aptoMedico: z.custom<AptoMedicoInfo>(),
});
export type AdherenteData = z.infer<typeof adherenteSchema>;

export const preciosInvitadosConfigSchema = z.object({
  precioInvitadoDiario: z.number().min(0, "El precio debe ser cero o mayor.").default(0),
  precioInvitadoCumpleanos: z.number().min(0, "El precio debe ser cero o mayor.").default(0),
});
export type PreciosInvitadosFormData = z.infer<typeof preciosInvitadosConfigSchema>;

export const novedadSchema = z.object({
  id: z.string().default(() => `nov-${Date.now().toString(36)}`),
  titulo: z.string().min(5, "El título debe tener al menos 5 caracteres."),
  contenido: z.string().min(10, "El contenido debe tener al menos 10 caracteres."),
  fechaCreacion: z.string().default(() => formatISO(new Date())),
  fechaVencimiento: z.union([z.date(), z.string(), z.null()])
    .transform(val => {
      if (val === null) return null;
      if (typeof val === 'string' && val.trim() === '') return null;
      if (typeof val === 'string') return parseISO(val);
      return val;
    })
    .refine(date => date === null || (date instanceof Date && isValid(date)), "Fecha de vencimiento inválida.")
    .optional(),
  activa: z.boolean().default(true),
  tipo: z.nativeEnum(TipoNovedad).default(TipoNovedad.INFO),
});
export type NovedadFormData = z.infer<typeof novedadSchema>;

export const adminEditableFamiliarSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().min(2, "Nombre es requerido."),
  apellido: z.string().min(2, "Apellido es requerido."),
  dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos."),
  fechaNacimiento: z.union([z.date(), z.string()])
    .transform(val => (typeof val === 'string' ? parseISO(val) : val))
    .refine(date => isValid(date), "Fecha de nacimiento inválida."),
  relacion: z.nativeEnum(RelacionFamiliar, { required_error: "Relación es requerida." }),
  telefono: z.string().min(10, "Teléfono debe tener al menos 10 caracteres.").regex(/^\d+$/, "Teléfono solo debe contener números.").optional().or(z.literal('')),
  email: z.string().email("Email inválido.").optional().or(z.literal('')),
  direccion: z.string().min(5, "Dirección es requerida.").optional().or(z.literal('')),
  fotoPerfil: optionalFileField(profileFileSchemaConfig).nullable(),
  fotoDniFrente: optionalFileField(dniFileSchemaConfig).nullable(),
  fotoDniDorso: optionalFileField(dniFileSchemaConfig).nullable(),
  fotoCarnet: optionalFileField(profileFileSchemaConfig).nullable(),
  aptoMedico: z.custom<AptoMedicoInfo>().optional(), 
});
export type AdminEditableFamiliarData = z.infer<typeof adminEditableFamiliarSchema>;


export const adminEditSocioTitularSchema = z.object({
  apellido: z.string().min(2, "Apellido es requerido."),
  nombre: z.string().min(2, "Nombre es requerido."),
  fechaNacimiento: z.union([z.date(), z.string()])
    .transform(val => (typeof val === 'string' ? parseISO(val) : val))
    .refine(date => isValid(date), "Fecha de nacimiento inválida.")
    .refine(date => date <= subYears(new Date(), 18), "Debe ser mayor de 18 años para ser titular."),
  dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos numéricos."),
  empresa: z.string().min(1, "Empresa / Sindicato es requerido."),
  telefono: z.string().min(10, "Teléfono debe tener al menos 10 caracteres.").regex(/^\d+$/, "Teléfono solo debe contener números."),
  direccion: z.string().min(5, "Dirección es requerida."),
  email: z.string().email("Email inválido."),
  estadoSocio: z.enum(['Activo', 'Inactivo', 'Pendiente Validacion'], { required_error: "El estado del socio es requerido."}),
  tipoGrupoFamiliar: z.enum(["conyugeEHijos", "padresMadres"], {
    errorMap: (issue, ctx) => ({ message: "Debe seleccionar un tipo de grupo si va a agregar familiares." })
  }).optional(),
  grupoFamiliar: z.array(adminEditableFamiliarSchema).optional(),
  fotoUrl: z.string().url("URL de foto inválida.").optional().nullable(),
  fotoPerfil: optionalFileField(profileFileSchemaConfig).nullable(),
  fotoDniFrente: optionalFileField(dniFileSchemaConfig),
  fotoDniDorso: optionalFileField(dniFileSchemaConfig),
  fotoCarnet: optionalFileField(profileFileSchemaConfig),
});
export type AdminEditSocioTitularData = z.infer<typeof adminEditSocioTitularSchema>;
