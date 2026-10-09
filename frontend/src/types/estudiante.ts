export interface CarreraInfo {
  idCarrera: number
  nombreCarrera: string
  idFacultad: number
  nombreFacultad: string
}

export interface EstudianteListItem {
  id: number
  codigoSis: string
  nombre: string
  apellidos: string
  ci: string
  email?: string | null
  carreras: CarreraInfo[]
}

export interface EstudianteFilterParams {
  search: string
  idFacultad: string | ''
  idCarrera: string | ''
}

export interface EstudianteListPage {
  contenido: EstudianteListItem[]
  pagina: number
  tamano: number
  totalRegistros: number
  totalPaginas: number
}

export interface CarreraOption {
  idCarrera: number
  nombre: string
  codigo?: string
  idFacultad: number
  nombreFacultad: string
}

export interface FacultadOption {
  id: number
  nombre: string
  codigo?: string
}

export interface RegistrarEstudiantePayload {
  nombre: string
  apellidos: string
  ci: string
  email: string
  codigoSis: string
  idFacultad: number
  idCarrera: number
}
export interface ActualizarEstudiantePayload {
  nombre: string
  apellidos: string
  ci: string
  email: string
  codigoSis: string
  idFacultad: number
  idCarrera: number
}

