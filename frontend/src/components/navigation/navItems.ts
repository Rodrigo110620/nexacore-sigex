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
 * - DOCENTE: Exámenes (solo los asignados, sin registrar/editar).
 * - CONTROL: Inicio (resumen operativo) y Control (lista para ejecutar controles).
 */
export function navItemsFor(roles: string[]): NavItem[] {
  const isAdmin = roles.includes('ADMIN')
  const isControl = roles.includes('CONTROL')
  const items: NavItem[] = []
  // El panel operativo forma parte de la misma aplicación. ADMIN puede supervisarlo
  // y CONTROL lo usa como su pantalla principal; DOCENTE no necesita este acceso.
  if (isAdmin || isControl) {
    items.push({ label: 'Inicio', to: '/dashboard/inicio', icon: LayoutGrid })
  }
  if (roles.some((rol) => EXAM_ROLES.includes(rol)) && !(isControl && !isAdmin)) {
    items.push({
      label: 'Exámenes',
      to: '/dashboard/examenes',
      icon: BookCheck,
    })
  }
  if (isAdmin || isControl) {
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
