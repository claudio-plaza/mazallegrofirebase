import { z } from 'zod';
import { subYears, parseISO, isValid, differenceInYears } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';

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

export enum EstadoCambioFamiliares {
  NINGUNO = "Ninguno",
  PENDIENTE = "Pendiente",
  APROBADO = "Aprobado",
  RECHAZADO = "Rechazado",
  PARCIAL = "Parcial",
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
  id: string;
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
  estadoAprobacion?: 'pendiente' | 'aprobado' | 'rechazado';
  motivoRechazo?: string;
  fechaDecision?: Timestamp;
  decidoPor?: string; // UID del admin
}

export interface Adherente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: Date;
  telefono?: string;
  direccion?: string;
  email?: string;
  fotoDniFrente?: string | File | null;
  fotoDniDorso?: string | File | null;
  fotoPerfil?: string | File | null;
  estadoAdherente: EstadoAdherente;
  estadoSolicitud: EstadoSolicitudAdherente;
  motivoRechazo?: string | null;
  aptoMedico: AptoMedicoInfo;
}

export interface Socio {
  id: string;
  numeroSocio: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: Date;
  dni: string;
  empresa?: string;
  telefono: string;
  direccion: string;
  email: string;
  fotoUrl?: string | null;
  fotoPerfil?: string | null;
  fotoDniFrente?: string | null;
  fotoDniDorso?: string | null;
  fotoCarnet?: string | null;
  estadoSocio: 'Activo' | 'Inactivo' | 'Pendiente';
  motivoInactivacion?: string | null;  // ✅ NUEVO: Por qué fue inactivado
  fechaInactivacion?: Date | null;     // ✅ NUEVO: Cuándo fue inactivado
  aptoMedico: AptoMedicoInfo;
  miembroDesde: Date;
  ultimaRevisionMedica?: Date;
  familiares?: MiembroFamiliar[]; // Nuevo campo para familiares directos
  adherentes?: Adherente[];
  cuenta?: CuentaSocio;
  documentos?: DocumentoSocioGeneral[];
  estadoSolicitud?: EstadoSolicitudSocio;
  role: Extract<UserRole, 'socio'>;
  searchableKeywords?: string[];
  documentosCompletos?: boolean;

  // Nuevos campos para cambios pendientes
  cambiosPendientesFamiliares?: MiembroFamiliar[];
  estadoCambioFamiliares?: 'Ninguno' | 'Pendiente' | 'Aprobado' | 'Rechazado';
  motivoRechazoFamiliares?: string | null;

  // Mantener los viejos por compatibilidad temporal
  cambiosPendientesGrupoFamiliar?: any;
  estadoCambioGrupoFamiliar?: string;
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

export interface SocioRaw extends Omit<Socio, 'fechaNacimiento' | 'miembroDesde' | 'ultimaRevisionMedica' | 'aptoMedico' | 'familiares' | 'adherentes'> {
  fechaNacimiento: string;
  miembroDesde: string;
  ultimaRevisionMedica?: string;
  aptoMedico: AptoMedicoInfoRaw;
  familiares?: MiembroFamiliarRaw[]; // Nuevo campo para familiares directos
  adherentes?: AdherenteRaw[];
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

export interface FileSchemaConfig {
  typeError: string;
  sizeError: string;
  mimeTypeError: string;
  mimeTypes: string[];
}

export const dniFileSchemaConfig: FileSchemaConfig = {
  typeError: "Debe seleccionar un archivo de imagen o PDF.",
  sizeError: `El archivo DNI no debe exceder ${MAX_FILE_SIZE_MB}MB.`,
  mimeTypeError: "Tipo de archivo inválido. Solo se permiten PNG, JPG, JPEG o PDF para DNI.",
  mimeTypes: ["image/png", "image/jpeg", "application/pdf"],
};

export const profileFileSchemaConfig: FileSchemaConfig = {
  typeError: "Debe seleccionar un archivo de imagen.",
  sizeError: `La foto de perfil no debe exceder ${MAX_FILE_SIZE_MB}MB.`,
  mimeTypeError: "Tipo de archivo inválido. Solo se permiten PNG, JPG o JPEG para foto de perfil.",
  mimeTypes: ["image/png", "image/jpeg"],
};

const fileSchema = z.preprocess(
  (val) => (val === "" ? null : val), // Convierte string vacío a null antes de validar
  z.union([
    z.instanceof(File, { message: "Debe ser un archivo." }),
    z.string().startsWith("https://", { message: "Debe ser una URL válida." }),
    z.null(),
  ])
);

const fileValidation = (config: FileSchemaConfig) =>
  fileSchema.nullable().refine((file) => {
    if (!file || typeof file === 'string') return true; // Pass if null or already a URL
    return file.size <= MAX_FILE_SIZE_BYTES;
  }, config.sizeError).refine((file) => {
    if (!file || typeof file === 'string') return true;
    return config.mimeTypes.includes(file.type);
  }, config.mimeTypeError);

export const requiredFileField = (config: FileSchemaConfig, requiredMessage: string) =>
  fileValidation(config).refine(Boolean, requiredMessage);

export const optionalFileField = (config: FileSchemaConfig) =>
  fileValidation(config).optional();


export const signupTitularSchema = z.object({
  apellido: z.string().min(2, "Apellido es requerido.").regex(/^[a-zA-Z\s]+$/, "Apellido solo debe contener letras y espacios."),
  nombre: z.string().min(2, "Nombre es requerido.").regex(/^[a-zA-Z\s]+$/, "Nombre solo debe contener letras y espacios."),
  fechaNacimiento: safeDate.refine(date => date <= subYears(new Date(), 18), {
    message: "Debe ser mayor de 18 años."
  }),
  dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos numéricos."),
  empresa: z.string().regex(/^[a-zA-Z\s]*$/, "Empresa solo debe contener letras y espacios.").optional(),
  telefono: z.string().min(10, "Teléfono debe tener al menos 10 caracteres numéricos.").regex(/^\d+$/, "Teléfono solo debe contener números."),
  direccion: z.string().min(5, "Dirección es requerida."),
  email: z.string().email("Email inválido."),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula.')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número.'),
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
  fechaNacimiento: safeDate.refine(date => date <= subYears(new Date(), 18), {
    message: "Debe ser mayor de 18 años."
  }),
  dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos numéricos."),
  empresa: z.string().optional().or(z.literal('')),
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

export interface PersonaParaIngreso {
  id: string;
  socioTitularId: string; // ID del socio titular al que pertenece
  numeroSocio?: string; // Solo para el titular
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: Date;
  tipo: TipoPersona;
  fotoUrl?: string | null;
  aptoMedico?: AptoMedicoInfo | null;
  estadoSocio?: 'Activo' | 'Inactivo' | 'Pendiente'; // Solo para socio titular
  relacion?: RelacionFamiliar; // Solo para familiares
  esDeCumpleanos?: boolean; // Solo para invitados
  ingresado?: boolean; // Solo para invitados
  metodoPago?: MetodoPagoInvitado | null; // Solo para invitados
}

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
  medicoId?: string; // Añadido para guardar el UID del médico
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
  fotoDniFrente: requiredFileField(dniFileSchemaConfig, "Se requiere foto del DNI (frente)."),
  fotoDniDorso: requiredFileField(dniFileSchemaConfig, "Se requiere foto del DNI (dorso)."),
  fotoPerfil: requiredFileField(profileFileSchemaConfig, "Se requiere foto de perfil."),
  fotoCarnet: optionalFileField(profileFileSchemaConfig),
  direccion: z.string().min(5, "Dirección es requerida.").optional().or(z.literal('')),
  telefono: z.string().min(10, "Teléfono debe tener al menos 10 caracteres numéricos.").regex(/^\d+$/, "Teléfono solo debe contener números.").optional().or(z.literal('')),
  email: z.string().email("Email inválido.").optional().or(z.literal('')),
  relacion: z.nativeEnum(RelacionFamiliar), // Simplificado
  aptoMedico: z.custom<AptoMedicoInfo>().optional(),
  estadoValidacion: z.nativeEnum(EstadoValidacionFamiliar).optional(),
});

export const conyugeSchema = familiarBaseSchema.extend({
  relacion: z.literal(RelacionFamiliar.CONYUGE),
});
export type ConyugeData = z.infer<typeof conyugeSchema>;

export const hijoSchema = familiarBaseSchema.extend({
  relacion: z.literal(RelacionFamiliar.HIJO_A),
  fechaNacimiento: safeDate
    .refine(date => !!date, "La fecha de nacimiento es requerida.")
    .refine(date => differenceInYears(new Date(), date) < 22, {
      message: "Los hijos deben ser menores de 22 años."
    }),
});
export type HijoData = z.infer<typeof hijoSchema>;

export const familiaresDetallesSchema = z.object({
  conyuge: conyugeSchema.optional().nullable(),
  hijos: z.array(hijoSchema).max(MAX_HIJOS, `No puede agregar más de ${MAX_HIJOS} hijos.`).optional(),
});
export type FamiliaresDetallesData = z.infer<typeof familiaresDetallesSchema>;

export const agregarFamiliaresSchema = z.object({
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
  fechaNacimiento: safeDate.refine(date => !!date, "La fecha de nacimiento es requerida.").refine(date => {
    return differenceInYears(new Date(), date) >= 3;
  }, { message: "El invitado debe ser mayor de 3 años." }),
  ingresado: z.boolean().default(false),
  metodoPago: z.enum(['Efectivo', 'Transferencia', 'Caja']).nullable().optional(),
  aptoMedico: z.custom<AptoMedicoInfo>().optional().nullable(),
  esDeCumpleanos: z.boolean().optional(),
});


export interface SolicitudInvitadosDiarios {
  id: string;
  idSocioTitular: string;
  nombreSocioTitular: string;
  numeroSocioTitular: string;
  fecha: string; // ISO Date string YYYY-MM-DD
  listaInvitadosDiarios: InvitadoDiario[];
  estado: EstadoSolicitudInvitados;
  fechaCreacion: Date;
  fechaUltimaModificacion: Date;
  titularIngresadoEvento: boolean;
  ingresosMiembros?: string[];
}

export interface SolicitudInvitadosDiariosRaw extends Omit<SolicitudInvitadosDiarios, 'listaInvitadosDiarios' | 'fechaCreacion' | 'fechaUltimaModificacion'> {
  listaInvitadosDiarios: InvitadoDiarioRaw[];
  fechaCreacion: string;
  fechaUltimaModificacion: string;
  ingresosMiembros?: string[];
}


export const solicitudInvitadosDiariosSchema = z.object({
  id: z.string().default(() => `invd-${Date.now().toString(36)}`),
  idSocioTitular: z.string({ required_error: "ID del socio titular es requerido." }),
  nombreSocioTitular: z.string({ required_error: "Nombre del socio titular es requerido." }),
  numeroSocioTitular: z.string({ required_error: "Número de socio titular es requerido." }),
  fecha: z.string({ required_error: "La fecha es obligatoria (ISO date string)." }).refine(val => isValid(parseISO(val)), { message: "Fecha inválida." }),
  listaInvitadosDiarios: z.array(invitadoDiarioSchema)
    .min(1, "Debe agregar al menos un invitado."),
  estado: z.nativeEnum(EstadoSolicitudInvitados).default(EstadoSolicitudInvitados.BORRADOR),
  fechaCreacion: z.date().default(() => new Date()),
  fechaUltimaModificacion: z.date().default(() => new Date()),
  titularIngresadoEvento: z.boolean().default(false),
  ingresosMiembros: z.array(z.string()).optional(),
});


export const adherenteFormSchema = z.object({
  nombre: z.string().min(2, "Nombre es requerido."),
  apellido: z.string().min(2, "Apellido es requerido."),
  fechaNacimiento: safeDate.refine(date => !!date, "La fecha de nacimiento es requerida."),
  dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos numéricos."),
  telefono: z.string().min(10, "Teléfono debe tener al menos 10 caracteres numéricos.").regex(/^\d+$/, "Teléfono solo debe contener números.").optional().or(z.literal('')),
  direccion: z.string().min(5, "Dirección es requerida.").optional().or(z.literal('')),
  email: z.string().email("Email inválido.").optional().or(z.literal('')),
  fotoDniFrente: requiredFileField(dniFileSchemaConfig, "Se requiere foto del DNI (frente)."),
  fotoDniDorso: requiredFileField(dniFileSchemaConfig, "Se requiere foto del DNI (dorso)."),
  fotoPerfil: requiredFileField(profileFileSchemaConfig, "Se requiere foto de perfil."),

});
export type AdherenteFormData = z.infer<typeof adherenteFormSchema>;

export const adherenteSchema = adherenteFormSchema.extend({
  id: z.string().optional(),
  estadoAdherente: z.nativeEnum(EstadoAdherente),
  estadoSolicitud: z.nativeEnum(EstadoSolicitudAdherente),
  motivoRechazo: z.string().optional().nullable(),
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
  relacion: z.nativeEnum(RelacionFamiliar), // Simplificado
  telefono: z.string().min(10, "Teléfono debe tener al menos 10 caracteres numéricos.").regex(/^\d+$/, "Teléfono solo debe contener números.").optional().or(z.literal('')),
  email: z.string().email("Email inválido.").optional().or(z.literal('')),
  direccion: z.string().min(5, "Dirección es requerida.").optional().or(z.literal('')),
  fotoPerfil: optionalFileField(profileFileSchemaConfig).nullable(),
  fotoDniFrente: optionalFileField(dniFileSchemaConfig).nullable(),
  fotoDniDorso: optionalFileField(dniFileSchemaConfig).nullable(),
  fotoCarnet: optionalFileField(profileFileSchemaConfig).nullable(),
  aptoMedico: z.custom<AptoMedicoInfo>().optional(),
}).refine(data => {
  if (data.relacion === RelacionFamiliar.HIJO_A) {
    if (!data.fechaNacimiento) return true; // Dejar que la validación base maneje el campo requerido
    const hoy = new Date();
    const fechaNacimiento = new Date(data.fechaNacimiento);
    // Para ser válido, la persona debe tener 21 años o menos.
    // Calculamos la fecha límite: hoy hace 22 años.
    const fechaLimite = new Date(hoy.getFullYear() - 22, hoy.getMonth(), hoy.getDate());
    // La fecha de nacimiento debe ser posterior a esta fecha límite.
    return fechaNacimiento > fechaLimite;
  }
  return true;
}, {
  message: "Los hijos no pueden ser mayores de 21 años.",
  path: ["fechaNacimiento"],
});
export type AdminEditableFamiliarData = z.infer<typeof adminEditableFamiliarSchema>;

export const adminEditableAdherenteSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().min(2, "Nombre es requerido."),
  apellido: z.string().min(2, "Apellido es requerido."),
  dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos."),
  fechaNacimiento: safeDate,
  telefono: z.string().min(10, "Teléfono debe tener al menos 10 caracteres numéricos.").regex(/^\d+$/, "Teléfono solo debe contener números.").optional().or(z.literal('')),
  email: z.string().email("Email inválido.").optional().or(z.literal('')),
  direccion: z.string().min(5, "Dirección es requerida.").optional().or(z.literal('')),
  fotoPerfil: optionalFileField(profileFileSchemaConfig).nullable(),
  fotoDniFrente: optionalFileField(dniFileSchemaConfig).nullable(),
  fotoDniDorso: optionalFileField(dniFileSchemaConfig).nullable(),
  estadoAdherente: z.nativeEnum(EstadoAdherente),
  estadoSolicitud: z.nativeEnum(EstadoSolicitudAdherente),
  motivoRechazo: z.string().optional().nullable(),
  aptoMedico: z.custom<AptoMedicoInfo>(),
});
export type AdminEditableAdherenteData = z.infer<typeof adminEditableAdherenteSchema>;


const adminEditSocioTitularObject = z.object({
  apellido: z.string().min(2, "Apellido es requerido."),
  nombre: z.string().min(2, "Nombre es requerido."),
  fechaNacimiento: safeDate.optional().refine(date => !date || date <= subYears(new Date(), 18), {
    message: "El titular debe ser mayor de 18 años."
  }),
  dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos numéricos."),
  empresa: z.string().optional().or(z.literal('')),
  telefono: z.string().min(10, "Teléfono debe tener al menos 10 caracteres.").regex(/^\d+$/, "Teléfono solo debe contener números."),
  direccion: z.string().min(5, "Dirección es requerida."),
  email: z.string().email("Email inválido."),
  estadoSocio: z.enum(['Activo', 'Inactivo', 'Pendiente'], { required_error: "El estado del socio es requerido." }),
  motivoInactivacion: z.string().optional().nullable(),
  fechaInactivacion: z.date().optional().nullable(),
  familiares: z.array(adminEditableFamiliarSchema).optional(),
  adherentes: z.array(adminEditableAdherenteSchema).optional(),

  fotoUrl: optionalFileField(profileFileSchemaConfig).nullable(),
  fotoPerfil: optionalFileField(profileFileSchemaConfig).nullable(),
  fotoDniFrente: optionalFileField(dniFileSchemaConfig),
  fotoDniDorso: optionalFileField(dniFileSchemaConfig),
  fotoCarnet: optionalFileField(profileFileSchemaConfig),
  documentosCompletos: z.boolean().optional(),
});

export const adminEditSocioTitularSchema = adminEditSocioTitularObject.refine(
  (data) => {
    if (data.estadoSocio === 'Inactivo' && (!data.motivoInactivacion || data.motivoInactivacion.trim().length < 10)) {
      return false;
    }
    return true;
  },
  {
    message: "Debes proporcionar un motivo de al menos 10 caracteres al inactivar la cuenta.",
    path: ["motivoInactivacion"],
  }
);
export type AdminEditSocioTitularData = z.infer<typeof adminEditSocioTitularSchema>;

export const adminNuevoSocioTitularSchema = adminEditSocioTitularObject.extend({
  fechaNacimiento: safeDate.refine(date => date <= subYears(new Date(), 18), {
    message: "El titular debe ser mayor de 18 años."
  }),
});
export type AdminNuevoSocioTitularData = z.infer<typeof adminNuevoSocioTitularSchema>;

// Types for Control de Acceso
export interface AptoMedicoDisplay {
  status: 'Válido' | 'Vencido' | 'Pendiente' | 'Error' | 'No Aplica' | 'Sin datos' | 'N/A' | 'Inválido';
  message: string;
  colorClass: string;
  fechaVencimiento?: string;
  observaciones?: string;
}

export interface UltimoIngreso {
  hora: string;
  timestamp: Timestamp;
}

export interface EstadoResponsable {
  hayResponsable: boolean;
  responsable?: {
    nombre: string;
    apellido: string;
    tipo: string;
    hora: string;
  };
}

// Sistema de Solicitudes de Cambio de Fotos
export enum TipoFotoSolicitud {
  FOTO_PERFIL = 'fotoPerfil',
  FOTO_DNI_FRENTE = 'fotoDniFrente',
  FOTO_DNI_DORSO = 'fotoDniDorso',
  FOTO_CARNET = 'fotoCarnet',
}

export enum EstadoSolicitudCambioFoto {
  PENDIENTE = 'Pendiente',
  APROBADA = 'Aprobada',
  RECHAZADA = 'Rechazada',
}

export interface SolicitudCambioFoto {
  id: string;
  socioId: string;
  socioNombre: string;
  socioNumero: string;
  tipoPersona: 'Titular' | 'Familiar' | 'Adherente';
  familiarId?: string;
  tipoFoto: TipoFotoSolicitud;
  fotoActualUrl: string | null;
  fotoNuevaFile?: File; // Solo en el frontend
  fotoNuevaUrl?: string; // URL temporal para preview
  estado: EstadoSolicitudCambioFoto;
  motivoRechazo?: string;
  fechaSolicitud: Date;
  fechaRespuesta?: Date;
}

export interface SolicitudCambioFotoRaw extends Omit<SolicitudCambioFoto, 'fechaSolicitud' | 'fechaRespuesta' | 'fotoNuevaFile'> {
  fechaSolicitud: string;
  fechaRespuesta?: string;
}

export const solicitudCambioFotoSchema = z.object({
  id: z.string().default(() => `foto-${Date.now().toString(36)}`),
  socioId: z.string(),
  socioNombre: z.string(),
  socioNumero: z.string(),
  tipoPersona: z.enum(['Titular', 'Familiar', 'Adherente']),
  familiarId: z.string().optional(),
  tipoFoto: z.nativeEnum(TipoFotoSolicitud),
  fotoActualUrl: z.string().nullable(),
  fotoNuevaUrl: z.string().optional(),
  estado: z.nativeEnum(EstadoSolicitudCambioFoto).default(EstadoSolicitudCambioFoto.PENDIENTE),
  motivoRechazo: z.string().optional(),
  fechaSolicitud: z.date().default(() => new Date()),
  fechaRespuesta: z.date().optional(),
});

export interface RegistroAcceso {
  id: string;
  fecha: Date;
  personaDNI: string;
  personaNombre: string;
  personaTipo: string;
  registradoPorEmail: string;
  socioTitularId: string;
  socioTitularNumero: string;
  tipoRegistro: 'entrada' | 'salida';
  esInvitadoCumpleanos?: boolean;
  metodoPago?: string;
}