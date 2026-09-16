// Rol es string dinámico: los valores válidos vienen de GET /api/v1/usuarios/roles.
// ROLES_OPTIONS es el catálogo inicial; se reemplaza al consultar la BD.
export type Rol = string;

export type TipoDocumento = 'CI';

export interface RegisterUserRequest {
  nombre: string;
  apellidos: string;
  tipoDocumento: TipoDocumento;
  documento: string;
  email: string;
  rol: Rol;
  activo: boolean;
  notificarEmail: boolean;
}

export interface Usuario {
  id: number;
  nombre: string;
  apellidos: string;
  tipoDocumento: TipoDocumento;
  documento: string;
  email: string;
  rol: Rol;
  activo: boolean;
  fechaCreacion: string;
}

export interface RegisterUserResponse {
  usuario: Usuario;
  mensaje: string;
}


export interface ApiError {
  status: number;
  message: string;
  camposFaltantes?: string[];
}

export interface RolOption {
  value: Rol;
  titulo: string;
  subtitulo: string;
  descripcion: string;
}

export const ROLES_OPTIONS: RolOption[] = [
  {
    value: 'ADMIN',
    titulo: 'Administrador',
    subtitulo: 'ROOT',
    descripcion: 'Acceso total al sistema',
  },
  {
    value: 'DOCENTE',
    titulo: 'Docente',
    subtitulo: 'EVALUADOR',
    descripcion: 'Gestión de exámenes y evaluaciones',
  },
  {
    value: 'CONTROL',
    titulo: 'P. Control',
    subtitulo: 'VIGILANCIA',
    descripcion: 'Control de ingreso a exámenes',
  },
];


export interface RegisterUserFormState {
  nombre: string;
  apellidos: string;
  tipoDocumento: TipoDocumento;
  documento: string;
  email: string;
  rol: Rol;
  activo: boolean;
  notificarEmail: boolean;
}

export const INITIAL_FORM_STATE: RegisterUserFormState = {
  nombre: '',
  apellidos: '',
  tipoDocumento: 'CI',
  documento: '',
  email: '',
  rol: 'DOCENTE', 
  activo: true,
  notificarEmail: true,
};

export interface FormErrors {
  nombre?: string;
  apellidos?: string;
  documento?: string;
  email?: string;
  rol?: string;
}