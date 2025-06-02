
import { z } from 'zod';
import { subYears, parseISO, isValid } from 'date-fns';

export type UserRole = 'socio' | 'portero' | 'medico' | 'administrador';

export const MAX_HIJOS = 12;
export const MAX_PADRES = 2;
export const MAX_INVITADOS_CUMPLEANOS = 15;

export enum EmpresaTitular {
  SADOP = "Sadop",
  AMPROS = "Ampros",
  JUDICIALES = "Judiciales",
  SUTIAGA = "Sutiaga",
  SIDUNCU = "Siduncu",
  CLAN_PITU = "Clan Pitu",
  PARTICULAR = "Particular",
  OSDE = "OSDE",
  SWISS_MEDICAL = "Swiss Medical",
  GALENO = "Galeno",
  MEDICUS = "Medicus",
  OMINT = "Omint",
  SANCOR_SALUD = "Sancor Salud",
  OTRA = "Otra",
  NINGUNA = "Ninguna",
}
export const empresas = Object.values(EmpresaTitular);

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


export interface AptoMedicoInfo {
  valido: boolean;
  fechaEmision?: string;
  fechaVencimiento?: string;
  razonInvalidez?: string;
  observaciones?: string;
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
  fechaNacimiento: Date | string;
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

export interface PreciosInvitadosConfig {
  precioInvitadoDiario: number;
  precioInvitadoCumpleanos: number;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Helper for SSR compatibility with FileList
const FileListInstance = typeof window !== 'undefined' ? FileList : Object;

const baseFileSchema = (message: string) =>
  z.instanceof(FileListInstance, { message })
    .refine(files => files && files.length === 1, "Debe seleccionar un archivo.")
    .refine(files => files?.[0]?.size <= MAX_FILE_SIZE_BYTES, `El archivo no debe exceder ${MAX_FILE_SIZE_MB}MB.`);

const dniFileSchema = (message: string) =>
  baseFileSchema(message).refine(
    files => files?.[0] && ['image/png', 'image/jpeg', 'application/pdf'].includes(files[0].type),
    "Solo se aceptan archivos PNG, JPG o PDF."
  );

const profileFileSchema = (message: string) =>
  baseFileSchema(message).refine(
    files => files?.[0] && ['image/png', 'image/jpeg'].includes(files[0].type),
    "Solo se aceptan archivos PNG o JPG."
  );

const optionalProfileFileSchema = () =>
  baseFileSchema("Archivo inválido.")
    .refine(
      files => files?.[0] && ['image/png', 'image/jpeg'].includes(files[0].type),
      "Solo se aceptan archivos PNG o JPG para la foto."
    )
    .nullable()
    .optional();


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
  fotoDniFrente: dniFileSchema("Se requiere foto del DNI (frente).").nullable(),
  fotoDniDorso: dniFileSchema("Se requiere foto del DNI (dorso).").nullable(),
  fotoPerfil: profileFileSchema("Se requiere foto de perfil.").nullable(),
  fotoCarnet: optionalProfileFileSchema(),
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
  fotoDniFrente: dniFileSchema("Se requiere foto del DNI (frente).").nullable(),
  fotoDniDorso: dniFileSchema("Se requiere foto del DNI (dorso).").nullable(),
  fotoPerfil: profileFileSchema("Se requiere foto de perfil.").nullable(),
  fotoCarnet: optionalProfileFileSchema(),
});
export type TitularData = z.infer<typeof titularSchema>;

export interface Socio extends TitularData {
  id: string;
  numeroSocio: string;
  fotoUrl?: string;
  estadoSocio: 'Activo' | 'Inactivo' | 'Pendiente Validacion';
  aptoMedico: AptoMedicoInfo;
  miembroDesde: string;
  ultimaRevisionMedica?: string;
  grupoFamiliar: MiembroFamiliar[];
  adherentes?: Adherente[];
  cuenta?: CuentaSocio;
  documentos?: DocumentoSocioGeneral[];
  estadoSolicitud?: EstadoSolicitudSocio;
  role: Extract<UserRole, 'socio'>;
  cambiosPendientesGrupoFamiliar?: {
    tipoGrupoFamiliar?: "conyugeEHijos" | "padresMadres";
    familiares?: {
      conyuge?: MiembroFamiliar | null;
      hijos?: MiembroFamiliar[];
      padres?: MiembroFamiliar[];
    }
  } | null;
  estadoCambioGrupoFamiliar?: EstadoCambioGrupoFamiliar;
  motivoRechazoCambioGrupoFamiliar?: string;
}

export interface RevisionMedica {
  id: string;
  fechaRevision: string;
  socioId: string;
  socioNombre: string;
  resultado: 'Apto' | 'No Apto';
  fechaVencimientoApto?: string;
  observaciones?: string;
  medicoResponsable?: string;
}

export const familiarBaseSchema = z.object({
  id: z.string().optional(),
  apellido: z.string().min(2, "Apellido es requerido."),
  nombre: z.string().min(2, "Nombre es requerido."),
  fechaNacimiento: z.union([z.date(), z.string()]).transform(val => typeof val === 'string' ? parseISO(val) : val)
    .refine(date => isValid(date), "Fecha de nacimiento inválida."),
  dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos numéricos."),
  fotoDniFrente: z.union([dniFileSchema("Se requiere foto del DNI (frente)."), z.string().url(), z.null()]).optional(),
  fotoDniDorso: z.union([dniFileSchema("Se requiere foto del DNI (dorso)."), z.string().url(), z.null()]).optional(),
  fotoPerfil: z.union([profileFileSchema("Se requiere foto de perfil."), z.string().url(), z.null()]).optional(),
  fotoCarnet: z.union([optionalProfileFileSchema(), z.string().url(), z.null()]).optional(),
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

let currentStepForSchemaValidation = 1;
export const setCurrentStepForSchema = (step: number) => { currentStepForSchemaValidation = step; };

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
export type SolicitudCumpleanos = z.infer<typeof solicitudCumpleanosSchema>;

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
});
export type InvitadoDiario = z.infer<typeof invitadoDiarioSchema>;

export const solicitudInvitadosDiariosSchema = z.object({
  id: z.string().default(() => `invd-${Date.now().toString(36)}`),
  idSocioTitular: z.string({ required_error: "ID del socio titular es requerido."}),
  nombreSocioTitular: z.string({ required_error: "Nombre del socio titular es requerido."}),
  fecha: z.string({ required_error: "La fecha es obligatoria (ISO date string)." }),
  listaInvitadosDiarios: z.array(invitadoDiarioSchema)
    .min(1, "Debe agregar al menos un invitado."),
  titularIngresadoEvento: z.boolean().default(false),
});
export type SolicitudInvitadosDiarios = z.infer<typeof solicitudInvitadosDiariosSchema>;

export const adherenteFormSchema = z.object({
    nombre: z.string().min(2, "Nombre es requerido."),
    apellido: z.string().min(2, "Apellido es requerido."),
    fechaNacimiento: z.date({ required_error: "Fecha de nacimiento es requerida.", invalid_type_error: "Fecha de nacimiento inválida."}),
    dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos numéricos."),
    empresa: z.string().min(1, "Empresa / Sindicato es requerido."),
    telefono: z.string().min(10, "Teléfono debe tener al menos 10 caracteres numéricos.").regex(/^\d+$/, "Teléfono solo debe contener números.").optional().or(z.literal('')),
    direccion: z.string().min(5, "Dirección es requerida.").optional().or(z.literal('')),
    email: z.string().email("Email inválido.").optional().or(z.literal('')),
    fotoDniFrente: dniFileSchema("Se requiere foto del DNI (frente).").nullable().optional(),
    fotoDniDorso: dniFileSchema("Se requiere foto del DNI (dorso).").nullable().optional(),
    fotoPerfil: profileFileSchema("Se requiere foto de perfil.").nullable().optional(),
    fotoCarnet: optionalProfileFileSchema(),
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


export const getStepSpecificValidationSchema = (step: number) => {
  setCurrentStepForSchema(step);
  return agregarFamiliaresSchema;
};
isValid(new Date());
