
import { z } from 'zod';
import { subYears, parseISO, isValid, formatISO } from 'date-fns';

const safeDate = z.preprocess((arg) => {
  if (typeof arg === 'string') {
    const date = parseISO(arg);
    if (isValid(date)) return date;
  }
  if (arg instanceof Date && isValid(arg)) {
    return arg;
  }
  return arg;
}, z.date({ invalid_type_error: "Fecha inválida." }));


export type UserRole = 'socio' | 'portero' | 'medico' | 'admin';

export const MAX_HIJOS = 12;
export const MAX_PADRES = 2;

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
  RECHAZADO = "Rechazada",
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
  fechaEmision?: Date;
  fechaVencimiento?: Date;
  razonInvalidez?: string;
  observaciones?: string;
}

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

// Data model interfaces (used in application logic)
export interface MiembroFamiliar {
  id?: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: Date;
  relacion: RelacionFamiliar;
  direccion?: string;
  telefono?: string;
  email?: string;
  fotoPerfil?: string | null;
  fotoDniFrente?: string | null;
  fotoDniDorso?: string | null;
  fotoCarnet?: string | null;
  estadoValidacion?: EstadoValidacionFamiliar;
  aptoMedico?: AptoMedicoInfo;
}

export interface Adherente {
  id?: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: Date;
  empresa: string;
  telefono?: string;
  direccion?: string;
  email?: string;
  fotoDniFrente?: string | null;
  fotoDniDorso?: string | null;
  fotoPerfil?: string | null;
  fotoCarnet?: string | null;
  estadoAdherente: EstadoAdherente;
  estadoSolicitud: EstadoSolicitudAdherente;
  motivoRechazo?: string;
  aptoMedico: AptoMedicoInfo;
}

export interface Socio {
  id: string;
  numeroSocio: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: Date;
  dni: string;
  empresa: string;
  telefono: string;
  direccion: string;
  email: string;
  fotoUrl?: string | null;
  fotoPerfil?: string | null;
  fotoDniFrente?: string | null;
  fotoDniDorso?: string | null;
  fotoCarnet?: string | null;
  estadoSocio: 'Activo' | 'Inactivo' | 'Pendiente Validacion';
  aptoMedico: AptoMedicoInfo;
  miembroDesde: Date;
  ultimaRevisionMedica?: Date;
  grupoFamiliar: MiembroFamiliar[];
  adherentes?: Adherente[];
  cuenta?: CuentaSocio;
  documentos?: DocumentoSocioGeneral[];
  estadoSolicitud?: EstadoSolicitudSocio;
  role: Extract<UserRole, 'socio'>;
  cambiosPendientesGrupoFamiliar?: CambiosPendientesGrupoFamiliar | null;
  estadoCambioGrupoFamiliar?: EstadoCambioGrupoFamiliar;
  motivoRechazoCambioGrupoFamiliar?: string | null;
}


// Raw interfaces for DB storage (dates as strings)
export interface MiembroFamiliarRaw extends Omit<MiembroFamiliar, 'fechaNacimiento' | 'aptoMedico'> {
  fechaNacimiento: string; 
  aptoMedico?: AptoMedicoInfoRaw;
}

export interface AdherenteRaw extends Omit<Adherente, 'fechaNacimiento' | 'aptoMedico'> {
  fechaNacimiento: string;
  aptoMedico: AptoMedicoInfoRaw;
}

export interface SocioRaw extends Omit<Socio, 'fechaNacimiento' | 'miembroDesde' | 'ultimaRevisionMedica' | 'aptoMedico' | 'grupoFamiliar' | 'adherentes' | 'cambiosPendientesGrupoFamiliar'> {
  fechaNacimiento: string;
  miembroDesde: string;
  ultimaRevisionMedica?: string;
  aptoMedico: AptoMedicoInfoRaw;
  grupoFamiliar: MiembroFamiliarRaw[];
  adherentes?: AdherenteRaw[];
  cambiosPendientesGrupoFamiliar?: CambiosPendientesGrupoFamiliarRaw | null;
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
  fechaCreacion: Date;
  fechaVencimiento?: Date | null;
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

const fileValidation = (config: FileSchemaConfig) => 
  z.any()
    .refine((val) => {
      if (!val || typeof val === 'string') return true;
      if (val instanceof FileListInstance && val.length > 0) {
        return val[0].size <= MAX_FILE_SIZE_BYTES;
      }
      return true;
    }, { message: config.sizeError })
    .refine((val) => {
      if (!val || typeof val === 'string') return true;
      if (val instanceof FileListInstance && val.length > 0) {
        return config.mimeTypes.includes(val[0].type);
      }
      return true;
    }, { message: config.mimeTypeError });


export const requiredFileField = (config: FileSchemaConfig, requiredMessage: string) =>
  fileValidation(config).refine(val => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string' && val.length > 0) return true;
    if (val instanceof FileList && val.length > 0) return true;
    return false;
  }, {
    message: requiredMessage,
  });

export const optionalFileField = (config: FileSchemaConfig) => fileValidation(config).nullable().optional();


export const signupTitularSchema = z.object({
  apellido: z.string().min(2, "Apellido es requerido."),
  nombre: z.string().min(2, "Nombre es requerido."),
  fechaNacimiento: safeDate.refine(date => date <= subYears(new Date(), 18), {
    message: "Debe ser mayor de 18 años."
  }),
  dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos numéricos."),
  empresa: z.string().min(1, "Empresa / Sindicato es requerido."),
  telefono: z.string().min(10, "Teléfono debe tener al menos 10 caracteres numéricos.").regex(/^\d+$/, "Teléfono solo debe contener números."),
  direccion: z.string().min(5, "Dirección es requerida."),
  email: z.string().email("Email inválido."),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres.'),
  confirmPassword: z.string(),
  fotoDniFrente: optionalFileField(dniFileSchemaConfig),
  fotoDniDorso: optionalFileField(dniFileSchemaConfig),
  fotoPerfil: optionalFileField(profileFileSchemaConfig),
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
  fechaNacimiento: safeDate.refine(date => date <= subYears(new Date(), 18), {
    message: "Debe ser mayor de 18 años."
  }),
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


export type TipoPersona = 'Socio Titular' | 'Familiar' | 'Adherente' | 'Invitado Diario';

export interface RevisionMedica {
  id: string;
  fechaRevision: Date;
  socioId: string;
  socioNombre: string;
  tipoPersona: TipoPersona;
  idSocioAnfitrion?: string;
  resultado: 'Apto' | 'No Apto';
  fechaVencimientoApto?: Date;
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
  fechaNacimiento: safeDate.refine(date => !!date, "La fecha de nacimiento es requerida."),
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

export interface InvitadoDiario {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: Date;
  ingresado: boolean;
  metodoPago: MetodoPagoInvitado | null;
  aptoMedico?: AptoMedicoInfo | null;
  esDeCumpleanos?: boolean;
}

export interface InvitadoDiarioRaw extends Omit<InvitadoDiario, 'fechaNacimiento' | 'aptoMedico'> {
  fechaNacimiento: string;
  aptoMedico?: AptoMedicoInfoRaw | null;
}


export const invitadoDiarioSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().min(1, "Nombre es requerido."),
  apellido: z.string().min(1, "Apellido es requerido."),
  dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos."),
  fechaNacimiento: safeDate.refine(date => !!date, "La fecha de nacimiento es requerida."),
  ingresado: z.boolean().default(false),
  metodoPago: z.nativeEnum(['Efectivo', 'Transferencia', 'Caja']).nullable().optional(),
  aptoMedico: z.custom<AptoMedicoInfo>().optional().nullable(),
  esDeCumpleanos: z.boolean().optional(), 
});


export interface SolicitudInvitadosDiarios {
  id: string;
  idSocioTitular: string;
  nombreSocioTitular: string;
  fecha: string; // ISO Date string YYYY-MM-DD
  listaInvitadosDiarios: InvitadoDiario[];
  estado: EstadoSolicitudInvitados;
  fechaCreacion: Date;
  fechaUltimaModificacion: Date;
  titularIngresadoEvento: boolean;
}

export interface SolicitudInvitadosDiariosRaw extends Omit<SolicitudInvitadosDiarios, 'listaInvitadosDiarios' | 'fechaCreacion' | 'fechaUltimaModificacion'> {
  listaInvitadosDiarios: InvitadoDiarioRaw[];
  fechaCreacion: string;
  fechaUltimaModificacion: string;
}


export const solicitudInvitadosDiariosSchema = z.object({
  id: z.string().default(() => `invd-${Date.now().toString(36)}`),
  idSocioTitular: z.string({ required_error: "ID del socio titular es requerido."}),
  nombreSocioTitular: z.string({ required_error: "Nombre del socio titular es requerido."}),
  fecha: z.string({ required_error: "La fecha es obligatoria (ISO date string)." }).refine(val => isValid(parseISO(val)), { message: "Fecha inválida."}),
  listaInvitadosDiarios: z.array(invitadoDiarioSchema)
    .min(1, "Debe agregar al menos un invitado."),
  estado: z.nativeEnum(EstadoSolicitudInvitados).default(EstadoSolicitudInvitados.BORRADOR),
  fechaCreacion: z.date().default(() => new Date()),
  fechaUltimaModificacion: z.date().default(() => new Date()),
  titularIngresadoEvento: z.boolean().default(false),
});


export const adherenteFormSchema = z.object({
    nombre: z.string().min(2, "Nombre es requerido."),
    apellido: z.string().min(2, "Apellido es requerido."),
    fechaNacimiento: safeDate.refine(date => !!date, "La fecha de nacimiento es requerida."),
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
  fechaCreacion: z.date().default(() => new Date()),
  fechaVencimiento: safeDate.nullable().optional(),
  activa: z.boolean().default(true),
  tipo: z.nativeEnum(TipoNovedad).default(TipoNovedad.INFO),
});
export type NovedadFormData = z.infer<typeof novedadSchema>;

export const adminEditableFamiliarSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().min(2, "Nombre es requerido."),
  apellido: z.string().min(2, "Apellido es requerido."),
  dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos."),
  fechaNacimiento: safeDate,
  relacion: z.nativeEnum(RelacionFamiliar, { required_error: "Relación es requerida." }),
  telefono: z.string().min(10, "Teléfono debe tener al menos 10 caracteres numéricos.").regex(/^\d+$/, "Teléfono solo debe contener números.").optional().or(z.literal('')),
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
  fechaNacimiento: safeDate.optional().refine(date => !date || date <= subYears(new Date(), 18), {
    message: "El titular debe ser mayor de 18 años."
  }),
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
