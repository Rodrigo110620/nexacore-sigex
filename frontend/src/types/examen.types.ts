export interface NormaGeneral {
  id: string
  texto: string
}

export interface NormaParticular {
  id: string
  estudiante: string
  texto: string
}

export interface RegisterExamenFormState {
  asignatura: string
  docente: string
  fecha: string
  horaInicio: string
  horaFin: string
  idAmbiente: string
}

export interface RegisterExamenFormErrors {
  asignatura?: string
  docente?: string
  fecha?: string
  horaInicio?: string
  horaFin?: string
  idAmbiente?: string
}

export const INITIAL_EXAMEN_FORM: RegisterExamenFormState = {
  asignatura: '',
  docente: '',
  fecha: '',
  horaInicio: '',
  horaFin: '',
  idAmbiente: '',
}
