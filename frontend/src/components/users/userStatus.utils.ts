import type { UserListItem } from '../../types/user'

/** El backend solo envía bloqueadoHasta mientras el bloqueo por intentos fallidos sigue vigente. */
export function estaBloqueado(user: UserListItem): boolean {
  return Boolean(user.bloqueadoHasta)
}

/** Bloquear aplica a cuentas activas sin bloqueo; si está inactiva o bloqueada, la acción es desbloquear. */
export function puedeBloquear(user: UserListItem): boolean {
  return user.estado === 'activo' && !estaBloqueado(user)
}
