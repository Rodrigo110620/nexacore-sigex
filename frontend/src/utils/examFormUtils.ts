import type { RegisterExamenFormErrors, RegisterExamenFormState } from '../types/examen.types'

export function parseHora24(value: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null
  return { h, m }
}

export function formatHora24(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Solo dígitos; inserta `:` tras la hora (máx. HH:MM, 24 h). */
export function sanitizeHoraInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

/** Ambientes cuyo nombre o ubicación contienen el texto buscado (sin distinguir mayúsculas). */
export function filtrarAmbientes<T extends { nombre: string; ubicacion?: string | null }>(
  ambientes: T[],
  filtro: string,
): T[] {
  const q = filtro.trim().toLowerCase()
  if (!q) return ambientes
  return ambientes.filter(
    (a) => a.nombre.toLowerCase().includes(q) || (a.ubicacion ?? '').toLowerCase().includes(q),
  )
}

/** Clase de los campos del formulario de examen, con borde rojo si tienen error. */
export function examFieldClass(hasError?: string): string {
  return `w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-[#011140] focus:outline-none focus:ring-2 focus:ring-[#0439D9]/25 ${
    hasError ? 'border-red-400' : 'border-gray-200'
  }`
}

/** Pabellón, ubicación y aforo de un ambiente, en una línea. */
export function detalleAmbiente(a: {
  ubicacion?: string | null
  pabellon?: string | null
  capacidad?: number | null
}): string {
  return [
    a.pabellon ? `Pabellón ${a.pabellon}` : null,
    a.ubicacion,
    a.capacidad ? `Aforo ${a.capacidad}` : 'Aforo sin registrar',
  ].filter(Boolean).join(' · ')
}

export const EXAM_SECTION_CARD_CLASS = 'rounded-xl border border-[#E8EEF7] bg-[#FAFCFF] p-4'

export function minutesBetween(start: string, end: string): number | null {
  const a = parseHora24(start)
  const b = parseHora24(end)
  if (!a || !b) return null
  const diff = b.h * 60 + b.m - (a.h * 60 + a.m)
  return diff > 0 ? diff : null
}

export function todayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatFechaDisplay(iso: string): string {
  const [year, month, day] = (iso ?? '').split('-')
  if (!year || !month || !day) return ''
  return `${day}/${month}/${year}`
}

export function formatAmPm(hora: string): string {
  const parsed = parseHora24(hora)
  if (!parsed) return ''
  const suffix = parsed.h >= 12 ? 'PM' : 'AM'
  const hour12 = parsed.h % 12 || 12
  return `${hour12}:${String(parsed.m).padStart(2, '0')} ${suffix}`
}

/** Asignatura y docente: solo letras (con tildes y ñ) y espacios simples, sin espacio inicial, hasta 100. */
export function sanitizeCatalogQuery(value: string): string {
  return value
    .replace(/[^A-Za-záéíóúÁÉÍÓÚüÜñÑ\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^ /, '')
    .slice(0, 100)
}

const NUMERO_ROMANO = /^(?=[ivxlc]+$)c{0,3}(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/

/**
 * Formato Título como el registro de usuario y estudiantes: primera letra de cada palabra
 * en mayúscula y el resto en minúscula. Los números romanos quedan en mayúscula ("Cálculo II").
 */
export function toTitleCaseTexto(value: string): string {
  return value.replace(/[A-Za-záéíóúÁÉÍÓÚüÜñÑ]+/g, (palabra) => {
    const lower = palabra.toLocaleLowerCase('es-BO')
    if (NUMERO_ROMANO.test(lower)) return lower.toLocaleUpperCase('es-BO')
    return lower.charAt(0).toLocaleUpperCase('es-BO') + lower.slice(1)
  })
}

/** Formato oración, como el registro de usuario: primera letra en mayúscula y el resto en minúscula. */
export function formatearNorma(value: string): string {
  const lower = value.toLocaleLowerCase('es-BO')
  return lower.replace(/[A-Za-záéíóúüñ]/, (letra) => letra.toLocaleUpperCase('es-BO'))
}

export const NORMA_MIN = 10
export const NORMA_MAX = 60
/** Letras (con tildes y ñ), números, espacios y puntuación básica: "CI: original y vigente", "30 minutos". */
const NORMA_CARACTERES = /^[A-Za-z0-9áéíóúÁÉÍÓÚüÜñÑ .,;:()¿?¡!"'/%-]+$/

export function validateNormaTexto(raw: string, existentes: string[] = []): string | null {
  if (!raw.trim()) return 'La norma no puede estar vacía'
  if (raw !== raw.trim()) return 'No se permiten espacios al inicio ni al final'
  if (/\s{2,}/.test(raw)) return 'No se permiten espacios dobles'
  if (raw.length < NORMA_MIN) return `La norma debe tener al menos ${NORMA_MIN} caracteres`
  if (raw.length > NORMA_MAX) return `La norma no puede superar ${NORMA_MAX} caracteres`
  if (/^[\d\s]+$/.test(raw)) return 'La norma no puede contener solo números'
  if (!/[A-Za-záéíóúÁÉÍÓÚüÜñÑ]/.test(raw)) return 'La norma debe contener texto descriptivo'
  if (!NORMA_CARACTERES.test(raw)) return 'La norma contiene caracteres no permitidos'
  const compacto = raw.replace(/\s/g, '')
  if (/^(.)\1+$/i.test(compacto)) return 'La norma no puede ser un mismo carácter repetido'
  if (/^(.{1,3})\1{3,}$/i.test(compacto)) return 'La norma no puede ser un patrón repetitivo sin significado'
  const normalizada = raw.toLowerCase()
  if (existentes.some((t) => t.trim().toLowerCase() === normalizada)) return 'Esta norma ya fue registrada'
  return null
}

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

export function isNetworkError(err: unknown): boolean {
  const error = err as { code?: string; message?: string; response?: unknown }
  if (isOffline()) return true
  if (error.response) return false
  return error.code === 'ERR_NETWORK' || error.message === 'Network Error'
}

export function validateExamenForm(
  form: RegisterExamenFormState,
  catalogo: {
    asignaturaSeleccionada: boolean
    docenteSeleccionado: boolean
    validarPasado?: boolean
    /** El ambiente elegido ya tiene otro examen que se cruza con el horario. */
    ambienteOcupado?: boolean
  },
): RegisterExamenFormErrors {
  const validarPasado = catalogo.validarPasado ?? true
  const errors: RegisterExamenFormErrors = {}
  if (!form.asignatura.trim()) {
    errors.asignatura = 'La asignatura es obligatoria'
  } else if (!catalogo.asignaturaSeleccionada) {
    errors.asignatura = 'Selecciona una asignatura del catálogo'
  }
  if (!form.docente.trim()) {
    errors.docente = 'El docente responsable es obligatorio'
  } else if (!catalogo.docenteSeleccionado) {
    errors.docente = 'Selecciona un docente de las sugerencias'
  }
  if (!form.fecha) {
    errors.fecha = 'La fecha es obligatoria'
  } else if (validarPasado && form.fecha < todayISO()) {
    errors.fecha = 'No se permite una fecha anterior a hoy'
  }
  if (!form.horaInicio.replace(':', '').trim()) {
    errors.horaInicio = 'La hora de inicio es obligatoria'
  } else if (!parseHora24(form.horaInicio)) {
    errors.horaInicio = 'Selecciona la hora y los minutos de inicio'
  }
  if (!form.horaFin.replace(':', '').trim()) {
    errors.horaFin = 'La hora de fin es obligatoria'
  } else if (!parseHora24(form.horaFin)) {
    errors.horaFin = 'Selecciona la hora y los minutos de fin'
  }
  if (!form.idAmbiente) errors.idAmbiente = 'Selecciona un ambiente'
  else if (catalogo.ambienteOcupado) errors.idAmbiente = 'El ambiente está ocupado en ese horario. Elige otro.'
  if (!errors.horaInicio && !errors.horaFin) {
    const dur = minutesBetween(form.horaInicio, form.horaFin)
    if (dur === null) {
      errors.horaFin = 'La hora de fin debe ser posterior al inicio'
    }
  }
  if (validarPasado && !errors.fecha && !errors.horaInicio && form.fecha === todayISO()) {
    const parsed = parseHora24(form.horaInicio)
    if (parsed) {
      const now = new Date()
      const current = now.getHours() * 60 + now.getMinutes()
      if (parsed.h * 60 + parsed.m < current) {
        errors.horaInicio = 'Para hoy, la hora de inicio no puede ser anterior a la actual'
      }
    }
  }
  return errors
}
