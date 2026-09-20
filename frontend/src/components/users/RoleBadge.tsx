import type { UserRole } from '../../types/user'

const roleStyles: Record<UserRole, string> = {
  ADMIN: 'bg-[#E1ECFF] text-[#0439D9]',
  DOCENTE: 'bg-[#DDF8F4] text-[#075E59]',
  CONTROL: 'bg-[#FFF3D6] text-[#7A4B00]',
  SIN_ROL: 'bg-gray-100 text-gray-600',
}

interface RoleBadgeProps {
  role: UserRole
}

export default function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${roleStyles[role]}`}>
      {role === 'SIN_ROL' ? 'SIN ROL' : role}
    </span>
  )
}