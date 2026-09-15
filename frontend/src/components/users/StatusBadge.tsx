import type { UserStatus } from '../../types/user'

interface StatusBadgeProps {
  status: UserStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const isActive = status === 'activo'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isActive ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FDECEC] text-[#B91C1C]'}`}>
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${isActive ? 'bg-[#166534]' : 'bg-[#B91C1C]'}`} />
      {isActive ? 'Activo' : 'Inactivo'}
    </span>
  )
}