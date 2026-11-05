/** Registro de usuario por pasos (IMP-12): textos que dependen del rol. */

/** Nombre del paso 3 en la barra de pasos, según el rol. */
export function nombrePasoDelRol(rol: string): string {
  if (rol === 'DOCENTE') return 'Materias'
  if (rol === 'ADMIN') return 'Acceso'
  return 'Permisos'
}

/** Texto del botón final, según el rol. */
export function textoRegistrar(rol: string): string {
  if (rol === 'DOCENTE') return 'Registrar docente'
  if (rol === 'ADMIN') return 'Registrar administrador'
  if (rol === 'CONTROL') return 'Registrar control'
  return 'Registrar usuario'
}
