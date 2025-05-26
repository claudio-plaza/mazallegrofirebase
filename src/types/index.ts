import { z } from 'zod';
import { subYears, parseISO } from 'date-fns';

export type UserRole = 'socio' | 'portero' | 'medico' | 'administrador';

export const MAX_HIJOS = 12;
export const MAX_PADRES = 2;

export enum EmpresaTitular {
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
  direccion?: string;
  telefono?: string;
  email?: string;
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
  role: Extract<UserRole, 'socio'>; // Para asegurar que un socio siempre tenga rol 'socio'
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
  .refine(files => files.length === 1, "Solo se puede subir un archivo.")
  .refine(files => files[0].size <= 5 * 1024 * 1024, `El archivo no debe exceder 5MB.`);

const dniFileSchema = fileSchema.refine(files => ['image/png', 'image/jpeg', 'application/pdf'].includes(files[0].type), "Solo se aceptan archivos PNG, JPG o PDF.");
const profileFileSchema = fileSchema.refine(files => ['image/png', 'image/jpeg'].includes(files[0].type), "Solo se aceptan archivos PNG o JPG.");


export const paso1TitularSchema = z.object({
  apellido: z.string().min(2, "Apellido es requerido."),
  nombre: z.string().min(2, "Nombre es requerido."),
  fechaNacimiento: z.date().refine(date => {
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
  direccion: z.string().min(5, "Dirección es requerida.").optional(),
  telefono: z.string().min(10, "Teléfono debe tener al menos 10 caracteres numéricos.").regex(/^\d+$/, "Teléfono solo debe contener números.").optional(),
  email: z.string().email("Email inválido.").optional(),
  fotoDniFrente: dniFileSchema.optional(),
  fotoDniDorso: dniFileSchema.optional(),
  fotoPerfil: profileFileSchema.optional(),
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

export const paso3FamiliaresSchema = z.object({
  tipoGrupoFamiliar: z.enum(["conyugeEHijos", "padresMadres"], { errorMap: () => ({ message: "Debe seleccionar un tipo de grupo familiar."}) }),
  conyuge: conyugeSchema.optional().nullable(),
  hijos: z.array(hijoSchema).max(MAX_HIJOS, `No puede agregar más de ${MAX_HIJOS} hijos.`).optional(),
  padres: z.array(padreSchema).max(MAX_PADRES, `No puede agregar más de ${MAX_PADRES} padres.`).optional(),
}).superRefine((data, ctx) => {
  if (data.tipoGrupoFamiliar === "conyugeEHijos") {
    if (data.padres && data.padres.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No puede registrar Padres si eligió Cónyuge e Hijos.",
        path: ["padres"],
      });
    }
  } else if (data.tipoGrupoFamiliar === "padresMadres") {
    if (data.conyuge) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No puede registrar Cónyuge si eligió Padres/Madres.",
        path: ["conyuge"],
      });
    }
    if (data.hijos && data.hijos.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No puede registrar Hijos si eligió Padres/Madres.",
        path: ["hijos"],
      });
    }
  }
});
export type Paso3FamiliaresData = z.infer<typeof paso3FamiliaresSchema>;


export const altaSocioSchema = paso1TitularSchema.merge(z.object({ familiares: paso3FamiliaresSchema }));
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
