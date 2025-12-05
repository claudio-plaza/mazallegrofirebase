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

export interface AptoMedicoInfo {
  valido: boolean;
  fechaEmision?: any;
  fechaVencimiento?: any;
  razonInvalidez?: string;
  observaciones?: string;
}

export interface MiembroFamiliar {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: any;
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
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: any;
  telefono?: string;
  direccion?: string;
  email?: string;
  fotoDniFrente?: string | FileList | null;
  fotoDniDorso?: string | FileList | null;
  fotoPerfil?: string | FileList | null;
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
  fechaNacimiento: any;
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
  estadoSocio: 'Activo' | 'Inactivo' | 'Pendiente Validacion';
  aptoMedico: AptoMedicoInfo;
  miembroDesde: any;
  ultimaRevisionMedica?: any;
  grupoFamiliar: MiembroFamiliar[];
  adherentes?: Adherente[];
}
