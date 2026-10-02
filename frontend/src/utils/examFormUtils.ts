import type { RegisterExamenFormErrors, RegisterExamenFormState } from '../types/examen.types'

export function parseHora24(value: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null
  return { h, m }
}

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

export function sanitizeCatalogQuery(value: string): string {
  return value
    .replace(/^\s+/, '')
    .replace(/[^A-Za-záéíóúÁÉÍÓÚüÜñÑ '-]/g, '')
    .replace(/\s{2,}/g, ' ')
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

export function validateNormaTexto(raw: string, existentes: string[] = []): string | null {
  if (!raw.trim()) return 'La norma no puede estar vacía'
  if (raw !== raw.trim()) return 'No se permiten espacios al inicio ni al final'
  if (/\s{2,}/.test(raw)) return 'No se permiten espacios dobles'
  if (raw.length < NORMA_MIN) return `La norma debe tener al menos ${NORMA_MIN} caracteres`
  if (raw.length > NORMA_MAX) return `La norma no puede superar ${NORMA_MAX} caracteres`
  if (/^[\d\s]+$/.test(raw)) return 'La norma no puede contener solo números'
  if (!/[A-Za-záéíóúÁÉÍÓÚüÜñÑ]/.test(raw)) return 'La norma debe contener texto descriptivo'
  if (/^(.)\1+$/i.test(raw.replace(/\s/g, ''))) return 'La norma no puede ser un mismo carácter repetido'
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
  catalogo: { asignaturaSeleccionada: boolean; docenteSeleccionado: boolean; validarPasado?: boolean },
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
  if (!form.horaInicio.trim()) {
    errors.horaInicio = 'La hora de inicio es obligatoria'
  } else if (!parseHora24(form.horaInicio)) {
    errors.horaInicio = 'Usa formato 24 h (ej. 08:00 o 13:30)'
  }
  if (!form.horaFin.trim()) {
    errors.horaFin = 'La hora de fin es obligatoria'
  } else if (!parseHora24(form.horaFin)) {
    errors.horaFin = 'Usa formato 24 h (ej. 10:00 o 15:00)'
  }
  if (!form.idAmbiente) errors.idAmbiente = 'Selecciona un ambiente'
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
