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

/** Especialidad (opcional): solo letras, con un espacio entre palabras; entre 10 y 100 caracteres. */
export const ESPECIALIDAD_MIN = 10
export const ESPECIALIDAD_MAX = 100
const LETRAS = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ'
const ESPECIALIDAD_VALIDA = new RegExp(`^[${LETRAS}]+( [${LETRAS}]+)*$`)

/** Mientras se escribe: quita lo que no es letra o espacio, deja un solo espacio entre palabras y ninguno al inicio. */
export function filtrarEspecialidad(valor: string): string {
  return valor.replace(new RegExp(`[^${LETRAS} ]`, 'g'), '').replace(/ {2,}/g, ' ').replace(/^ +/, '').slice(0, ESPECIALIDAD_MAX)
}

/** Para guardar: sin espacios sobrantes y en formato oración (mayúscula inicial, el resto en minúscula). */
export function normalizarEspecialidad(valor: string): string {
  const t = valor.trim().replace(/\s+/g, ' ')
  return t ? t.charAt(0).toLocaleUpperCase('es') + t.slice(1).toLocaleLowerCase('es') : ''
}

/** Mensaje de error de la especialidad, o null si está bien (vacía también está bien: es opcional). */
export function errorEspecialidad(valor: string): string | null {
  const t = valor.trim()
  if (!t) return null
  if (!ESPECIALIDAD_VALIDA.test(t)) return 'Solo letras, con un espacio entre palabras.'
  if (t.length < ESPECIALIDAD_MIN) return `Escribe al menos ${ESPECIALIDAD_MIN} caracteres (llevas ${t.length}).`
  if (t.length > ESPECIALIDAD_MAX) return `Máximo ${ESPECIALIDAD_MAX} caracteres.`
  return null
}
