import { Ban, Mail, Pencil } from 'lucide-react'
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
      <article aria-labelledby={`user-card-${user.id}`} className="rounded-xl border border-[#D8E3F5] bg-white p-4 text-[#011140] shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <UserAvatar user={user} size="card" />
            <div className="min-w-0">
              <h3 id={`user-card-${user.id}`} className="break-words text-base font-semibold leading-snug">{fullName}</h3>
              <p className="mt-1 text-xs text-gray-500">ID: {user.id}</p>
            </div>
          </div>
          <div className="ml-auto shrink-0">
            <StatusBadge status={user.estado} />
          </div>
        </div>

        <div className="mt-4 flex min-w-0 items-start gap-2 text-sm text-gray-600">
          <Mail size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">{user.email}</span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E7EDF7] pt-4">
          <RoleBadge role={user.rol} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onEditClick?.(user)}
              disabled={!canEdit}
              aria-label={canEdit ? `Editar a ${fullName}` : `Editar a ${fullName}, no disponible`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[#D6E4FF] bg-[#F1F6FF] p-0 text-[#3D70C9] hover:bg-[#D6E4FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-80"
            >
              <Pencil size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled
              aria-label={`Bloquear a ${fullName}, no disponible`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[#BFE8D8] bg-[#ECFDF5] p-0 text-[#159570] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-80"
            >
              <Ban size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </article>
    </li>
  )
}
