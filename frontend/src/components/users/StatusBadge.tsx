import type { UserStatus } from '../../types/user'

interface StatusBadgeProps {
  status: UserStatus
  /** Bloqueo temporal por intentos fallidos: se muestra aunque la cuenta siga activa. */
  bloqueado?: boolean
}

export default function StatusBadge({ status, bloqueado = false }: StatusBadgeProps) {
  if (bloqueado) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-2.5 py-1 text-xs font-semibold text-[#92400E]">
        <span aria-hidden="true" className="inline-flex h-2 w-2 shrink-0 rounded-full bg-[#D97706]" />
        Bloqueado
      </span>
    )
  }

  const isActive = status === 'activo'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        isActive ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FDECEC] text-[#B91C1C]'
      }`}
    >
      <span aria-hidden="true" className="relative inline-flex h-2 w-2 shrink-0">
        {isActive && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-60 motion-reduce:hidden" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            isActive ? 'bg-[#16A34A] motion-safe:animate-pulse' : 'bg-[#B91C1C]'
          }`}
        />
      </span>
      {isActive ? 'Activo' : 'Inactivo'}
    </span>
  )
}
