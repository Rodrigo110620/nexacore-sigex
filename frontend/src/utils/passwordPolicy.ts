export const PASSWORD_REQUIREMENTS =
  'Mínimo 8 caracteres; incluye mayúscula, minúscula, número y símbolo.'

/** Política de contraseñas nuevas, compartida por perfil y restablecimiento. */
export function validateNewPassword(value: string): string {
  if (!value.trim()) return 'La nueva contraseña es obligatoria'
  if ([...value].length < 8) return 'Mínimo 8 caracteres'
  if (new TextEncoder().encode(value).length > 72) return 'La contraseña es demasiado larga'
  if (!/\p{Lu}/u.test(value)) return 'Incluye al menos una mayúscula'
  if (!/\p{Ll}/u.test(value)) return 'Incluye al menos una minúscula'
  if (!/\p{Nd}/u.test(value)) return 'Incluye al menos un número'
  if (!/[\p{P}\p{S}]/u.test(value)) return 'Incluye al menos un símbolo'
  return ''
}

/**
 * Cuenta de estudiante: igual que en el backend, la contraseña no puede contener su código SIS ni
 * su nombre (el CI también lo controla el backend; en el portal solo se conoce enmascarado).
 */
export function usaDatosDelEstudiante(password: string, codigoSis: string, nombre: string): boolean {
  const clave = password.toLowerCase()
  if (codigoSis && clave.includes(codigoSis)) return true
  return nombre.toLowerCase().split(/\s+/).some((palabra) => palabra.length >= 3 && clave.includes(palabra))
}
