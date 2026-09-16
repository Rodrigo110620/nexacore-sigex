import { Ban, Mail, Pencil } from 'lucide-react'
import RoleBadge from './RoleBadge'
import StatusBadge from './StatusBadge'
import type { UserListItem } from '../../types/user'

interface UserCardProps {
  user: UserListItem
}

function initials(user: UserListItem) {
  return `${user.nombre.charAt(0)}${user.apellidos.charAt(0)}`.toUpperCase()
}

export default function UserCard({ user }: UserCardProps) {
  const fullName = `${user.nombre} ${user.apellidos}`

  return (
    <li>
      <article aria-labelledby={`user-card-${user.id}`} className="rounded-xl border border-[#D8E3F5] bg-white p-4 text-[#011140] shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-[12rem] flex-1 items-start gap-3">
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E9F1FF] text-sm font-bold text-[#0439D9]">
              {initials(user)}
            </span>
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
              disabled
              aria-label={`Editar a ${fullName}, no disponible`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-gray-200 bg-gray-100 p-0 text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Pencil size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled
              aria-label={`Bloquear a ${fullName}, no disponible`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-gray-200 bg-gray-100 p-0 text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Ban size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </article>
    </li>
  )
}