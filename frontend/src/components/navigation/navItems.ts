import { BookCheck, GraduationCap, LayoutGrid, Users, type LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  disabled?: boolean
}

const EXAM_ROLES = ['ADMIN', 'DOCENTE', 'CONTROL']

/**
 * Menú por rol (sidebar y barra inferior móvil):
 * - ADMIN: Inicio, Exámenes, Estudiantes, Usuarios
 * - DOCENTE: Inicio, Exámenes (solo los asignados, sin registrar/editar)
 * - CONTROL: Inicio, Exámenes (lectura para el control de ingreso)
 */
export function navItemsFor(roles: string[]): NavItem[] {
  const isAdmin = roles.includes('ADMIN')
  const items: NavItem[] = [
    { label: 'Inicio', to: '/dashboard/inicio', icon: LayoutGrid, disabled: true },
  ]
  if (roles.some((rol) => EXAM_ROLES.includes(rol))) {
    items.push({ label: 'Exámenes', to: '/dashboard/examenes', icon: BookCheck })
  }
  if (isAdmin) {
    items.push(
      { label: 'Estudiantes', to: '/dashboard/estudiantes', icon: GraduationCap, disabled: true },
      { label: 'Usuarios', to: '/dashboard/usuarios', icon: Users },
    )
  }
  return items
}
