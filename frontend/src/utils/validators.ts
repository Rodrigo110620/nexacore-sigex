import type { FormErrors, RegisterUserFormState } from '../types/usuario.types';

/** Límites de longitud alineados con el backend (@Size). */
export const FIELD_LIMITS = {
  nombre: { min: 2, max: 30 },
  apellidos: { min: 2, max: 40 },
  email: { min: 5, max: 40 },   // ← antes decía 20
  documento: { min: 7, max: 8 },
  rol: { min: 2, max: 30 },
} as const

const NOMBRE_REGEX =
  /^[A-Za-záéíóúÁÉÍÓÚüÜñÑ]+(?:[ '-][A-Za-záéíóúÁÉÍÓÚüÜñÑ]+)*$/

export function sanitizeNombreInput(value: string): string {
  return value
    .replace(/[^A-Za-záéíóúÁÉÍÓÚüÜñÑ '-]/g, '')
    .replace(/\s{2,}/g, ' ')
}

function validateNombrePersona(
  value: string,
  etiqueta: 'nombre' | 'apellidos',
  limits: { min: number; max: number },
): string {
  const trimmed = value.trim()
  const requerido =
    etiqueta === 'nombre' ? 'El nombre es obligatorio' : 'Los apellidos son obligatorios'

  if (!trimmed) return requerido
  if (trimmed.length < limits.min) return `Mínimo ${limits.min} caracteres`
  if (trimmed.length > limits.max) return `Máximo ${limits.max} caracteres`
  if (/\d/.test(trimmed)) {
    return etiqueta === 'nombre'
      ? 'El nombre no puede contener números'
      : 'Los apellidos no pueden contener números'
  }
  if (!NOMBRE_REGEX.test(trimmed)) {
    return etiqueta === 'nombre'
      ? 'Ingresa un nombre válido (solo letras)'
      : 'Ingresa apellidos válidos (solo letras)'
  }
  return ''
}

export const validateNombre = (value: string): string =>
  validateNombrePersona(value, 'nombre', FIELD_LIMITS.nombre)

export const validateApellidos = (value: string): string =>
  validateNombrePersona(value, 'apellidos', FIELD_LIMITS.apellidos)

export const validateDocumento = (value: string): string => {
  if (!value.trim()) return 'El documento es obligatorio'
  if (!/^\d+$/.test(value)) return 'Solo números'
  if (
    value.length < FIELD_LIMITS.documento.min ||
    value.length > FIELD_LIMITS.documento.max
  ) {
    return `Debe tener ${FIELD_LIMITS.documento.min} u ${FIELD_LIMITS.documento.max} dígitos`
  }
  return ''
}

export const validateEmail = (value: string): string => {
  const trimmed = value.trim()

  if (!trimmed) return 'El correo es obligatorio'

  if (trimmed.length > FIELD_LIMITS.email.max) {
    return `Máximo ${FIELD_LIMITS.email.max} caracteres`
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(trimmed)) {
    return 'Formato de correo inválido'
  }

  return ''
}

export const validateRol = (value: string): string => {
  const trimmed = value.trim()
  if (!trimmed) return 'Debes seleccionar un rol'
  if (trimmed.length > FIELD_LIMITS.rol.max) {
    return `Máximo ${FIELD_LIMITS.rol.max} caracteres`
  }
  return ''
}

export const validateForm = (form: RegisterUserFormState): FormErrors => {
  const errors: FormErrors = {}

  const nombreError = validateNombre(form.nombre)
  if (nombreError) errors.nombre = nombreError

  const apellidosError = validateApellidos(form.apellidos)
  if (apellidosError) errors.apellidos = apellidosError

  const documentoError = validateDocumento(form.documento)
  if (documentoError) errors.documento = documentoError

  const emailError = validateEmail(form.email)
  if (emailError) errors.email = emailError

  const rolError = validateRol(form.rol)
  if (rolError) errors.rol = rolError

  return errors
}

export const hasErrors = (errors: FormErrors): boolean => {
  return Object.keys(errors).length > 0
}