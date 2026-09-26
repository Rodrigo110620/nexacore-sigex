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

/** Ambientes mock hasta conectar API de catálogo. */
export const AMBIENTES_MOCK = [
  { id: '1', label: 'Aula 204 (Disponible · Aforo: 50 · Pabellón B)' },
  { id: '2', label: 'Lab. Redes (Disponible · Aforo: 30 · Pabellón A)' },
  { id: '3', label: 'Aula Magna (Disponible · Aforo: 120 · Campus)' },
] as const
