
import { z } from 'zod';
import { subYears, parseISO } from 'date-fns';

export type UserRole = 'socio' | 'portero' | 'medico' | 'administrador';

export const MAX_HIJOS = 12;
export const MAX_PADRES = 2;

// Updated list of companies
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

export interface AptoMedicoInfo {
  valido: boolean;
  fechaEmision?: string; // ISO date string
  fechaVencimiento?: string; // ISO date string (ultimo dia valido)
  razonInvalidez?: string;
  observaciones?: string;
}

export interface DocumentoSocioGeneral {
  id: string;
  nombreArchivo: string;
  tipoDocumento: string; // e.g., 'DNI_FRENTE', 'CERT_MATRIMONIO'
  url?: string; // Opcional, si se almacena en la nube
  fechaCarga: string; // ISO date string
}

export interface CuentaSocio {
  estadoCuenta: 'Al Dia' | 'Con Deuda' | 'Suspendida';
  fechaUltimoPago?: string; // ISO date string
  saldoActual?: number;
}

export interface MiembroFamiliar {
  id?: string; // generado al guardar
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: Date;
  relacion: RelacionFamiliar;
  direccion?: string; // Opcional
  telefono?: string; // Opcional
  email?: string; // Opcional
  fotoPerfil?: FileList | null;
  fotoDniFrente?: FileList | null;
  fotoDniDorso?: FileList | null;
  estadoValidacion?: EstadoValidacionFamiliar;
  aptoMedico?: AptoMedicoInfo; // Para familiares que también requieran apto
}

export interface Socio {
  id: string; // Puede ser el numeroSocio o un UUID
  nombre: string;
  apellido: string;
  numeroSocio: string; // Identificador unico para socios
  dni: string;
  fechaNacimiento: Date;
  fotoUrl?: string; // URL a la foto de perfil
  fotoPerfil?: FileList | null;
  fotoDniFrente?: FileList | null;
  fotoDniDorso?: FileList | null;
  estadoSocio: 'Activo' | 'Inactivo' | 'Pendiente Validacion';
  aptoMedico: AptoMedicoInfo;
  email: string;
  telefono: string;
  direccion: string;
  empresa: EmpresaTitular;
  miembroDesde: string; // ISO date string
  ultimaRevisionMedica?: string; // ISO date string
  grupoFamiliar: MiembroFamiliar[];
  cuenta?: CuentaSocio;
  documentos?: DocumentoSocioGeneral[];
  estadoSolicitud?: EstadoSolicitudSocio;
  role: Extract<UserRole, 'socio'>; 
}

export interface RevisionMedica {
  id: string; // UUID
  fechaRevision: string; // ISO date string
  socioId: string; // numeroSocio
  socioNombre: string;
  resultado: 'Apto' | 'No Apto';
  fechaVencimientoApto?: string; // ISO date string (ultimo dia valido)
  observaciones?: string;
  medicoResponsable?: string; // Nombre del medico o ID
}

// Zod Schemas for Forms

const fileSchema = z.custom<FileList>((val) => val instanceof FileList && val.length > 0, "Se requiere un archivo.")
  .refine(files => files?.[0]?.size <= 5 * 1024 * 1024, `El archivo no debe exceder 5MB.`) 
  .refine(files => files?.length === 1, "Solo se puede subir un archivo.");


const dniFileSchema = fileSchema
  .refine(files => files?.[0] && ['image/png', 'image/jpeg', 'application/pdf'].includes(files[0].type), "Solo se aceptan archivos PNG, JPG o PDF para el DNI.");
const profileFileSchema = fileSchema
  .refine(files => files?.[0] && ['image/png', 'image/jpeg'].includes(files[0].type), "Solo se aceptan archivos PNG o JPG para la foto de perfil.");


export const paso1TitularSchema = z.object({
  apellido: z.string().min(2, "Apellido es requerido."),
  nombre: z.string().min(2, "Nombre es requerido."),
  fechaNacimiento: z.date({ errorMap: () => ({ message: "Fecha de nacimiento es requerida."})}).refine(date => {
    return date <= subYears(new Date(), 18);
  }, "Debe ser mayor de 18 años."),
  dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos numéricos."),
  empresa: z.nativeEnum(EmpresaTitular, { errorMap: () => ({ message: "Seleccione una empresa."})}),
  telefono: z.string().min(10, "Teléfono debe tener al menos 10 caracteres numéricos.").regex(/^\d+$/, "Teléfono solo debe contener números."),
  direccion: z.string().min(5, "Dirección es requerida."),
  email: z.string().email("Email inválido."),
  fotoDniFrente: dniFileSchema,
  fotoDniDorso: dniFileSchema,
  fotoPerfil: profileFileSchema,
});
export type Paso1TitularData = z.infer<typeof paso1TitularSchema>;

export const familiarBaseSchema = z.object({
  id: z.string().optional(),
  apellido: z.string().min(2, "Apellido es requerido."),
  nombre: z.string().min(2, "Nombre es requerido."),
  fechaNacimiento: z.date({ errorMap: () => ({ message: "Fecha de nacimiento inválida."})}),
  dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos numéricos."),
  fotoDniFrente: dniFileSchema, 
  fotoDniDorso: dniFileSchema, 
  fotoPerfil: profileFileSchema, 
  direccion: z.string().min(5, "Dirección es requerida.").optional(),
  telefono: z.string().min(10, "Teléfono debe tener al menos 10 caracteres numéricos.").regex(/^\d+$/, "Teléfono solo debe contener números.").optional(),
  email: z.string().email("Email inválido.").optional(),
  relacion: z.nativeEnum(RelacionFamiliar),
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

// Schema for Step 2 (previously Step 3) - Datos del Grupo Familiar
export const paso2FamiliaresSchema = z.object({
  // tipoGrupoFamiliar is removed
  conyuge: conyugeSchema.optional().nullable(),
  hijos: z.array(hijoSchema).max(MAX_HIJOS, `No puede agregar más de ${MAX_HIJOS} hijos.`).optional(),
  padres: z.array(padreSchema).max(MAX_PADRES, `No puede agregar más de ${MAX_PADRES} padres.`).optional(),
});
// The superRefine logic that depended on tipoGrupoFamiliar is removed.
// If you need specific constraints like "cannot have conyuge AND parents", that would require a new superRefine.
// For now, it allows any combination of conyuge, hijos, padres (within their respective limits).
export type Paso2FamiliaresData = z.infer<typeof paso2FamiliaresSchema>;


// Main schema for the entire multi-step form
export const altaSocioSchema = paso1TitularSchema.merge(z.object({ familiares: paso2FamiliaresSchema }));
export type AltaSocioData = z.infer<typeof altaSocioSchema>;

export interface QuickAccessFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  roles: UserRole[];
  image?: string; // Was previously used for placeholder, can be removed if not needed
  imageHint?: string;
}
