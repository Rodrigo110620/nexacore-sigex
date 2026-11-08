/** El grupo que el DOCENTE eligió en las cards de Estudiantes (vacío = todos sus estudiantes). */
export interface GrupoElegido {
  idMateria: string
  idParalelo: string
  /** "Todos mis estudiantes" o "Materia · Grupo N", para el título de la lista. */
  titulo: string
}

export const TODOS_MIS_ESTUDIANTES: GrupoElegido = { idMateria: '', idParalelo: '', titulo: 'Todos mis estudiantes' }
