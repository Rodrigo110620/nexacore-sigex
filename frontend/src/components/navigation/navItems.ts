import { BarChart3, BookCheck, ClipboardCheck, GraduationCap, LayoutGrid, Settings, Users, type LucideIcon } from 'lucide-react'
import { tienePermiso } from '../../utils/permisos'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  disabled?: boolean
  /** Solo en el menú lateral; en el celular va en el menú del usuario (la barra inferior no da para más). */
  soloEscritorio?: boolean
}

/**
 * Menú según los permisos del usuario (sidebar y barra inferior móvil). Con los roles del sistema:
 * - ADMIN: Inicio, Exámenes, Control, Reportes, Estudiantes, Usuarios y Configuración.
 * - DOCENTE: Inicio, Exámenes, Control y Estudiantes.
 * - CONTROL: Inicio, Control y Estudiantes.
 * Un rol extra (p. ej. AUXILIAR) ve lo que permitan sus permisos.
 */
export function navItemsFor(roles: string[], permisos?: string[] | null): NavItem[] {
  const sesion = { roles, permisos }
  const puede = (...p: Parameters<typeof tienePermiso> extends [unknown, ...infer R] ? R : never) => tienePermiso(sesion, ...p)
  const items: NavItem[] = []
  const esPersonal = puede('EXAMENES_VER_TODOS', 'EXAMENES_VER_PROPIOS', 'CONTROL_INGRESO_TODOS', 'CONTROL_INGRESO_PROPIOS',
    'ESTUDIANTES_VER', 'REPORTES_VER', 'USUARIOS_GESTIONAR')

  if (esPersonal) items.push({ label: 'Inicio', to: '/dashboard/inicio', icon: LayoutGrid })
  // Exámenes: quien los gestiona. Quien también es CONTROL (sin ser ADMIN) los ve desde Control, como antes.
  const esControlSinAdmin = roles.includes('CONTROL') && !roles.includes('ADMIN')
  if (puede('EXAMENES_GESTIONAR_TODOS', 'EXAMENES_GESTIONAR_PROPIOS') && !esControlSinAdmin) {
    items.push({ label: 'Exámenes', to: '/dashboard/examenes', icon: BookCheck })
  }
  if (puede('CONTROL_INGRESO_TODOS', 'CONTROL_INGRESO_PROPIOS')) {
    items.push({ label: 'Control', to: '/dashboard/control', icon: ClipboardCheck })
  }
  if (puede('REPORTES_VER')) items.push({ label: 'Reportes', to: '/dashboard/reportes', icon: BarChart3 })
  if (puede('ESTUDIANTES_VER')) items.push({ label: 'Estudiantes', to: '/dashboard/estudiantes', icon: GraduationCap })
  if (puede('USUARIOS_GESTIONAR')) items.push({ label: 'Usuarios', to: '/dashboard/usuarios', icon: Users })
  if (puede('ROLES_GESTIONAR')) {
    items.push({ label: 'Configuración', to: '/dashboard/configuracion', icon: Settings, soloEscritorio: true })
  }
  return items
}
