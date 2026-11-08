/** Título, especialidad y categoría del DOCENTE (solo los registra y cambia el ADMIN). */
export interface DatosDocente {
  titulo: string
  especialidad: string
  categoria: 'INTERINO' | 'TITULAR' | 'INVITADO'
}

export const DATOS_DOCENTE_INICIALES: DatosDocente = { titulo: '', especialidad: '', categoria: 'INTERINO' }

export const CATEGORIAS_DOCENTE: { id: DatosDocente['categoria']; texto: string }[] = [
  { id: 'INTERINO', texto: 'Interino' },
  { id: 'TITULAR', texto: 'Titular' },
  { id: 'INVITADO', texto: 'Invitado' },
]

export const textoCategoria = (categoria?: string | null) => CATEGORIAS_DOCENTE.find((c) => c.id === categoria)?.texto ?? categoria ?? ''
