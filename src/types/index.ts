
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

// Titular data schema (can be used for initial full registration elsewhere)
export const titularSchema = z.object({
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
  fotoDniFrente: z.custom<FileList>((val) => val instanceof FileList && val.length > 0, "Se requiere foto del DNI (frente).")
    .refine(files => files?.[0]?.size <= 5 * 1024 * 1024, `El archivo no debe exceder 5MB.`)
    .refine(files => files?.[0] && ['image/png', 'image/jpeg', 'application/pdf'].includes(files[0].type), "Solo PNG, JPG o PDF."),
  fotoDniDorso: z.custom<FileList>((val) => val instanceof FileList && val.length > 0, "Se requiere foto del DNI (dorso).")
    .refine(files => files?.[0]?.size <= 5 * 1024 * 1024, `El archivo no debe exceder 5MB.`)
    .refine(files => files?.[0] && ['image/png', 'image/jpeg', 'application/pdf'].includes(files[0].type), "Solo PNG, JPG o PDF."),
  fotoPerfil: z.custom<FileList>((val) => val instanceof FileList && val.length > 0, "Se requiere foto de perfil.")
    .refine(files => files?.[0]?.size <= 5 * 1024 * 1024, `El archivo no debe exceder 5MB.`)
    .refine(files => files?.[0] && ['image/png', 'image/jpeg'].includes(files[0].type), "Solo PNG o JPG."),
});
export type TitularData = z.infer<typeof titularSchema>;


export interface Socio extends TitularData { // Socio now extends TitularData
  id: string; // Puede ser el numeroSocio o un UUID
  numeroSocio: string; // Identificador unico para socios
  fotoUrl?: string; // URL a la foto de perfil
  estadoSocio: 'Activo' | 'Inactivo' | 'Pendiente Validacion';
  aptoMedico: AptoMedicoInfo;
  miembroDesde: string; // ISO date string
  ultimaRevisionMedica?: string; // ISO date string
  grupoFamiliar: MiembroFamiliar[]; // This will be managed by the new form structure
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

// Zod Schemas for Perfil/Agregar Familiares Form

const fileSchema = z.custom<FileList>((val) => val instanceof FileList && val.length > 0, "Se requiere un archivo.")
  .refine(files => files?.[0]?.size <= 5 * 1024 * 1024, `El archivo no debe exceder 5MB.`) 
  .refine(files => files?.length === 1, "Solo se puede subir un archivo.");

const dniFileSchema = fileSchema
  .refine(files => files?.[0] && ['image/png', 'image/jpeg', 'application/pdf'].includes(files[0].type), "Solo se aceptan archivos PNG, JPG o PDF para el DNI.");
const profileFileSchema = fileSchema
  .refine(files => files?.[0] && ['image/png', 'image/jpeg'].includes(files[0].type), "Solo se aceptan archivos PNG o JPG para la foto de perfil.");

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


// Schema for the data of family members (Step 2 of new flow)
export const familiaresDetallesSchema = z.object({
  conyuge: conyugeSchema.optional().nullable(),
  hijos: z.array(hijoSchema).max(MAX_HIJOS, `No puede agregar más de ${MAX_HIJOS} hijos.`).optional(),
  padres: z.array(padreSchema).max(MAX_PADRES, `No puede agregar más de ${MAX_PADRES} padres.`).optional(),
});
export type FamiliaresDetallesData = z.infer<typeof familiaresDetallesSchema>;

// Main schema for the "Agregar Familiares" form
export const agregarFamiliaresSchema = z.object({
  tipoGrupoFamiliar: z.enum(["conyugeEHijos", "padresMadres"], {
    required_error: "Debe seleccionar un tipo de grupo familiar.",
  }),
  familiares: familiaresDetallesSchema,
}).superRefine((data, ctx) => {
  if (data.tipoGrupoFamiliar === "conyugeEHijos") {
    if (!data.familiares?.conyuge && (!data.familiares?.hijos || data.familiares.hijos.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe agregar al menos un cónyuge o un hijo/a cuando selecciona 'Cónyuge e Hijos/as'.",
        path: ["familiares"], 
      });
    }
    // Ensure padres array is empty or not present if conyugeEHijos is selected
    if (data.familiares?.padres && data.familiares.padres.length > 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "No puede agregar padres cuando selecciona 'Cónyuge e Hijos/as'. Vacíe la sección de padres.",
            path: ["familiares.padres"],
        });
    }
  } else if (data.tipoGrupoFamiliar === "padresMadres") {
    if (!data.familiares?.padres || data.familiares.padres.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe agregar al menos un padre/madre cuando selecciona 'Padres/Madres'.",
        path: ["familiares.padres"],
      });
    }
     // Ensure conyuge and hijos are empty/null if padresMadres is selected
    if (data.familiares?.conyuge) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "No puede agregar cónyuge cuando selecciona 'Padres/Madres'. Quite al cónyuge.",
            path: ["familiares.conyuge"],
        });
    }
    if (data.familiares?.hijos && data.familiares.hijos.length > 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "No puede agregar hijos cuando selecciona 'Padres/Madres'. Vacíe la sección de hijos.",
            path: ["familiares.hijos"],
        });
    }
  }
});
export type AgregarFamiliaresData = z.infer<typeof agregarFamiliaresSchema>;


// This was the old main schema, keeping it for reference or other uses if needed,
// but the Perfil page will use agregarFamiliaresSchema now.
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
