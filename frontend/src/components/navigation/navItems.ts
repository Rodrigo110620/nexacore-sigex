import { BookCheck, ClipboardCheck, GraduationCap, LayoutGrid, Users, type LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  disabled?: boolean
}

const EXAM_ROLES = ['ADMIN', 'DOCENTE', 'CONTROL']

/**
 * Menú por rol (sidebar y barra inferior móvil):
 * - ADMIN: Inicio, Exámenes, Control, Estudiantes, Usuarios.
 * - DOCENTE: Inicio (módulo en desarrollo) y Exámenes (solo los asignados, sin registrar/editar).
 * - CONTROL: Inicio (resumen operativo) y Control (lista para ejecutar controles).
 */
export function navItemsFor(roles: string[]): NavItem[] {
  const isAdmin = roles.includes('ADMIN')
  const isDocente = roles.includes('DOCENTE')
  const isControl = roles.includes('CONTROL')
  const items: NavItem[] = []
  // CONTROL obtiene el panel operativo; los demás roles ven el aviso de módulo en desarrollo.
  if (isAdmin || isDocente || isControl) {
    items.push({ label: 'Inicio', to: '/dashboard/inicio', icon: LayoutGrid })
  }
  if (roles.some((rol) => EXAM_ROLES.includes(rol)) && !(isControl && !isAdmin)) {
    items.push({
      label: 'Exámenes',
      to: '/dashboard/examenes',
      icon: BookCheck,
    })
  }
  if (isAdmin || isDocente || isControl) {
    items.push({ label: 'Control', to: '/dashboard/control', icon: ClipboardCheck })
  }
  if (isAdmin) {
    items.push(
      { label: 'Estudiantes', to: '/dashboard/estudiantes', icon: GraduationCap },
      { label: 'Usuarios', to: '/dashboard/usuarios', icon: Users },
    )
  }
  return items
}
