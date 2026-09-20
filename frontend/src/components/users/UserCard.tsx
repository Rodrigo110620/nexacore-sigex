import { Ban, Mail, MoreHorizontal, Pencil } from 'lucide-react'
import RoleBadge from './RoleBadge'
import StatusBadge from './StatusBadge'
import UserAvatar from './UserAvatar'
import type { UserListItem } from '../../types/user'

interface UserCardProps {
  user: UserListItem
  onEditClick?: (user: UserListItem) => void
}

export default function UserCard({ user, onEditClick }: UserCardProps) {
  const fullName = `${user.nombre} ${user.apellidos}`
  const canEdit = Boolean(onEditClick)

  return (
    <li>
      <article aria-labelledby={`user-card-${user.id}`} className="rounded-xl border border-[#D8E3F5] bg-white p-3 text-[#011140] shadow-sm sm:p-4">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-3">
            <UserAvatar user={user} size="card" />
            <div className="min-w-0">
              <h3 id={`user-card-${user.id}`} className="break-words text-sm font-semibold leading-snug sm:text-base">{fullName}</h3>
              <p className="mt-0.5 text-[11px] text-gray-500 sm:mt-1 sm:text-xs">ID: {user.id}</p>
            </div>
          </div>
          <div className="ml-auto shrink-0">
            <StatusBadge status={user.estado} />
          </div>
        </div>

        <div className="mt-2 flex min-w-0 items-start gap-2 text-xs text-gray-600 sm:mt-4 sm:text-sm">
          <Mail size={15} aria-hidden="true" className="shrink-0" />
          <span className="min-w-0 break-all">{user.email}</span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#E7EDF7] pt-2 sm:mt-4 sm:pt-4">
          <RoleBadge role={user.rol} />
          <div className="flex gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => onEditClick?.(user)}
              disabled={!canEdit}
              aria-label={canEdit ? `Editar a ${fullName}` : `Editar a ${fullName}, no disponible`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[#3D70C9] hover:bg-[#F1F6FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-80 sm:h-11 sm:w-11 sm:border sm:border-[#D6E4FF] sm:bg-[#F1F6FF]"
            >
              <Pencil size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled
              aria-label={`Bloquear a ${fullName}, no disponible`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[#159570] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-80 sm:h-11 sm:w-11 sm:border sm:border-[#BFE8D8] sm:bg-[#ECFDF5]"
            >
              <Ban size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled
              aria-label={`Más acciones para ${fullName}, no disponible`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[#627A9B] disabled:cursor-not-allowed sm:hidden"
            >
              <MoreHorizontal size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </article>
    </li>
  )
}
